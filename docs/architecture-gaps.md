# 架构评估 —— 对照小额 402 生态位

> 评估日期：2026-09-17
> 评估对象：Ledgeroot（engine）+ MandateKey（dashboard）
> 评估基准：`commercialization.md` §零 定义的生态位——**链上稳定币 × agent 小额 402 支付**（百万笔/月量级、单价 $0.001–$0.05）
> 评估方法：**全部源码通读**（`ledgeroot/src/**` 28 个 TS 文件、`mandatekey/app/api/**` 与组件、`contracts/src/LedgerootAnchor.sol`）+ 关键路径逐行复核
> 关联文档：[commercialization.md](./commercialization.md) · [roadmap.md](./roadmap.md) · [threat-landscape.md](./threat-landscape.md)

---

## 摘要

**架构没有做错，是适用范围不对了。**

它是按"**证明一条适中长度的收据链完整**"设计的——正确性优先、单用户、同步、append-only。生态位要的是"**高并发多写入的账本**"。这是两个不同的系统。

按性质分四类，紧急度和修法完全不同：

| 类 | 性质 | 条数 | 处理方法 |
|---|---|---|---|
| **A** | **与规模无关的真 bug** | 2 | ⚠️ **立刻修**，不应等生态位决定 |
| **B** | **被生态位放大成致命的** | 4 | 原型阶段无害，百万笔/月必崩 |
| **C** | **架构张力（未决设计）** | 1 | **先想清楚再写代码**，否则返工 |
| **D** | **链相关**（选择刻意 / 硬编码待改 / 测试网待评估） | 2 | ⚠️ **三件事性质不同，见 §D1** |

> ⚠️ **2026-09-17 修订说明**：初版把"Monad 测试网"整体写成差距。**选了 Monad 是刻意的**（配合 Monad 黑客松，且与该链的高吞吐定位对齐）。真正的技术债只有"链是硬编码的"这一条。详见 §D1。

**核心判断**：缺的是**系统工程的常识部分**（索引、批量、分区、聚合），不是难的部分。密码学、fail-closed 语义、三态验证、链上结算校验——**难的部分已经做完而且做对了**。所以这不是"重写"，是"补一层"。

---

## 一、A 类：与规模无关的真 bug

> ⚠️ **这两条无论生态位怎么定都该修。** 它们不是性能问题，是正确性问题。

### A1. 结算先于收据写入 —— 崩溃窗口会导致重复付款

**这是目前最严重的一条，因为它直接违反产品的核心承诺。**

`src/tools/pay.ts` 的已付路径顺序（逐行核实）：

```ts
const payment = await services.payments.pay(quote);        // :204  ← 钱在这里动了
const segments = buildSegments(...);                       // :206
const receipt = buildReceipt({ ... prevHash });            // :215
record(services, receipt);                                 // :227  ← 收据在这里才落库
return { status: "paid", receiptId: receipt.id, txHash: payment.txHash };
```

而 `services.payments.pay()`（`src/x402/facilitator.ts`）内部是两次串行网络调用：

```ts
const verified = await this.post("/verify", request);
if (verified.isValid !== true) throw ...;
const settled = await this.post("/settle", request);       // ← 结算在这里完成
if (settled.success !== true) throw ...;
```

**所以 204 与 227 之间存在一个窗口：钱已经结算，收据还没写。**

窗口内崩溃的后果：

1. 钱动了，**没有任何记录**
2. 幂等键 `requestId` **只在本地库**（`getReceiptByRequestId` 查的就是那张还没写的表）
3. agent 重试 → 幂等检查查不到 → **再付一次**

**这既丢证据、又丢钱，而且丢的正是产品声称要防的那件事。**

> 📌 **同一个文件里已经有正确做法。** 三条拒绝路径（`:121`、`:144`、`:180`）都是**先 `buildReceipt` 再 `record`**——因为拒绝时没有钱要动。**问题只出在已付路径**：它把"先记账"变成了"先动钱"。
>
> **修法方向**：已付路径也拆成两步——先写一条 `pending` 收据（含 `requestId`），结算成功后再更新为 `paid` + `txHash`。或者用 EIP-3009 的 `nonce` 做上游幂等（`facilitator.ts` 里 `nonce` 已经是随机生成的，可以持久化）。**无论选哪种，`requestId` 必须在动钱之前落库。**

### A2. `seq` 用 `SELECT MAX(seq)+1` 分配 —— 跨进程会撞号

`src/store/db.ts` 的 `appendReceipt`：

```sql
INSERT OR IGNORE INTO receipts
  (seq, id, prev_hash, ...)
VALUES
  ((SELECT COALESCE(MAX(seq), 0) + 1 FROM receipts), @id, ...)
```

两个问题叠在一起：

1. **`better-sqlite3` 在单进程内串行化这个读-写**，但**两个进程并发时会读到同一个 `MAX(seq)`** → 产生重复 `seq`
2. **`INSERT OR IGNORE` 按 `id` 去重（`id TEXT PRIMARY KEY`），不按 `seq`** —— `seq` 上**没有唯一约束**，所以撞号**不会被挡住**

后果链条：重复 `seq` → `listReceipts` 按 `seq` 排序结果不稳定 → `verifyReceiptChain` 的 `prevHash !== receipts[index-1].receiptHash` 判定失败 → **报 `tampered`**。

**这就是刚修掉的 D8 问题的另一个入口。** D8 修好了"同毫秒按内容哈希排序"，但没有消除"`seq` 本身可能重复"。

> **修法**：`seq` 交给 SQLite 自己产生（`INTEGER PRIMARY KEY AUTOINCREMENT`，或直接用 `rowid`），不要应用层算。叠加 `UNIQUE` 约束做兜底。

---

## 二、B 类：被生态位放大成致命的

### B1. 零索引 + 每笔支付 4 次全表扫描

**全库没有一个 `CREATE INDEX`。** 唯一存在的索引是 `PRIMARY KEY` 隐含的那三个（`receipts.id`、`mandates.id`、`anchors.epoch`）。

而热路径上每一次 `ledgeroot_pay` 都要跑这些**未索引**的查询：

| 步骤 | 查询 | 位置 | 代价 |
|---|---|---|---|
| 1. 幂等检查 | `WHERE request_id = ? ORDER BY seq ASC LIMIT 1` | `pay.ts` / `db.ts` | 全表扫 |
| 2. 取 `prevHash` | `ORDER BY seq DESC LIMIT 1` | `pay.ts` / `db.ts` | 全表扫 + 排序 |
| 3. 累计消费 | `WHERE mandate_id = ? AND status = 'paid'` | `pay.ts` `cumulativeSpent()` | 全表扫 **+ `JSON.parse` 每一条** |
| 4. 端点限速 | `WHERE endpoint = ?` | `pay.ts` `callTimestamps()` | 全表扫 **+ `JSON.parse` 每一条** |

**单笔 O(n)，一个月累计 O(n²)。** 100 万条收据时，每笔支付要反序列化上百万个对象。

`listReceipts()` 没有 `LIMIT`、没有分页，而且**每条收据被存了两遍**（shredded 列 + 完整的 `receipt_json` blob）。

> **这不是"慢一点"，是跑不起来。** 是生态位的直接杀手。

### B2. `verify` 每次全量重走，`--check-chain` 无并发上限

`verifyReceiptChain`（`src/verify/verifier.ts`）遍历**每一条**收据，逐条重算 canonical hash 并做 Ed25519 验签：

```ts
receipts.forEach((receipt, index) => {
  issues.push(
    ...verifyReceiptSelf(receipt),        // SHA-256 per receipt
    ...verifySettlement(receipt),
    ...verifyAttribution(receipt, keys),  // Ed25519 verify per receipt
  );
```

**没有增量、没有检查点、没有"上次验到第几条"。** 调用方还会先把整张表拉进内存：`const receipts = services.store.listReceipts();`

100 万条 = **100 万次 Ed25519 验签 / 每次运行**。

`verify --check-chain`（`src/verify/onchain.ts`）更糟——**每笔已付收据 2 次 RPC，且用无上限的 `Promise.all`**：

```ts
const results = await Promise.all(paid.map((receipt) => checkSettlement(receipt, read)));
```

100 万笔 = 200 万次 RPC 同时发出。**会打爆节点并撑爆内存。**

> ⚠️ 这一条在生态位里格外要紧：**产品就是"账"，而账的可信度依赖"能验证"。如果验证一次要跑几小时，产品不成立。** 见 §五 关于它与完整性证明的关系。

### B3. 无批量写入 / 无保留策略 / 单写进程

| 缺失 | 现状 | 在生态位下的后果 |
|---|---|---|
| **批量插入** | 一笔一次自动提交 + fsync（`appendReceipt` 单行 INSERT） | 每笔支付的写放大固定成本 |
| **保留 / 归档 / 分区** | 完全没有 `DELETE`、`VACUUM`、按时间淘汰 | 无界增长；10M 条约 10–15 GB（估算），而每次 `verify`/`export`/`listReceipts` 都会把它整个 `JSON.parse` 一遍 |
| **并发写** | 单进程、`better-sqlite3` **同步**（每条语句阻塞 event loop）；无连接池、无队列、无锁、无 `busy_timeout` | 舰队形态下没有机制让多个 agent 并发写 |
| **连接管理** | MandateKey 每个 API 路由**每次请求新建一个 `LedgerootStore`**，可能各自跑一次全表 `listReceipts()` | N 个并发请求 = N 个连接 × 全表加载 |

> **已经做对的**：`journal_mode = WAL` 已开启（`db.ts` 唯一的 PRAGMA）。WAL 允许并发读，但写仍然在文件级串行。

### B4. 单租户：一个库、一个签名密钥、一个付款密钥

**数据模型里没有租户/组织/舰队字段。** `receipts` 有 `agent_id` 和 `mandate_id`，但它们**不是租户边界**——没有作用域键，也没有隔离。`listMandates()` / `listReceipts()` 返回全局集合。

**MandateKey 六个路由全都是同一个模式**：

```ts
const store = new LedgerootStore({ path: process.env.LEDGEROOT_DB ?? "ledgeroot.sqlite" });
```

**一个路径 = 一个部署。** 存储层没有"舰队 A vs 舰队 B"的概念。

安全后果：**任何能读到这个库或导出包的人，都会看到全部 fleet 的原始收据与 intent 文本**。而且只有一个 `LEDGEROOT_SIGNING_KEY` 给所有收据签名、一个 `LEDGEROOT_PRIVATE_KEY` 给所有支付付款。

> 📌 **这一条是刻意的**——`commercialization.md` §五 留缝 2 与 §六 都写了"现在硬编码单用户单库，后面要重写"、"不要为了企业感加多租户"。**本评估不推翻该决定，只是标出它的代价**：舰队形态在存储层没有基础。

---

## 三、C 类：架构张力（未决设计，不是 bug）

### C1. 零外泄 vs 聚合 —— 这两件事在架构上冲突

**这是最需要先想清楚的一条，因为它决定控制面的数据模型。**

- **生态位的产品是"账"**：跨 agent、跨对手方、跨时间的**聚合**（`commercialization.md` §三 对账与聚合层、§四）
- **架构是"每个 agent 本地一个 SQLite"**：`db.ts` 注释明写 *"Runs entirely client-side; there is no server."*
- **跨 fleet 的聚合需要把 N 个 agent 的收据汇到一处——而"一处"就是服务器**

而你们的设计原则写的是**"控制面只看元数据"**。

**这两者可以调和，但文档里没有写这个设计。** 三条路：

| 方案 | 做法 | 评价 |
|---|---|---|
| **① 元数据集中** | 只上报元数据（对手方、金额、时间戳、状态），原始收据留在本地；聚合层基于元数据算 | 符合现有设计原则；但**聚合的可信度取决于上报的元数据**，需要与本地收据建立可验证的链接 |
| **② 收据复制到控制面** | 收据全量上报 | ❌ **直接杀死支柱 3**，不可取 |
| **③ 每 agent 自算 rollup + 锚定链接** | agent 自己算本地 rollup 并连同锚定一起发布；fleet 级 rollup = 各 agent rollup 的合并 | ✅ 最符合零外泄；**但要求聚合层能验证"这个 agent 的 rollup 是完整的"** |

> ⭐ **方案 ③ 揭示了一件事**：**完整性证明（非省略）正是让分布式聚合可信的那个机制。**
>
> 如果每个 agent 锚定的是 `(receiptCount, root)`，控制面不需要看到任何收据，就能验证"这个 agent 报的聚合数字**没有漏**"。**没有完整性证明，方案 ① 和 ③ 都只是"相信 agent 上报的数字"。**
>
> **这把 `roadmap.md` 的 N6（held-set completeness）从"对标 Vaara 的工程差距"变成了"我们自己的聚合架构的承重墙"。** 它是同一件事的两种理由，而后一个理由是我们自己的、不依赖对手的。

---

## 四、D 类：生态位硬约束

### D1. 链：选择是刻意的，硬编码是真问题

> ⚠️ **2026-09-17 修订：本节原先把"Monad 测试网"整体写成差距。这是错的——那里混了三件性质不同的事。**

| # | 事实 | 性质 | 该不该改 |
|---|---|---|---|
| **D1a** | **选了 Monad** | ✅ **刻意的**——配合 Monad 黑客松；且与生态位对齐（见下） | ❌ 不改 |
| **D1b** | **链是硬编码的** | ⚠️ 真问题，但**不是"选错了"，是"换不了"** | ✅ 该改，成本低 |
| **D1c** | **测试网锚定不产生证据价值** | ⚠️ 真的——但黑客松期间本来就不需要 | ⏸ 黑客松后再评估 |

#### D1a. 为什么选 Monad 不是凑数

Monad 的定位是高吞吐 + 低费用（并行执行、EVM 兼容）。而 **agent 小额支付正是唯一真正需要这个吞吐量的工作负载**——每秒数百笔 $0.005 的支付，在吞吐和费率不够的链上光 gas 就不可行。

**所以这条链和 `commercialization.md` §零 的生态位本来就对齐**，不是"为了黑客松随便挑一条"。这一点在文档里之前没写出来，而它比"我们暂时在测试网"有力得多。

#### D1b. 硬编码——这才是要改的

`src/x402/facilitator.ts` 里全是常量，不是配置：

```ts
export const MONAD_TESTNET_X402: FacilitatorNetworkConfig = {
  chainId: 10143,
  network: "eip155:10143",
  scheme: "exact",
  usdcAddress: "0x534b2f3A21130d7a60830c2Df862319e593943A3",
  ...
};
export const MONAD_FACILITATOR_URL = "https://x402-facilitator.molandak.org";
```

`onchain.ts` 的 `USDC_BY_CHAIN` 只有一个条目。**没有环境变量能切换链或 USDC 合约。**

> 📌 **可复用的部分**：`FacilitatorNetworkConfig` 已经把 `chainId` / `network` / `scheme` / `usdcAddress` / domain 全抽出来了——**类型是对的，只是实例只有一个**。所以"支持多链"**不是重构，是补几个实例 + 一个选择逻辑**。改动会触及 `bootstrap.ts`、`chains.ts`、`onchain.ts` 与 facilitator 层，但都是加分支，不是改结构。
>
> ⚠️ **注意这与"选错链"是两回事**：即使永远只用 Monad，硬编码也让**测试网 → 主网**这一步变成改代码而不是改配置——而那一步迟早要走。

#### D1c. 测试网锚定的证据价值

测试网的区块时间**不是外部权威**，所以它此刻不产生任何真实的"存在性证明"价值。**这一点与前面的选择无关，是测试网的固有性质。**

> ⏸ **黑客松期间不需要解决**——评委看的是 loop 是否完整，不是锚定是否具备法律效力。
>
> ⏭ **黑客松之后的动作**：Monad 主网（eip155:143，`facilitator.ts` 注释里已标出），或按 `roadmap.md` §2.4 **N8** 补 RFC 3161 那一档。**见 D1a 的时间源三方对比**——链上锚定（外部时钟，无法律效力）与 eIDAS 合格 TSA（有法律效力，按次付费）可以并存，不互斥。

### D2. 每笔两次串行网络往返，默认超时 30 秒

`facilitator.pay()` 是 `await /verify` → `await /settle`，两次串行。**这是 x402 协议固有的，不是设计缺陷。**

但默认超时是 **30 秒**（`timeoutMs ?? 30_000`）。**对一笔 $0.005 的支付，30 秒的超时意味着一个卡死的 agent。**

> **修法**：超时应该随金额缩放，或者默认值大幅下调（$0.005 的支付，2–5 秒足够）。**注意：这台机器上的本地策略判定是毫秒级的（`README` 说的"毫秒级"指的是策略层），网络往返不在那个数量级里——对外表述要分清。**

---

## 五、已经做对的，不要动

| 项 | 为什么重要 |
|---|---|
| **`journal_mode = WAL`** | 唯一的 PRAGMA，但选对了 |
| **`decimal.ts` 用 bigint 做 6 位小数的整数运算** | ⭐ **钱必须这样**，无浮点误差——这一条是账本产品的地基 |
| **RFC 8785 规范化 + SHA-256** | 跨语言可复现，第三方能独立重算 |
| **Ed25519 detached 签名** | 可归因、可离线验签；`alg`/`kid` 落在被签字节内 |
| **RFC 6962 Merkle（含域分隔）** | 与 Certificate Transparency 同构，是业界正确做法 |
| **append-only 哈希链 + epoch 锚定** | 设计正确，第三方可离线验证前缀 |
| **幂等键概念（`requestId`）** | 思路对——问题只在 A1 的落库时机与 B1 的索引 |
| **策略引擎是纯函数且便宜** | 五条策略、无 I/O、无网络 |
| **热路径上没有 RPC** | RPC 只在 `--check-chain` 与锚定时出现；**每笔支付的 RPC 成本是 0** |

---

## 六、结论与建议顺序

### 6.1 建议的修复顺序

| 序 | 项 | 理由 |
|---|---|---|
| **0** | **A1（收据先于结算）** ⚠️ **黑客松之前** | **丢钱 + 丢证据**。平时无害，但**现场演示会连续快速跑很多笔，正好放大这个窗口**——demo 中途崩一次就是"钱扣了没收据"。**这是黑客松前唯一建议修的一条** |
| **1** | A2（`seq` 分配） | ⚠️ 数据完整性；会伪装成 `tampered` 误报，侵蚀"三态验证"的可信度 |
| **2** | D1b（链改配置化） | 成本低（类型已就绪）；让**测试网 → 主网**变成改配置而不是改代码 |
| **3** | C1 的设计决定 | 它决定控制面 schema。**先决定再写代码，否则返工** |
| 4 | B1（索引）+ B3（批量/保留） | 没有它们，百万笔/月跑不起来 |
| 5 | D1c（主网 / 或补 RFC 3161） | 测试网锚定不产生证据价值。**黑客松后再做** |
| 6 | B2（增量验证）+ D2（超时） | ⭐ B2 与 N6 是同一条：**验证能力就是聚合能力的上限** |
| 7 | B4（多租户） | 舰队形态的前提，但可以晚于能跑通单 agent |

> 📌 **黑客松改变了上面这个排序**：现在该优化的是"**评委能不能看懂这是一个完整的 loop**"，不是装机量，也不是百万笔性能。所以 B 类整组（规模问题）都可以排在黑客松之后，**而 A1 反而提前到第 0 位**——因为它是唯一会在现场现形的。

### 6.2 一个总体判断

**这不是"架构错了要重写"，是"架构的适用范围要扩"。**

难的部分——密码学、fail-closed 语义、三态纪律、链上结算校验、离线可验证性——**已经做完了**。缺的是索引、批量、分区、聚合、多写、多租户，这些是**有成熟做法的系统工程**，不是研究问题。

**但有一条是真的要重做**：`store/db.ts` 的数据访问层要为高并发读写与聚合重新设计（`seq` 分配、索引、分页、批量、租户作用域）。这一个文件是核心，其余多是加配置与加层。

> 📌 **与竞品的对照**：Vaara 在 5 个月内发了 50 套一致性套件、SLSA L3、TPM 绑定——**但它的起步形态是"一个代理 + 一个本地 trail"**，与 Ledgeroot 同量级。**它的领先是节奏，不是架构代差。** 见 [vaara-competitive-analysis.md](./vaara-competitive-analysis.md) §6.3。

---

## 附录：单笔 `ledgeroot_pay` 的完整代价

| # | 步骤 | 位置 | 本地/网络 | 代价 |
|---|---|---|---|---|
| 1 | 幂等检查 `getReceiptByRequestId` | `pay.ts` | 本地 | **全表扫**（`request_id` 未索引） |
| 2 | 取 `prevHash`（`lastReceipt`） | `pay.ts` | 本地 | **全表扫 + 排序** |
| 3 | `getMandate` | `db.ts` | 本地 | PK 查找 ✅ |
| 4 | `cumulativeSpent` | `pay.ts` | 本地 | **全表扫 + `JSON.parse` 全部已付收据** |
| 5 | `callTimestamps` | `pay.ts` | 本地 | **全表扫 + `JSON.parse` 全部同端点收据** |
| 6 | `computePolicyIntersection` + 五条策略 | `mandate.ts` / `policy/engine.ts` | 本地 | 纯 JS，便宜 ✅ |
| 7 | **`payments.pay(quote)`** | `x402/facilitator.ts` | **网络** | ⚠️ **`/verify` + `/settle` 两次串行往返**，默认超时 30s |
| 8 | `buildReceipt` → `canonicalHash` | `receipt/builder.ts` | 本地 | 1 × SHA-256 ✅ |
| 9 | `record` → `signReceipt` → `appendReceipt` | `pay.ts` | 本地 | Ed25519 签名 + 1 次 INSERT（含 `MAX(seq)` 全表扫） |

**每笔支付的账**：4 次全表扫（2 次带全量 `JSON.parse`）+ 1 次 `MAX(seq)` 扫 + 1 次 SHA-256 + 1 次 Ed25519 + 1 次 secp256k1 签名 + 2 次串行网络往返 + 1 次 fsync。

**其中只有第 7 步是协议固有的，其余都是可以修掉的。**

---

## 来源

- 本仓库源码：`ledgeroot/src/store/db.ts` · `src/tools/pay.ts` · `src/x402/facilitator.ts` · `src/verify/verifier.ts` · `src/verify/onchain.ts` · `src/receipt/{builder,signing,hashchain}.ts` · `src/consistency.ts` · `src/tools/receipts.ts` · `mandatekey/app/api/**` · `mandatekey/components/**` · `contracts/src/LedgerootAnchor.sol`
- 生态位定义：[commercialization.md](./commercialization.md) §零
- 工程优先级：[roadmap.md](./roadmap.md) §四 §五
- 竞品对照：[vaara-competitive-analysis.md](./vaara-competitive-analysis.md)
