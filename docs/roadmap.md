# Ledgeroot 行动规划

> 制定日期：2026-09-17
> 依据文档：[threat-landscape.md](./threat-landscape.md) · [trustbench-competitive-analysis.md](./trustbench-competitive-analysis.md) · [commercialization.md](./commercialization.md)
> 适用范围：Ledgeroot（engine）+ MandateKey（dashboard）
> 排序原则：**先正确性，再差异化，再可见性，最后公信力** —— 前者是后者的前提
> 商业化定位：**开源内核 + 企业控制面 + 合规交付物**；本期不启动商业化，只做架构留缝

---

## 一、规划依据

三份调研收敛出的结论，是本规划的全部前提：

1. **"签名收据"已商品化**（PEAC、TrustBench、agentstamp、Vaultra、BlueTier、Traceipt）。
2. **"Merkle + 上链锚定 + 离线验证"正在商品化，半衰期 6–12 个月**（Traceipt 已上线，x402 草案已写成标准，IETF 在推）。
3. **"预行动闸门"这个词已被 Black_Wall 占据**，且它已有定价与真实牵引（104 次/周 npm 下载）。
4. **PEAC 是载波不是对手** —— 它明确声明不做 policy engine、不做路由。
5. **Coinbase 是分发层** —— 不被索引等于不存在。
6. **Pieverse（$7M，Animoca + UOB 领投，代币 + 2.4 亿用户分发）用 ERC-6551 提供了链上强制的消费限额** —— 这是对"用户授权"支柱的真实挑战。

**结论**：Ledgeroot 不能靠"我们有锚定收据"取胜。必须把火力集中到**别人结构上做不到、或标准尚未覆盖**的地方。

---

## 二、现状盘点

### 2.1 已建成（可以依赖）

| 模块 | 文件 | 状态 |
|---|---|---|
| 策略引擎（fail-closed，五条策略） | `src/policy/{engine,defaults,schema}.ts` | ✅ 完整 |
| 六段收据构建 + RFC 8785 哈希链 | `src/receipt/{builder,hashchain}.ts` | ✅ 完整 |
| EIP-712 授权令（签发/验签/策略交集） | `src/mandate.ts` | ✅ 完整 |
| 授权-执行一致性分析 | `src/consistency.ts` | ✅ 完整 |
| SQLite append-only 存储 | `src/store/db.ts` | ✅ 完整 |
| 十个 MCP 工具 | `src/tools/{pay,mandate,receipts,registry}.ts` | ✅ 完整 |
| 离线验证器（三态） | `src/verify/verifier.ts` | ⚠️ 见 2.2 |
| Merkle + 锚定器 | `src/anchor/{merkle,anchorer}.ts` | ⚠️ 见 2.2 |
| 锚定合约 | `contracts/src/LedgerootAnchor.sol` | ⚠️ 见 2.2 |
| x402 facilitator 集成 | `src/x402/facilitator.ts` | ⚠️ 见 2.3 |
| CLI（verify / export / anchor / serve） | `src/cli.ts` | ✅ 可用 |
| 测试（9 个 TS + 1 个 Solidity） | `test/`, `contracts/test/` | ✅ 存在 |
| 已发 npm（`ledgeroot@0.1.2`） | `package.json` | ✅ 已发布 |

### 2.2 已确认的正确性缺陷（源码级，P0 处理）

| # | 缺陷 | 位置 | 后果 |
|---|---|---|---|
| D1 | **Merkle 无域分隔**：`sha256Hex(level[i] + right)`，叶与内部节点同构造，且对十六进制字符串而非字节运算 | `src/anchor/merkle.ts` | 结构性第二原像问题；**Traceipt 已用 RFC 6962 做对** |
| D2 | **收据完全无签名** | `src/receipt/builder.ts`、`src/types.ts` | 能证"没被改"，**不能证"谁做的陈述"** |
| D3 | **`incomplete` 是死代码**：`classify()` 只返回 `verified` / `tampered` | `src/verify/verifier.ts` | README 宣称三态，实际两态；"缺 txHash"被误判为"被篡改" |
| D4 | **锚定后误报篡改**：`verify` 用全量收据对比 `latestAnchor().root` | `src/tools/receipts.ts` | 锚定后再发生任何支付 → 重算根不匹配 → 报 `tampered` |
| D5 | **第六段交付凭据是假的**：`segments.delivery = { payloadHash: payment.txHash }` | `src/tools/pay.ts` | 把 txHash 抄进交付证明字段；品牌核心能力目前是占位符 |
| D6 | **锚定合约无权限控制**：`anchor(bytes32)` 任何人可调 | `contracts/src/LedgerootAnchor.sol` | "上链了"只证明"有人锚了这个根"；x402 草案攻击 A4 已把同类问题标为可伪造 |
| D7 | **无链上结算内容校验**：只信任 facilitator 返回的 `txHash` | `src/verify/verifier.ts` | **出错或被攻破的 facilitator 返回伪造 txHash，验证照样报 `verified`** |
| **D8** | **收据排序不确定**：`listReceipts` 按 `created_at ASC, id ASC` 排序，同毫秒时次级排序回退到**内容哈希** `id`，与追加顺序无关 | `src/store/db.ts` | ⚠️ **旗舰的离线验证会间歇性误报 `tampered`**（实测 12 次里 7 次）；且 epoch 根依赖该顺序 → **锚定不可复现** |

### 2.3 未开始

- 独立验证器包（第三方拿到一张收据无法单独验证）
- 任何 discovery surface（`/skill.md`、`/llms.txt`、`/.well-known/`）
- 任何生态提交（Bazaar、Agentic.Market、MCP Registry）
- PEAC 兼容
- 多 facilitator / 多链
- ERC-8004 接入（`Mandate.agentId` 字段已埋，未接注册表）
- 收据规范发布
- 可复现基准

---

## 三、战略收敛：修订后的三根支柱

> ⚠️ **重要修订**：Pieverse 的 ERC-6551 Agent 授权（"从用户既有钱包操作，带可编程消费限额和到期时间"）**已在链上做到用户授权的消费限额**。因此支柱 1 不能再说"无人在做"，必须换口径。

### 支柱 1（修订）：链上表达不了的约束 + 拒绝留痕 + 链无关凭证

承认 ERC-6551 在它覆盖的范围内**强制力更强**（合约层 > 本地校验）。Ledgeroot 守的是它守不住的部分：

| 约束 | 为什么链上难做 | Ledgeroot 现状 |
|---|---|---|
| **报价漂移** | 需要对比 402 报价与实际扣款 | ✅ `quoteDrift` 策略 |
| **对手方白名单（host 维度）** | 链上只知道地址，不知道 host | ✅ `counterpartyWhitelist` |
| **按端点的限速** | 链上无法表达"每端点每窗口调用次数" | ✅ `endpointRateLimit` |
| **拒绝留痕** | 链上不记录"被拦下的尝试" | ✅ 拒绝也生成收据 |
| **链无关凭证** | ERC-6551 绑定 EVM/单链 | ✅ EIP-712 domain 刻意不含 chainId |
| **本地确定性** | 链上要 gas、要出块 | ✅ 毫秒级、零网络 |

### 支柱 2：完整性（非省略证明）

- 哈希链回指 + epoch Merkle 根 → **可证明序列无缺口**
- x402 草案测试 3.2.4 明确承认"遗漏不影响单张签名有效性"→ **省略不可检测**
- Traceipt 亦无此能力
- **这是标准层面的空白，且审计场景里"能证明没漏"比"每张都签名"更硬**
- 当前 README 只写了一行 → **应提升为核心卖点**

### 支柱 3：证据主权

- 本地 SQLite、无服务器、零网络、零外泄
- Coinbase / TrustBench / Black_Wall **结构上做不到**（必须看见流量才能变现）
- Pieverse **方向相反**（TEE 托管钱包 + Facilitator 生成收据 + 存 Greenfield）
- PEAC 做得到但没有强制力

### 词汇纪律（必须遵守）

| ❌ 不要用 | ✅ 改用 | 原因 |
|---|---|---|
| 预行动闸门 / pre-action gate | **用户签名的确定性强制** | 已被 Black_Wall 占据，且有牵引 |
| 收据 / signed receipt（单独用） | **完整性证明 / 非省略证明** | "签名收据"已商品化，单独用等于无差异 |
| 基准 / benchmark | **可复现验证** | TrustBench 因滥用此词被迫重写定位 |
| 合规收据（泛化） | **EU AI Act 第 12 条高风险场景对齐** | 第 12 条只覆盖高风险系统，泛化会被拆穿 |

---

## 四、P0：正确性修复

> **原则**：在 D1–D8 修完之前，**不要做任何分发动作**。带着可被证伪的密码学去争取可见性，是把缺陷放大给全世界看。

### P0-1. Merkle 改为 RFC 6962 构造 ⭐ 最高优先

> ✅ **已完成（2026-09-17）**，采用破坏性升级（Q1 已答）。
> 实现：`src/anchor/merkle.ts` 重写为 RFC 6962 MTH —— 叶子 `SHA-256(0x00 ‖ d)`、内部节点 `SHA-256(0x01 ‖ L ‖ R)`、按最大 2 的幂切分（不再复制奇数末节点）。
> 验证：`test/merkle.test.ts` 用 **RFC 9162 §2.1.2 的栈式算法**作独立预言机交叉验证（0–33 个叶子的每种规模），并直接断言旧构造的结构性歧义已消除（`[a,b,c]` 不再与 `[a,b,c,c]` 同根）。39 个测试全过，typecheck / build 通过。
> ⚠️ **注意**：该改动的意义依赖 D8 修复 —— 叶子顺序不确定时，epoch 根不可复现。

- **为什么**：这是唯一一个**对手已做对、我们做错**的密码学细节。改动最小、收益最明确。
- **做什么**：
  - 叶子：`SHA256(0x00 ‖ leafData)`
  - 内部节点：`SHA256(0x01 ‖ left ‖ right)`
  - 全部按**字节**运算，不再对十六进制字符串拼接
  - 奇数层不再复制末节点（改用 RFC 6962 的 `MTH` 递归或明确的分裂规则）
- **涉及**：`src/anchor/merkle.ts`、`test/merkle.test.ts`
- **验收**：
  - 现有测试全绿
  - 新增针对"叶/节点构造不可互换"的测试用例
  - 与 RFC 6962 官方测试向量比对通过
- **注意**：这是**破坏性变更** —— 旧收据的根会变。因为这会影响历史锚定，需要一次明确的版本决策（见 §十 待定项）。

### P0-2. 收据补签名

- **为什么**：D2 是"证据引擎"最根本的缺口。没有签名，收据只证完整性不证来源。
- **做什么**：
  - 采用与业界一致的封装：JWS 式 `{ protected: { alg: "EdDSA", kid, typ }, payload, signature }`
  - **签名覆盖 `canonicalJson({ payload, protected })`** —— 使 `alg` / `kid` 落在被签字节内，防算法混淆
  - 公钥以 **JWKS（Ed25519 OKP）** 发布
  - 签名密钥与锚定密钥分离（见 P0-6）
- **涉及**：`src/types.ts`、`src/receipt/builder.ts`、新增 `src/receipt/signing.ts`、`test/receipt.test.ts`
- **验收**：篡改任一字段 → 验签失败；替换 `alg` 或 `kid` → 验签失败
- **参考实现**：Traceipt `src/index.mjs` 的 `verifyEnvelope`

### P0-3. 修 `classify()`，让 `incomplete` 真正可达

> ✅ **已完成（2026-09-17）**。
> 实现：`VerificationResult` 由 `errors: string[]` 改为 `issues: Issue[]`，其中 `Issue = { kind: "tampered" | "incomplete", message }`。`classify()` 按 kind 判定，**`tampered` 优先于 `incomplete`**。
> 语义划分：自哈希不匹配 / prevHash 断链 / 首张带 prevHash / 根不匹配 / 已锚定收据缺失 → `tampered`；缺 txHash / 锚定无边界 → `incomplete`。
> 验证：新增两个用例——"缺 txHash 报 incomplete 而非 tampered"、"同时被改且缺证据时 tampered 优先"。**README 里"离线三态验证"的说法至此才真正成立。**

- **为什么**：D3。README 宣称三态，代码只有两态，且语义错误。
- **做什么**：区分三类
  - `verified` —— 全部检查通过
  - `tampered` —— **字节被改**（哈希不匹配、签名无效、链上不符）
  - `incomplete` —— **证据缺失/无法获取**（缺 txHash、缺签名、RPC 不可达）
- **涉及**：`src/verify/verifier.ts`、`test/receipt.test.ts`
- **验收**：构造三种用例分别命中三个状态
- **参考**：Traceipt 的 `ok: true | false | null`，`null` = SKIP，"never silently passed"
- ⚠️ **破坏性 API 变更**：`VerificationResult.errors` 已移除，改用 `issues`。

### P0-4. 修锚定后误报篡改

> ✅ **已完成（2026-09-17）**。
> 实现：`anchors` 表新增 `receipt_count`（该根覆盖多少张收据）；`anchor()` 写入当时的收据数；`verifyAnchor(receipts, root, receiptCount)` **按 epoch 切片**重算，而非拿全量收据。
> 边界语义：收据数 **少于** `receipt_count` → `tampered`（已锚定的收据缺失，属删除）；`receipt_count` 为 `null`（本列存在之前写入的旧锚定）→ `incomplete`（无法判定，不误报）。
> 另外：`verify()` 的整体 `status` 现在**汇总链校验与锚定校验**（原先只看链，锚定结果没被计入）。
> 验证：新增用例——"锚定后追加支付仍 verified"、"无边界锚定报 incomplete"、"已锚定收据缺失报 tampered"、"旧库 anchors 表迁移后边界为 null"，以及旧库 anchors 迁移路径。

- **为什么**：D4。旗舰的"离线验证"当前会在正常使用时误报，这是最容易被现场打脸的 bug。
- **做什么**：为 epoch 建立边界 —— 记录该 epoch 覆盖的收据范围（数量或时间上界 / 收据 id 列表的哈希），验证时按 epoch 切片比对，而不是拿全量收据
- **涉及**：`src/store/db.ts`（anchors 表加列）、`src/anchor/anchorer.ts`、`src/tools/receipts.ts`、`test/anchor.test.ts`
- **验收**：锚定 → 再做一笔支付 → `verify` 仍返回 `verified`

### P0-5. 第六段交付凭据做实

> ✅ **已完成（2026-09-17）**。
> 关键认识：**Ledgeroot 结算支付，但不抓取资源**——响应体只有调用方见过。所以第六段不可能由引擎自己产生，必须由调用方回报。
> 实现：`ledgeroot_pay` 新增可选 `responseBody`；有值则写入 `delivery.payloadHash`（`contentHash`，对**原始字节**做 SHA-256，不走 JCS 规范化）与 `payloadSize`；无值则 `delivery` 保持为空。**移除了原先 `segments.delivery = { payloadHash: payment.txHash }` 这个假值**，并删掉了从未使用的 `delivery.proof` 字段。
> 附带：`segments.tx` 新增 `payer`（见 P0-7 需要它做 `from` 比对），`PaymentResult` 相应返回付款地址。
> 验证：新增 4 个用例——记录 tx 与 payer、记录响应体哈希与字节数、无响应体时 delivery 为空、响应体变化则哈希变化。demo 已改为回报响应体，dry-run 现在能展示真实的第六段。

- **为什么**：D5。以"六段收据"为品牌，第六段是假的，这是叙事上的自我拆台。
- **做什么**：对实际响应体做哈希存入 `delivery.payloadHash`，并补尺寸
- **涉及**：`src/tools/pay.ts`、`src/types.ts`（`ReceiptSegments.delivery`）、`test/pay.test.ts`
- **验收**：相同响应 → 相同 payloadHash；响应被改 → 哈希变化
- **参考**：x402 草案 `DeliveryReceipt.responseHash = keccak256(raw HTTP response body)`
- ⚠️ **有意未做 `latencyMs`**：Ledgeroot 不发起资源调用，无法诚实测量该延迟。填一个调用方随手给的数字，正是 D5 要修的那种"塞个看起来合理的东西进去"。

### P0-6. 锚定合约加权限控制

- **为什么**：D6。x402 草案攻击 A4 已把 permissionless 锚定判为可伪造，且建议生产环境默认用 permissioned。
- **做什么**：
  - `anchor()` 加 `onlyOwner` 或记录提交者身份
  - 事件中移除或评估 `epoch` 序号的隐私风险（对照草案攻击 A7）
- **涉及**：`contracts/src/LedgerootAnchor.sol`、`contracts/test/LedgerootAnchor.t.sol`、`src/anchor/anchorer.ts`
- **验收**：非授权地址调用 `anchor()` 回滚

### P0-7. 链上结算内容校验

> ✅ **已完成（2026-09-17）**。
> 实现：新增 `src/verify/onchain.ts`。核心是 `SettlementReader` 接口——把"读链"与"判定"分开，判定逻辑因此可在无节点的环境下测试。viem 实现 `createSettlementReader(rpcUrl)` 读交易 + 回执并解码 ERC-3009 `transferWithAuthorization`。
> 判定项：交易存在、执行成功、`to` 是 USDC 合约、授权的 `to`/`value`/`from` 与收据的 payTo/amount/payer 一致。
> ⚠️ **`tampered` / `incomplete` 的界线在这里最关键**：交易查不到 → `tampered`（链上没有这笔）；**节点连不上 → `incomplete`**（读不到 ≠ 不存在）。这是刻意区分的——把网络故障报成篡改，会让整个告警失去可信度。
> 接入：`verifyOnChain()`（`tools/receipts.ts`）、CLI `ledgeroot verify --check-chain`、MCP `ledgeroot_verify` 的 `checkChain` 参数。**离线路径保持同步且零网络**，链上校验是显式选用。
> 验证：新增 `test/onchain.test.ts`（12 个用例，含节点不可达报 incomplete、未知链报 incomplete、付款方不符报 tampered、只校验 paid 收据）。

- **为什么**：D7。**这是"verified"可能为假的直接来源**，也是 Traceipt 的 `--check-chain` 已做的事。
- **做什么**：新增链上校验步骤
  1. 按 `segments.tx.txHash` 从 RPC 拉交易
  2. 确认 `tx.to` 是 USDC 合约
  3. 解码 ERC-3009 `transferWithAuthorization` 或 Transfer 事件
  4. 比对 `from` / `to` / `value` 与收据的 payer / payTo / amount
  5. 确认为成功出块
- **涉及**：`src/verify/verifier.ts`、新增 `src/verify/onchain.ts`、`src/chains.ts`、`test/`
- **验收**：伪造的 txHash → 校验失败；真实交易 → 通过

### P0-8. 收据排序改为单调追加序号 ⭐ 新发现，高优先

> 该缺陷在验证 P0-1 时发现 —— 与 Merkle 改动无关，但会使其失去意义。
>
> ✅ **已完成（2026-09-17）**，采用方案 A（新增 `seq` 列 + 迁移）。
> 实现：`receipts` 表新增 `seq INTEGER NOT NULL`；插入时取 `MAX(seq) + 1`（单条 INSERT 内的子查询，写事务内原子）；三处排序（`listReceipts` / `lastReceipt` / `getReceiptByRequestId`）全部改用 `seq`。
> 迁移：`migrate()` 检查 `PRAGMA table_info`，旧库走 `ALTER TABLE ADD COLUMN seq INTEGER NOT NULL DEFAULT 0` 后按 `rowid`（写入顺序）回填。
> 验证：新增 `test/store.test.ts`（4 个用例：乱序 id 的追加顺序、同毫秒链校验、幂等键取最早、旧库迁移回填）；移除 `anchor.test.ts` 里时间戳钉死的 workaround，该测试本身成为回归验证。
> **实测：demo 连跑 15 次，`verify` 15/15 返回 `verified`（修复前 12 次里 7 次误报 `tampered`）。** 43 个测试全过，typecheck / build 通过。

- **为什么**：D8。**旗舰的离线验证在干净链上会间歇性误报 `tampered`（实测 12 次里 7 次）**；且 epoch 根依赖该顺序，**锚定不可复现**。
- **根因**：`listReceipts` 用 `ORDER BY created_at ASC, id ASC`。收据的 `created_at` 来自 `Date.now()`（毫秒）。同一毫秒内的两张收据，次级排序回退到**内容哈希** `id`——它与追加顺序毫无关系，于是返回顺序与哈希链的链接顺序不一致。
- **实测证据**（demo 一次失败运行，实际追加顺序 A → B → C）：

  | store 位置 | created_at | status | id | prev_hash |
  |---|---|---|---|---|
  | 0 | …061 | paid | `e587dff8…` | `null` |
  | 1 | …062 | denied | `66ccda08…` | `d03fbb51…` |
  | 2 | …062 | denied | `d03fbb51…` | `e587dff8…` |

  B 与 C 同毫秒，`id ASC` 把 `66cc…`（C）排到了 `d03f…`（B）之前 → `prevHash` 对不上 → 报 `tampered`。

- **做什么**：为 `receipts` 表引入**单调追加序号**，排序一律以它为准
  - 方案 A（推荐）：新增 `seq INTEGER`（或 `INTEGER PRIMARY KEY AUTOINCREMENT`）列 + 迁移
  - 方案 B（最小改动）：直接 `ORDER BY rowid`（依赖 SQLite 隐式 rowid，但 `VACUUM` 可能重编号，证据账本不宜依赖）
  - **不要**再用任何内容派生或毫秒级字段做排序键
- **涉及**：`src/store/db.ts`（建表 + 迁移 + `listReceipts` / `lastReceipt`）、`test/anchor.test.ts`（可移除时间戳钉死的 workaround）、新增排序回归测试
- **验收**：
  - 连续跑 demo 多次，`verify` **恒定**返回 `verified`
  - 新增测试：同一毫秒追加多张收据，`listReceipts` 顺序与追加顺序一致
  - `test/anchor.test.ts` 里"Pin distinct timestamps"那段 workaround 可以删掉

---

## 五、P1：核心差异化

> P0 修完后再做。这一层决定 Ledgeroot 是"另一个收据工具"还是"唯一能做这三件事的系统"。

### P1-1. 完整性证明产品化（支柱 2）

- **做什么**：
  - 把"哈希链 + epoch 根 ⇒ 序列无缺口"从实现细节变成**显式可验证的声明**
  - 新增能力：给定一个 epoch 的收据集合，能证明**没有收据被省略**
  - 为每张收据生成 **Merkle 包含证明**（目前 `merkle.ts` 只有 `merkleRoot`，没有 proof 生成/验证）
  - 明确"缺口检测"语义：序号连续性 + 链回指 + 根比对三层
- **涉及**：`src/anchor/merkle.ts`（加 `merkleProof` / `verifyProof`）、`src/verify/verifier.ts`、`src/tools/receipts.ts`
- **验收**：删掉中间一张收据 → 验证报错并指出缺口位置
- **战略意义**：**这是 x402 草案测试 3.2.4 明确承认做不到、Traceipt 也做不到的事。是唯一被标准层面留白的硬能力。**

### P1-2. 独立验证器包（支柱 3 + 分发）

- **为什么**：第三方拿到一张收据目前无法单独验证（验证器耦合在本地库上）。TrustBench 和 Traceipt 都有独立 npm 包。
- **做什么**：
  - 新包 `@ledgeroot/verify`（或 `ledgeroot-verify`），零/极少依赖
  - 输入：收据 JSON（+ 可选 Merkle 证明、锚定根）
  - 输出：三态结果 + 每项检查明细（`ok: true|false|null`）
  - CLI + library 双形态，文档化退出码
  - **完全离线可跑**（这是对 Traceipt 的 `--jwks-url` 需要联网的直接优势）
- **涉及**：新增 package（monorepo 或独立仓库）、复用 `src/verify/*` 与 `src/receipt/hashchain.ts`
- **验收**：在无网络环境对一张导出的收据完成验证
- **参考**：`@trustbench/verify-receipt`（退出码 0–5 的设计值得照搬）、`traceipt-verify`

### P1-3. 强化"链上表达不了"的约束（支柱 1）

- **为什么**：Pieverse 的 ERC-6551 在链上可表达的范围内更强，必须把重心移到它的盲区，并把这件事说清楚。
- **做什么**：
  - 把五条策略按"链上可表达 / 不可表达"分类，**在文档和输出里显式标注**
  - 补强链上盲区的策略表达能力（例：报价漂移支持按端点配置阈值；限速支持多窗口）
  - 在收据的 `mandate.policyIntersection` 里记录"本次约束的类型"
- **涉及**：`src/policy/*`、`src/consistency.ts`、README
- **验收**：文档中能明确指出"这五条里哪三条是链上做不到的"

### P1-4. ERC-8004 身份接入

- **为什么**：x402 草案 SI-2 明确指出"无 facilitator/agent 注册表则无法验证签名者身份"；Pieverse 已把 ERC-8004 身份绑到运行中的 agent。
- **做什么**：`Mandate.agentId` 从字符串升级为可选的注册表校验（存在性 + 可选声誉查询）
- **涉及**：`src/mandate.ts`、`src/policy/`（可选新增一条策略）、`test/mandate.test.ts`
- **验收**：带无效 agentId 的 mandate 可被拒绝（策略可配置为 fail-closed）

---

## 六、P2：可见性与互操作

> 全部是低成本、高收益的动作，但**必须在 P0 之后**。

### P2-1. Discovery surfaces

- `/.well-known/ledgeroot.json` —— 机器可读能力清单
- `/llms.txt` —— LLM 可读摘要
- `/skill.md` —— agent 技能文件
- 参考：TrustBench 的四件套 + Pieverse 的 `/agents.md`、`/openapi.json`、`/.well-known/api-catalog`

### P2-2. 生态提交（零成本存活性动作）

- [ ] x402 Bazaar（`docs.cdp.coinbase.com/x402/seller/get-discovered`）
- [ ] Agentic.Market
- [ ] 官方 MCP Registry
- [ ] awesome-x402 等索引列表

### P2-3. PEAC 接入（借壳）

- [ ] 签发时输出 `PEAC-Receipt` 响应头（JWS）
- [ ] 发布 `/.well-known/peac.txt` 策略面
- [ ] 冲击 PEAC **L3 Commerce** 一致性等级
- [ ] mandate 写入 PEAC 的 `commerce-mandate` 扩展组
- [ ] **用锚定 + 哈希链补上 PEAC 的"`iat` 超 5 分钟即拒绝"缺陷**（这是它的结构性硬伤，也是我们的天然卖点）

### P2-4. Facilitator 多路化

- **为什么**：当前硬编码 Monad 单 facilitator 是单点。TrustBench 已跨 Base/Solana，Pieverse 在 BNB。
- **做什么**：`FacilitatorNetworkConfig` 已抽出 network/scheme，往前一步做成可配置列表 + failover
- **涉及**：`src/x402/facilitator.ts`、`src/chains.ts`、`src/bootstrap.ts`、`src/env.ts`

---

## 七、P3：公信力与标准

### P3-1. 发布收据规范

- 把 `ledgeroot.receipt.v1` 从代码里的类型定义提炼为**独立的开放规范文档**
- 参考：x402 草案（CC0）、PEAC（Apache-2.0）、TrustBench 的 `receipt-spec-v1.md`
- **PEAC 的教训**：标准才是护城河，不是实现

### P3-2. 可复现公开基准

- **为什么**：Black_Wall 用可复现基准（InjecAgent + AgentDojo 改编、带签名收据）建立公信，**Ledgeroot 无对标物**。
- **做什么**：针对"策略引擎拦截效果 + 验证器正确性"发布可复现基准，结论带签名收据

### P3-3. 长期加密韧性评估

- IETF vauban 在推 STARK + 后量子（ES256K + ML-DSA-65）；Traceipt 已支持 ML-DSA-65 混合签名
- x402 V2 的 `PAYMENT-RESPONSE` 默认 ES256K，长期完整性依赖量子计算机不存在
- **做什么**：评估是否需要混合签名方案；至少在规范里写明威胁模型与升级路径

---

## 八、明确的非目标（不做什么）

> 前六条来自竞争分析；后三条来自 [commercialization.md](./commercialization.md) §六。

| 不做 | 原因 |
|---|---|
| **不做托管** | 监管地雷；且与支柱 3 直接冲突 |
| **不做路由器 / 发现层** | Coinbase 的 Bazaar（23,000+ 资源）已垄断；对抗是自杀 |
| **不做 LLM 推理闸门** | Black_Wall 已占据且有牵引；我们的优势恰恰是**确定性**，做推理等于放弃优势 |
| **不做平台 / 代币 / NFT** | 与"证据引擎"定位冲突；且我们没有那个分发面 |
| **不打 "pre-action gate" 这个词** | 已被占据，且会把自己框成 Black_Wall 的劣化版 |
| **不宣称"所有 agent 都必须合规"** | EU AI Act 第 12 条只覆盖高风险系统；过度承诺会被当场拆穿 |
| **不做按调用收费** | 那是 TrustBench 的模式，前提是必须在请求路径里，与本地优先冲突 |
| **不做多租户 auth / billing** | 市场未验证，会拖垮当前规模（TrustBench 创始人也明确回避此技能） |
| **不现在启动商业化** | 见 `commercialization.md` §八 启动信号——等真实需求信号出现再投 |

---

## 九、里程碑

| 里程碑 | 内容 | 达成标志 |
|---|---|---|
| **M1 — 可信** | P0 全部完成 | 三态验证真实可用；`verify` 在正常使用下不误报；链上校验能识别伪造 txHash；Merkle 通过 RFC 6962 测试向量 |
| **M2 — 不可替代** | P1 全部完成 | 能演示"删除一张收据 → 验证报错"；第三方可在无网络环境独立验证一张收据 |
| **M3 — 可见** | P2 全部完成 | 出现在 Bazaar / Agentic.Market / MCP Registry；PEAC L3 兼容 |
| **M4 — 被引用** | P3 启动 | 收据规范公开；可复现基准发布 |

---

## 十、待定决策

| # | 决策 | 影响 | 状态 |
|---|---|---|---|
| **Q1** | **P0-1 的 Merkle 变更是破坏性的 —— 是否保留向后兼容？** | 决定是否需要收据 schema 版本升级与迁移路径 | ✅ **已答（2026-09-17）：采用破坏性升级。** 实现见 P0-1。**遗留：版本号决策未定 —— 破坏性变更按 semver 应升到 `0.2.0`（当前 `0.1.2`），且 MandateKey 依赖 `ledgeroot@^0.1.2`，需同步** |
| **Q2** | 签名密钥与锚定密钥是否分离？ | 安全边界设计 | 待定 |
| **Q3** | 独立验证器包放本仓库 monorepo 还是独立仓库？ | 分发与版本节奏 | 待定 |
| **Q4** | facilitator 多路化的目标链优先级？（Base / Solana / BNB） | 工作量与生态契合度 | 待定 |
| **Q5** | 支柱 1 的对外表述最终定稿？ | 全部文案 | 待定 |
| **Q6** | **P0-8 的排序修复用哪个方案？**（新增 `seq` 列 vs 依赖 `rowid`） | 是否做 schema 迁移 | 待定，推荐方案 A |

---

## 十一、监控触发条件（定期复核）

| 触发 | 含义 | 应对 |
|---|---|---|
| PEAC 规范出现 anchoring / 完整性机制 | 支柱 2 被吸收 | 重新定位 |
| x402 官方采纳 `SettlementResponse.attestation` | 收据层载体化 | 加速 PEAC 接入 |
| BlueTier 的 Traceipt 增加非省略证明或用户签名授权 | 支柱 1/2 同时受威胁 | 评估差异化是否还成立 |
| BlueTier 的 Black_Wall 提供本地/自托管部署 | 支柱 3 受威胁 | 同上 |
| Pieverse 的收据脱离 BNB Greenfield、支持自托管 | 支柱 3 受威胁 | 评估其"证据主权"叙事 |
| Coinbase 发布官方证据层或跨 facilitator 路由 | 分发层向下挤压 | 评估止损或转向 |
| IETF vauban 草案进入 WG | 离线可验证成为正式标准 | 对齐或参与 |

---

## 附：与三份文档的对应关系

| 本规划条目 | 来源 |
|---|---|
| P0-1 ~ P0-7 | `threat-landscape.md` §四 C1 源码核验表、§九 防御清单 |
| 支柱 1 修订 | `threat-landscape.md` §五 x402b 条目（ERC-6551 挑战） |
| 支柱 2 | `threat-landscape.md` §四 A2（x402 草案测试 3.2.4） |
| 支柱 3 | `threat-landscape.md` §七 半衰期表末三行 |
| 词汇纪律 | `threat-landscape.md` §七 用词警告 |
| P2-3 PEAC 接入 | `threat-landscape.md` §二 A1、§九 接入清单 |
| P2-2 生态提交 | `threat-landscape.md` §三 B1 |
| 非目标前六条 | `trustbench-competitive-analysis.md` §六、`threat-landscape.md` §八 |
| 非目标后三条 | `commercialization.md` §六 |
| **P1-1 的优先级** | `commercialization.md` §四 —— **完整性证明同时是商业论点本身，不是 nice-to-have** |
| **P1-2 的必要性** | `commercialization.md` §五 留缝 1 —— 第三方独立验证是"卖报告"的前置条件 |

> **商业化对路线图的影响**：见 [commercialization.md](./commercialization.md)。
> 核心是一条：**P1-1（完整性证明）的优先级被商业化逻辑进一步抬高** —— 它是唯一可售的差异点。
> 但商业化**不在本期启动**，只做"留缝"（`commercialization.md` §五）。
