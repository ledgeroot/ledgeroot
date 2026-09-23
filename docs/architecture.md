# 架构评估

> 定位：对当前源码的工程评估——已做对的、规模层面的债、架构张力、链配置与协议接缝
> 状态：2026-09-23（对照 `v0.8.0` 源码复核）
> 关联：[roadmap.md](./roadmap.md)（计划） · [commercialization.md](./commercialization.md)（生态位） · [standards.md](./standards.md)（协议层） · [competitors.md](./competitors.md)
> 评估方法：源码通读（`ledgeroot/src/**`、`mandatekey/app/api/**` 与组件、`contracts/src/LedgerootAnchor.sol`）+ 关键路径逐行复核

**核心判断：架构没有做错，是适用范围不对了。**

它按"**证明一条适中长度的收据链完整**"设计——正确性优先、单用户、同步、append-only。生态位要的是"**高并发多写入的账本**"。这是两个不同的系统。

| 类 | 性质 | 状态 |
|---|---|---|
| **正确性** | 与规模无关的真 bug | ✅ **已全部清零**（D1–D8 + A1/A2，见 `roadmap.md` §四） |
| **规模** | 被生态位放大成致命的 | ⏳ 待做：索引、批量、分区、聚合、多写、多租户 |
| **张力** | 未决设计（零外泄 vs 聚合） | 🔴 先想清楚再写代码（Q7） |
| **链 / 协议** | 硬编码待改 / 接缝已留 | ⚠️ 见 §四 §六 |

> **缺的是系统工程的常识部分**（索引、批量、分区、聚合），不是难的部分。密码学、fail-closed 语义、三态验证、链上结算校验——**难的部分已经做完而且做对了**。这不是"重写"，是"补一层"。

---

## 一、已建成的正确性基础（不再改动）

以下是与规模无关的正确性工作，均已落地并有测试覆盖：

| 项 | 结论 |
|---|---|
| **收据先于结算写入** | 链外 `payment_intents` 表在**动钱之前**用 `requestId` 占位；占位失败（上一次结果未记录）**拒付并记 denied 收据**；成功后释放。**为什么不能"先写 pending 收据再改 paid"**：`id` 是内容的规范哈希，改 `status` 就改哈希，下一张的 `prevHash` 会指向不存在的哈希——链是 append-only 的，预写记录只能在链外。 |
| **`seq` 由 SQLite 分配** | `seq` 是 rowid 别名（`INTEGER PRIMARY KEY AUTOINCREMENT`），`id` 降为 `NOT NULL UNIQUE`。原 `SELECT MAX(seq)+1` 每次插入**扫全表**（5k→84 µs，50k→**5,576 µs**，10 倍数据 66 倍成本）；改后**基本平坦**（41→53 µs）。 |
| **Merkle 为 RFC 6962 MTH** | 叶子 `SHA-256(0x00‖d)`、内部节点 `SHA-256(0x01‖L‖R)`、按最大 2 的幂切分、**字节运算**，含域分隔。 |
| **收据 Ed25519 签名** | 签的是 `receiptHash`（哈希链、epoch 根、签名三者提交同一值）；`alg`/`kid` 落在被签字节内；`kid` 为 RFC 7638 指纹。签名密钥 `LEDGEROOT_SIGNING_KEY` **刻意不回落**到支付密钥。 |
| **三态纪律** | `Issue = { kind: "tampered" \| "incomplete" }`，`tampered` 优先。 |
| **锚定后不误报** | `anchors.receipt_count` 记录 epoch 边界，`verifyAnchor` 按边界切片。 |
| **第六段交付证明** | 由调用方回报 `responseBody` → `contentHash` + `payloadSize`（**只存哈希与字节数，不存原文**）。 |
| **锚定合约权限** | `owner` + `onlyOwner`，owner 取锚定钱包；constructor 拒绝 `address(0)`。 |
| **链上结算内容校验** | 拉 tx、断言调用 USDC、解码 ERC-3009、比对 from/to/value。 |

### 安全加固（2026-09-22 源码复核新增）

| 项 | 结论 |
|---|---|
| **mandate 导入信任锚** | `importMandate` 要求签发者可信（`LEDGEROOT_TRUSTED_ISSUERS`，默认本地签名者，皆空则**拒绝一切导入**）。此前任何一方自签一个宽松授权令即可导入并消费。 |
| **撤销单调** | `upsertMandate` 冲突分支**不再写 `revoked = 0`**——重新导入/重签同一 id 不再解封熔断。 |
| **buy 路径 SSRF** | 默认拒绝 loopback / 私网 / 链路本地 / CGNAT 与 `.internal`/`.local`（`LEDGEROOT_ALLOW_PRIVATE_HOSTS` 可放行），**不跟随重定向**（否则 3xx 会绕过只校验初始 URL 的守卫）。 |
| **buy 白名单前置** | counterparty 白名单在**抓取前**校验，而非只在 402 关口——否则免费/非 402 响应会被任意 host 抓取。 |
| **buy 过期检查** | 与 `pay` 一致，过期授权令在签名边界前被拒。 |
| **金额解析 fail-closed** | 报价 `amount` 无法解析为原子单位即**拒绝签名**，不再归零放行（parser 差异不能变成上限绕过）。 |
| **熔断端点** | `POST /api/mandates/revoke` 加同源校验（Origin / Sec-Fetch-Site）并要求显式 `{mandateId}` 或 `{all:true}`——畸形 body 不再 fallback 成"撤销全部"。 |

---

## 二、规模层面的债（被生态位放大）

### B1. 零索引 + 每笔支付 4 次全表扫描

**全库没有一个 `CREATE INDEX`**（唯一索引是三个 PRIMARY KEY 隐含的）。热路径上每次 `ledgeroot_pay` 都跑这些**未索引**查询：

| 步骤 | 查询 | 位置 | 代价 |
|---|---|---|---|
| 1. 幂等检查 | `WHERE request_id = ? ORDER BY seq ASC LIMIT 1` | `pay.ts` / `db.ts` | 全表扫 |
| 2. 取 `prevHash` | `ORDER BY seq DESC LIMIT 1` | `pay.ts` / `db.ts` | 全表扫 + 排序 |
| 3. 累计消费 | `WHERE mandate_id = ? AND status = 'paid'` | `cumulativeSpent()` | 全表扫 **+ `JSON.parse` 每一条** |
| 4. 端点限速 | `WHERE endpoint = ?` | `callTimestamps()` | 全表扫 **+ `JSON.parse` 每一条** |

**单笔 O(n)，一个月累计 O(n²)。** 100 万条时每笔支付要反序列化上百万个对象。`listReceipts()` 没有 `LIMIT`、没有分页，每条收据还**被存了两遍**（shredded 列 + 完整 `receipt_json`）。**这不是"慢一点"，是跑不起来。**

### B2. `verify` 全量重走，`--check-chain` 无并发上限

`verifyReceiptChain` 遍历**每一条**收据重算 SHA-256 与 Ed25519，**无增量、无检查点**；调用方还会先把整张表拉进内存。100 万条 = **100 万次验签/每次运行**。`verify --check-chain` 更糟：**每笔已付收据 2 次 RPC，`Promise.all` 无上限**——会打爆节点并撑爆内存。

> ⚠️ 这一条在生态位里格外要紧：**产品就是"账"，而账的可信度依赖"能验证"。**

### B3. 无批量写入 / 无保留策略 / 单写进程

| 缺失 | 现状 | 后果 |
|---|---|---|
| **批量插入** | 一笔一次自动提交 + fsync | 每笔支付的写放大固定成本 |
| **保留 / 归档 / 分区** | 完全没有 `DELETE`、`VACUUM`、按时间淘汰 | 无界增长；每次 `verify`/`export`/`listReceipts` 都把它整个 `JSON.parse` 一遍 |
| **并发写** | 单进程、`better-sqlite3` **同步**（每条语句阻塞 event loop）；无连接池/队列/锁/`busy_timeout` | 舰队形态下无法并发写 |
| **连接管理** | MandateKey 每个 API 路由**每次请求新建一个 `LedgerootStore`** | N 个并发请求 = N 个连接 × 全表加载 |

> **已做对**：`journal_mode = WAL`（`db.ts` 唯一的 PRAGMA）。WAL 允许并发读，但写仍文件级串行。

### B4. 单租户：一个库、一个签名密钥、一个付款密钥

**数据模型没有租户/组织/舰队字段**——`agent_id` / `mandate_id` 不是隔离键。MandateKey 六个路由都是同一个模式：一个路径 = 一个部署。**安全后果**：任何能读到这个库或导出包的人，都会看到全部 fleet 的原始收据与 intent 文本。

> 📌 **这一条是刻意的**（`commercialization.md` 明写"现在硬编码单用户单库，不要为了企业感加多租户"）。**本评估不推翻该决定，只标出代价**：舰队形态在存储层没有基础。

---

## 三、架构张力：零外泄 vs 聚合（Q7）

**这是最需要先想清楚的一条，因为它决定控制面的数据模型。**

- 生态位的产品是"账"：跨 agent、跨对手方、跨时间的**聚合**。
- 架构是"每个 agent 本地一个 SQLite"（`db.ts` 注释：*"Runs entirely client-side; there is no server."*）。
- **跨 fleet 聚合需要把 N 个 agent 的数字汇到一处——而"一处"就是服务器**，这与"控制面只看元数据"存在张力。

| 方案 | 做法 | 评价 |
|---|---|---|
| ① 元数据集中 | 只上报元数据，原始收据留在本地 | 符合现有原则；**聚合可信度取决于上报的元数据** |
| ② 收据复制到控制面 | 收据全量上报 | ❌ **直接杀死支柱 3** |
| ③ **每 agent 自算 rollup + 锚定链接** | agent 自算 rollup 并连同锚定发布；fleet 级 = 各 agent rollup 的合并 | ✅ **推荐**——同时保住零外泄与可验证性 |

> ⭐ **方案 ③ 揭示了一件事**：**完整性证明（非省略）正是让分布式聚合可信的那个机制。** 每个 agent 锚定 `(receiptCount, root)`，控制面不必看到任何收据就能验证其聚合数字**没有漏**。
>
> **这把"held-set completeness"从"对标对手的工程差距"变成了"我们自己的聚合架构的承重墙"**——同一件事的两种理由，而后一个是我们自己的、不依赖对手的。

---

## 四、链：选择是刻意的，硬编码是真问题

| # | 事实 | 性质 | 该改吗 |
|---|---|---|---|
| **D1a** | **选了 Monad** | ✅ **刻意的**——配合 Monad 黑客松；且与生态位对齐 | ❌ 不改 |
| **D1b** | **链是硬编码的** | ⚠️ 真问题，但**不是"选错了"，是"换不了"** | ✅ 该改，成本低 |
| **D1c** | **测试网锚定不产生证据价值** | ⚠️ 真的 | ⏸ 赛后处理 |

**D1a 为什么不是凑数**：Monad 定位高吞吐 + 低费用，而 **agent 小额支付正是唯一真正需要那个吞吐量的工作负载**——每秒数百笔 $0.005，在吞吐/费率不够的链上光 gas 就不可行。**它和生态位本来就对齐。**

**D1b 才是要改的**：`src/x402/facilitator.ts` 里全是常量（`MONAD_TESTNET_X402`、`MONAD_FACILITATOR_URL`），`onchain.ts` 的 `USDC_BY_CHAIN` 只有一个条目，**没有环境变量能切换链或 USDC 合约**。

> 📌 **可复用的部分**：`FacilitatorNetworkConfig` 已把 `chainId` / `network` / `scheme` / `usdcAddress` / domain 全抽出来了——**类型对，只是实例只有一个**。所以"支持多链"**不是重构，是补几个实例 + 一个选择逻辑**。
>
> ⚠️ **即使永远只用 Monad**，硬编码也让**测试网 → 主网**变成改代码而不是改配置。

**D1c**：测试网区块时间不是外部权威，此刻不产生真实的"存在性证明"价值。**赛后动作**：Monad 主网（`eip155:143`），或按 roadmap N8 补 RFC 3161 那一档。

**另一处**：`facilitator.pay()` 是 `await /verify` → `await /settle` 两次串行（x402 协议固有），但**默认超时 30 秒**——对 $0.005 的支付，30 秒意味着一个卡死的 agent。**超时应随金额缩放或默认大幅下调。** 注意：本地策略判定是毫秒级的，**网络往返不在那个数量级里，对外表述要分清**。

---

## 五、已经做对的，不要动

| 项 | 为什么重要 |
|---|---|
| **`journal_mode = WAL`** | 唯一的 PRAGMA，但选对了 |
| **`decimal.ts` 用 bigint 做 6 位小数整数运算** | ⭐ **钱必须这样**，无浮点误差——账本产品的地基 |
| **RFC 8785 规范化 + SHA-256** | 跨语言可复现，第三方能独立重算 |
| **Ed25519 detached 签名** | 可归因、可离线验签；`alg`/`kid` 落在被签字节内 |
| **RFC 6962 Merkle（含域分隔）** | 与 Certificate Transparency 同构 |
| **append-only 哈希链 + epoch 锚定** | 第三方可离线验证前缀 |
| **幂等键概念（`requestId`）** | 思路对；语义已修正为"在尝试时消耗" |
| **策略引擎是纯函数且便宜** | 五条策略、无 I/O、无网络 |
| **热路径上没有 RPC** | RPC 只在 `--check-chain` 与锚定时出现 |

---

## 六、已预留的协议接缝

改动前，代码里有一句硬编码前提：**"已付收据必然有一笔链上交易"**（散在 `verifySettlement`、`checkSettlement`、`segments.tx`）。**MPP 从两个方向打破它**：Sessions 把"一笔支付 ↔ 一笔交易"变成 **N:1**；卡轨道**根本没有链**。

**改法是把"必须有钱上交易"换成"必须声明结算协议"，并把未知协议报为 `incomplete` 而不是放行**：

| 文件 | 改动 |
|---|---|
| `types.ts` | `segments.tx` 新增可选 `protocol?`；导出 `SETTLEMENT_PROTOCOL_X402` |
| `verify/verifier.ts` | `verifySettlement` 按协议分派：缺省或 `x402` → 要求 `txHash`；**其他协议 → `incomplete`** |
| `verify/onchain.ts` | 非 x402 → `incomplete`（"这个 reader 只懂 EVM，不是怀疑它"） |
| `tools/pay.ts` | 写入时打上 `protocol: "x402"` |

**为什么"未知协议 → incomplete"是唯一正确的选择**：它可能完整，我们只是查不了。报 `verified` 就是宣称做了一次没做的检查；报 `tampered` 就是冤枉它——这正是三态纪律的延伸。

**故意没做的**：没有实现 MPP，也没有预设其载荷形状（**字段级形状不清，编一个大概率返工**）。接缝已够：现在加 MPP 是**加一个 provider + 一个 verifier**，不是改结构。

> ⚠️ **还有一处协议假设没动**：`X402Quote` 与 `PaymentResult` 仍假定"一次支付产出一个 `txHash` + `chainId`"。这是**下一个要抽象的接缝**（动到公共 API，见 `index.ts`）。

**MPP 的实现路径与 `upto` / 外部授权引用**见 `roadmap.md` P1-8；**它与 epoch 边界语义的碰撞**见 Q9。

---

## 附录：单笔 `ledgeroot_pay` 的完整代价

| # | 步骤 | 位置 | 本地/网络 | 代价 |
|---|---|---|---|---|
| 1 | 幂等检查 | `pay.ts` | 本地 | **全表扫**（`request_id` 未索引） |
| 2 | 取 `prevHash` | `pay.ts` | 本地 | **全表扫 + 排序** |
| 3 | `getMandate` | `db.ts` | 本地 | PK 查找 ✅ |
| 4 | `cumulativeSpent` | `pay.ts` | 本地 | **全表扫 + `JSON.parse` 全部已付收据** |
| 5 | `callTimestamps` | `pay.ts` | 本地 | **全表扫 + `JSON.parse`** |
| 6 | 策略交集 + 五条策略 | `mandate.ts` / `policy/engine.ts` | 本地 | 纯 JS，便宜 ✅ |
| 7 | **`payments.pay(quote)`** | `x402/facilitator.ts` | **网络** | ⚠️ **两次串行往返**，默认超时 30s |
| 8 | `buildReceipt` → `canonicalHash` | `receipt/builder.ts` | 本地 | 1 × SHA-256 ✅ |
| 9 | `record` → `signReceipt` → `appendReceipt` | `pay.ts` | 本地 | Ed25519 + 1 次 INSERT ✅ |

**每笔支付的账**：4 次全表扫（2 次带全量 `JSON.parse`）+ 1 × SHA-256 + 1 × Ed25519 + 1 × secp256k1 签名 + 2 次串行网络往返 + 1 次 fsync。**其中只有第 7 步是协议固有的，其余都可以修掉。**

**当前测试**：`npm test` = **15 文件 / 129 用例**；`typecheck`、`build` 均通过（`v0.8.0`）。

---

## 来源

本仓库源码：`src/store/db.ts` · `src/tools/pay.ts` · `src/tools/buy.ts` · `src/tools/mandate.ts` · `src/env.ts` · `src/x402/{facilitator,buyer}.ts` · `src/verify/{verifier,onchain}.ts` · `src/receipt/{builder,signing,hashchain}.ts` · `src/anchor/{merkle,anchorer}.ts` · `src/consistency.ts` · `src/tools/receipts.ts` · `mandatekey/app/api/**` · `mandatekey/components/**` · `contracts/src/LedgerootAnchor.sol`
