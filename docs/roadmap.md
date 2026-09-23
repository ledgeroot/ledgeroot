# 行动规划

> 定位：Ledgeroot（engine）+ MandateKey（dashboard）的行动计划与状态
> 状态：2026-09-22
> 关联：[architecture.md](./architecture.md) · [commercialization.md](./commercialization.md) · [landscape.md](./landscape.md) · [standards.md](./standards.md) · [competitors.md](./competitors.md) · [tokenized-equities.md](./tokenized-equities.md)
> 排序原则：**先正确性，再差异化，再可见性，最后公信力**——前者是后者的前提
>商业化定位：**开源内核 + 企业控制面 + 对账与聚合层**；本期不启动商业化，只做架构留缝

> 📌 **定期复核的监控触发条件统一在 [landscape.md](./landscape.md) §八**，本文不再重复。

---

## 零、当前阶段

**目标**：跑通一个**完整的 loop**——**agent 在 Monad 上通过 x402 支付 → 生成收据 → 锚定 → 离线验证**。阶段内优化的是**演示的完整性与可信度**（"钱真的动了、记录真的能独立验证"），不是装机量，也不是百万笔性能。

| 阶段内取舍 | 说明 |
|---|---|
| ✅ 正确性 A 类（A1 崩溃窗口 / A2 `seq`） | **已完成**，见 §四 |
| ⏭ **D1b（链改配置化）** | 成本低（类型已就绪），让测试网 → 主网变成改配置。**下一个** |
| ⏸ B 类整组（规模） | 索引、批量、分区、聚合——赛后。见 [architecture.md](./architecture.md) §二 |
| ⏸ P1-6（聚合对账 demo） | 赛后补齐；赛内只用 `taskId` 做「N 笔 / 总额 / 拦截数」分组 |
| ⏸ N 系列（竞品对齐） | RFC 3161、held-set completeness、单文件验证器——赛后 |
| ⏸ P1-8（协议补齐：MPP / `upto` / 外部授权引用） | 赛后——它会动到验证分派与 **epoch 边界语义（Q9）** |

> 📌 **为什么选 Monad 不是凑数**：Monad 的高吞吐 + 低费用与"agent 小额支付"这个唯一真正需要吞吐量的工作负载对齐。见 [architecture.md](./architecture.md) §四。

---

## 一、规划依据（前提）

**0. 🎯 生态位**：**链上稳定币 × agent 小额 402 支付**，**明确不做大额**。理由不是打不过 Shopify/Stripe，是**卡组织费率结构**（$0.30 + 2.9%）在 $0.005 上物理不可行。完整论述见 [commercialization.md](./commercialization.md) §零。

> ⚠️ **这一条改变了下面的读法**：**买方**是财务 / AP 对账（合规在小额场景暂不在场）；**产品**是**账**（聚合与对账）不是收据（收据是原料）；**三根支柱的意义变了**（授权更重要、完整性是为聚合数字的可信度、零外泄是为保护支付流量这个商业情报）。

1. **"签名收据"已商品化**（PEAC、TrustBench、agentstamp、Vaultra、BlueTier、Traceipt、EVIDIQ）。
2. **"Merkle + 上链锚定 + 离线验证"正在商品化，半衰期 6–12 个月**。
3. **"预行动闸门"已被两方占据**——Black_Wall（有定价与牵引）与 arXiv TrustBench（ASU+UCLA）。**不要用这个词做定位。**
4. **PEAC 是载波不是对手**（明确不做 policy engine、不做路由）。
5. **Coinbase 是分发层**——不被索引等于不存在。
6. **Pieverse 用 ERC-6551 提供了链上强制的消费限额**——对"用户授权"支柱的真实挑战。
7. ⚠️ **"执行前确定性授权"已被 OAP 正式规格化**（arXiv 2603.20953）。
8. ⚠️ **"非省略证明"已被 Vaara Receipt 正式规格化**（draft-10），**且更完整**。
9. **"transaction authorization" 已是学术通用术语**（SoK 2604.15367 的 D2 维度）。
10. ⚠️ **这些不是"学术界"，是厂商在售产品**（APort $499/$4,990 月费；Vaara AGPL + 付费 pilot）。
11. ⚠️ **牵引排序**：**Vaara ≈2,164/周**，APort 614，BlueTier 111。
12. ⚠️ **AWS 把三根支柱的表述面全占了**（payment session = mandate、deterministic 基础设施层限额检查 = 策略引擎、Observability 自称 "payment audit trails"），且**已实现 MPP 与 x402 `upto`**。它同时推翻了护城河论证的一半——**费率结构排除"抽成型"对手，不排除"把支付当平台功能送"的云厂商**。见 [competitors.md](./competitors.md) §二。

**结论**：Ledgeroot **不能靠"我们有锚定收据"取胜，不能靠"我们证明没有遗漏"取胜，也不能靠"我们本地优先"取胜**——三者都已被占据。**唯一剩下的一格是"支付专用的用户签名授权 + 零出境"**。同时必须承认：**对手的发布节奏比我们快一个数量级**，排序原则（正确性 → 差异化 → 可见性 → 公信力）在无订单但有标准位争夺时需重排。

---

## 二、现状盘点

### 2.1 已建成（可以依赖）

| 模块 | 文件 | 状态 |
|---|---|---|
| 策略引擎（fail-closed，五条策略） | `src/policy/{engine,defaults,schema}.ts` | ✅ |
| 六段收据构建 + RFC 8785 哈希链 | `src/receipt/{builder,hashchain}.ts` | ✅ |
| Ed25519 收据签名（JWKS / thumbprint kid） | `src/receipt/signing.ts` | ✅ |
| EIP-712 授权令（签发/验签/策略交集）+ 信任锚 | `src/mandate.ts` · `src/tools/mandate.ts` | ✅ |
| 授权-执行一致性分析 | `src/consistency.ts` | ✅ |
| SQLite append-only 存储 | `src/store/db.ts` | ✅ |
| 十一 MCP 工具 | `src/tools/{pay,buy,mandate,receipts,registry}.ts` | ✅ |
| 离线验证器（三态）+ 链上结算校验 | `src/verify/{verifier,onchain}.ts` | ✅ |
| Merkle + 锚定器 | `src/anchor/{merkle,anchorer}.ts` | ✅ |
| 锚定合约 | `contracts/src/LedgerootAnchor.sol` | ✅ |
| x402 buyer（策略关口在签名边界）+ facilitator | `src/x402/{buyer,facilitator}.ts` | ✅ |
| CLI（verify / export / anchor / buy / jwks / serve） | `src/cli.ts` | ✅ |
| 测试 15 文件 / 128 用例 + Solidity 测试 | `test/`, `contracts/test/` | ✅ |
| npm 发布 | `package.json`（`v0.7.0`） | ✅ 已发布 |

### 2.2 正确性缺陷（源码级，P0）—— ✅ 8/8 已修

| # | 缺陷 | 后果 | 状态 |
|---|---|---|---|
| D1 | Merkle 无域分隔 | 结构性第二原像 | ✅ P0-1 |
| D2 | 收据完全无签名 | 能证"没被改"，不能证"谁做的陈述" | ✅ P0-2 |
| D3 | `incomplete` 是死代码 | README 宣称三态，实际两态 | ✅ P0-3 |
| D4 | 锚定后误报篡改 | 锚定后再支付即报 `tampered` | ✅ P0-4 |
| D5 | 第六段交付凭据是假的 | 品牌核心能力原为占位符 | ✅ P0-5 |
| D6 | 锚定合约无权限控制 | "上链了"只证明"有人锚了这个根" | ✅ P0-6 |
| D7 | 无链上结算内容校验 | facilitator 伪造 txHash 仍报 `verified` | ✅ P0-7 |
| D8 | 收据排序不确定 | 离线验证间歇性误报 `tampered` | ✅ P0-8 |
| A1 | 结算先于收据写入（崩溃窗口） | 丢钱 + 丢证据 + 重试重复付款 | ✅ P0-9 |
| A2 | `seq` 全表扫描 | 50k 行时 5.6 ms/笔 | ✅ P0-10 |

> 📌 实现细节见 [architecture.md](./architecture.md) §一。**技术债已清——剩下的都是商业债。**

### 2.3 未开始

独立验证器包 · 任何 discovery surface（`/skill.md`、`/llms.txt`、`/.well-known/`） · 任何生态提交（Bazaar、Agentic.Market、MCP Registry） · PEAC 兼容 · 多 facilitator / 多链 · **协议补齐（P1-8：MPP、x402 `upto`、外部授权引用）** · ERC-8004 接入 · 收据规范发布 · 可复现基准。

### 2.4 真实差距（技术债已清，剩商业债）

| # | 差距 | 谁有 | 现状 | 为什么重要 |
|---|---|---|---|---|
| N1/N8 | **RFC 3161 合格时间戳** | Vaara（含 eIDAS）、Vaultra、NovaFabric | ❌ 无 | Merkle 锚定证明"根在此区块前存在"，**不等于法定时间戳** |
| N2 | **人类可读交付物**（VAT PDF / 审计报告） | Traceipt、Vaultra | ❌ 无 | 机器可验 ≠ 会计可归档；进财务/审计流程的门票 |
| N3 | **主网** | Traceipt/Black_Wall（Base）、EVIDIQ | ❌ Monad **测试网**——但**刻意选择** | 测试网锚定不产生证据价值；赛后处理 |
| N4 | **跨语言规范化变体** | Traceipt | ⚠️ 用 `canonicalize`，未处理变体 | 第三方用别语言实现验证器会对不上 |
| N5 | **后量子签名** | Traceipt（ML-DSA-65 双签）、Vaara（MAY） | ❌ 无 | 长期档案韧性 |
| N6 ❗ | **held-set completeness** | **Vaara Receipt §6.4** | ⚠️ 只有逐 epoch Merkle 根 | 原支柱 2 已被占；差距是工程粒度 |
| N7 ❗ | **公开一致性向量 + 独立 checker** | Vaara、Traceipt、TrustBench | ❌ 无 | "第三方能独立验证"的唯一可证明形式；**N2/N6 的共同前置** |
| N9 ❗ | **Vaara profile / OAP policy pack 接入** | 开放接入点 | ❌ 未开始 | 成为"对方规范里空着的那一环" |
| N10 ❗ | **单文件断网验证器** | **Vaara Resin**（单 HTML、断网） | ❌ 无 | "零出境"最彻底的证明形式 |
| N11 ❗ | **独立重铸 / 逐字节复现** | Vaara v1.14.0 | ❌ 无 | "独立实现能复现"的最强形式 |
| N12 ❗ | **发布节奏** | Vaara 5 个月到 v1.50.0 | ⚠️ | 不是能力差距而是**节奏差距** |
| N13 ❗ | **MPP provider 与结算校验** | **AWS（已 GA 支持 MPP）** | ❌ 只有接缝 | 预留接缝时等的"需求信号"到了 |
| N14 ❗ | **x402 `upto` scheme** | **AWS** | ❌ 无 | 报价漂移正是它缺的校验——**我们对 AWS 唯一可正面宣传的功能差异** |
| N15 ❗ | **外部授权引用 + 外部控制面导入** | **AWS AgentCore session** | ❌ 无 | 控制面开始属于别人；缺它则证据层覆盖不了别人编排的支付 |

> 📌 **N6 = 原支柱 2**，从"独有卖点"变成"必须补的工程差距"。**N7 是 N2 与 N6 的共同前置。** **N1/N8 应优先于其他**——它们是"卖审计报告"能否成立的前提。

---

## 三、战略收敛：修订后的三根支柱

> ⚠️ 下面的表述刻意改为"**我们守住的是哪一格**"，而不是"我们有什么"。

### 支柱 1（修订）：链上表达不了的约束 + 拒绝留痕 + **凭据由用户自签**

承认两个对手强制力更强——**ERC-6551** 在合约层强制，**OAP** 在框架层强制且已有 6 个生产集成。我们守的是它们守不住的部分：

| 约束 | 为什么别人难做 | 现状 | 对手 |
|---|---|---|---|
| **报价漂移** | 需对比 402 报价与实际扣款 | ✅ `quoteDrift` | OAP 无支付语义 |
| **对手方白名单（host 维度）** | 链上只知道地址 | ✅ | ⚠️ OAP 有 `allowed_domains`（部分覆盖） |
| **按端点限速** | 链上无法表达"每端点每窗口次数" | ✅ | ⚠️ OAP 有 `max_calls_per_minute`（粗粒度） |
| **组合攻击（累计上限）** | — | ✅ | ⚠️ OAP 承认防不住 structuring |
| **拒绝留痕** | 链上不记"被拦下的尝试" | ✅ | ⚠️ OAP 已有签名拒绝 + reason code |
| **凭据由用户自签** | OAP 由注册表签发；Vaara 由 broker 铸造 | ✅ EIP-712 本地签名 | ✅ **仍独有** |
| **链无关凭证** | ERC-6551 绑定 EVM/单链 | ✅ domain 刻意不含 chainId | — |
| **本地确定性 + 零出境** | OAP 默认走云端 | ✅ 毫秒级、零网络 | ✅ **仍独有** |

### 支柱 2（修订）：完整性 —— ❌ **不再独有，改为"接入并达标"**

| | Vaara | Ledgeroot |
|---|---|---|
| 漏发检测 | 逐条 `runningCount` | 逐 epoch Merkle 根 |
| 尾部截断 | 显式封存记录 | 隐含 |
| 缺口最坏情况 | `maxClass` | ❌ |
| 独立 checker | ✅ 公开向量 + 独立脚本 | ❌ |

→ **动作：按 Vaara §6.4 实现，而不是继续自研。** 见 N6–N9 与 [standards.md](./standards.md) §七。

### 支柱 3（修订）：证据主权 —— ⚠️ **不再独有**

Vaara 已做到**且更彻底**（自托管 + 无 SaaS + 断网单文件验证 + "证据不依赖厂商"）。

| | Vaara | Ledgeroot |
|---|---|---|
| 自托管 / 无 SaaS / 无遥测 | ✅ 明示 | ✅ |
| 断网可验证 | ✅ **单 HTML** | ⚠️ CLI 本地读 SQLite |
| 牵引 | ≈2,164/周 | 0 |

→ **动作：补 N10（单文件断网验证器）。** 在补齐之前，"本地优先"是**平价而非优势**。

### 词汇纪律（必须遵守）

见 [landscape.md](./landscape.md) §七"用词警告"。要点：**不用"预行动闸门"**（改用"用户签名的确定性强制"）、**不用"完整性证明/本地优先"做独有卖点**、**不对"合规收据"泛化**。

---

## 四、P0：正确性修复 —— ✅ 全部完成

> **原则**：在 D1–D8 修完之前**不要做任何分发动作**。带可被证伪的密码学去争取可见性，是把缺陷放大给全世界看。

| 项 | 内容 | 状态 |
|---|---|---|
| P0-1 | Merkle 改 RFC 6962 构造（含域分隔、字节运算、2 的幂切分）；用 RFC 9162 栈式算法交叉验证 | ✅ |
| P0-2 | 收据补签名（Ed25519，签 `receiptHash`，`alg`/`kid` 落在被签字节内；独立 `LEDGEROOT_SIGNING_KEY`） | ✅ |
| P0-3 | `classify()` 让 `incomplete` 可达（`Issue.kind`，`tampered` 优先） | ✅ |
| P0-4 | 锚定后不误报（`anchors.receipt_count` 边界 + `verifyAnchor` 切片） | ✅ |
| P0-5 | 第六段交付凭据做实（`responseBody` → `contentHash` + `payloadSize`；只存哈希不存原文） | ✅ |
| P0-6 | 锚定合约加 `owner` / `onlyOwner`（owner 取锚定钱包，拒绝 `address(0)`） | ✅ |
| P0-7 | 链上结算内容校验（拉 tx、解 ERC-3009、比对 from/to/value；节点不可达 → `incomplete`） | ✅ |
| P0-8 | 收据排序改单调追加序号 | ✅ |
| P0-9 | 收据先于结算写入（链外 `payment_intents` 占位；占位失败即拒付并记 denied） | ✅ |
| P0-10 | `seq` 交给 SQLite（rowid 别名，表重建迁移） | ✅ |

> 📌 **P0 完成意味着**：截至 2026-09-22，密码学实现**已与最强对手打平**，锚定权限这一项还先走一步（Traceipt 至今不校验交易的 `from`）。**剩下的是商业债。**

---

## 五、P1：核心差异化

> P0 修完后再做。这一层决定 Ledgeroot 是"另一个收据工具"还是"唯一能做这三件事的系统"。

### P1-1. 完整性证明产品化（支柱 2）

> 🚧 **部分完成**：`merkleProof` / `verifyMerkleProof`（RFC 6962 §2.1.3 审计路径）已实现并交叉验证；逐张包含证明已接进 MandateKey 的证据包与包内 `verify.mjs`。
> **仍未做**：`ledgeroot` 本体的 CLI / `ledgeroot_verify` 仍未输出或校验逐张证明；"缺口检测"语义与 `maxClass` 那一档。

- **做什么**：把"哈希链 + epoch 根 ⇒ 序列无缺口"变成**显式可验证的声明**；为每张收据生成 Merkle 包含证明；明确"缺口检测"三层语义（序号连续性 + 链回指 + 根比对）；**按 Vaara §6.4 补逐条 `runningCount` + 封存记录 + `maxClass`**。
- **验收**：删掉中间一张收据 → 验证报错并指出缺口位置。
- **战略意义**（已修正，见 §三）：不再是"别人做不到"，而是**聚合层的承重墙**（P1-7）。

### P1-2. 独立验证器包（支柱 3 + 分发）

- **为什么**：第三方拿到一张收据无法单独验证（验证器耦合在本地库上）。TrustBench 与 Traceipt 都有独立 npm 包。**这是"卖报告"的前置条件。**
- **做什么**：新包（零/极少依赖）；输入收据 JSON（+ 可选 Merkle 证明、锚定根）；输出三态 + 每项检查明细（`ok: true|false|null`）；CLI + library 双形态，文档化退出码；**完全离线可跑**。
- **验收**：在无网络环境对一张导出的收据完成验证。
- **参考**：`@trustbench/verify-receipt`（退出码设计值得照搬）、`traceipt-verify`。

### P1-3. 强化"链上表达不了"的约束（支柱 1）

- **做什么**：把五条策略按"链上可表达 / 不可表达"分类并在文档与输出里显式标注；补强链上盲区（报价漂移按端点配置阈值、限速多窗口）；在 `mandate.policyIntersection` 记录"本次约束的类型"。
- **验收**：文档能明确指出"这五条里哪几条是链上做不到的"。

### P1-4. ERC-8004 身份接入

- **为什么**：x402 草案 SI-2 指出"无 facilitator/agent 注册表则无法验证签名者身份"。
- **做什么**：`Mandate.agentId` 从字符串升级为可选的注册表校验（存在性 + 可选声誉）。
- **验收**：带无效 agentId 的 mandate 可被拒绝（策略可配置为 fail-closed）。

### P1-5. 索引与热路径

> 依据 [architecture.md](./architecture.md) §B1。**全库没有一个 `CREATE INDEX`。**

- **做什么**：为 `request_id`、`mandate_id`、`endpoint`、`status`、`seq` 建索引；`listReceipts` 加分页（`LIMIT`/游标）；避免在热路径加载全量收据。
- **验收**：10 万条收据下，单笔 `ledgeroot_pay` 的本地耗时**不随表增长**。

### P1-6. 对账与聚合层 ⭐ 生态位的产品本体

> 依据 [architecture.md](./architecture.md) §B1 与 [commercialization.md](./commercialization.md) §三 §四。**这是生态位里唯一能收费的那一层，目前完全不存在。**

**现状**：全库**没有一处 SQL 聚合**（无 `GROUP BY` / `SUM` / `COUNT`）。唯一的"按维度分组"是 `timeline.tsx` 对已全量加载数组做的客户端 `Map` 分组。**无异常/趋势检测，无 ERP/对账导出。**

- **做什么**：按对手方 / agent / 任务 / 时间桶的**聚合查询**；**可下钻**；**对账导出**（能进 ERP 的数据结构）；**异常视图**（谁在涨、哪条策略拦得最多）。
- **⭐ 第一批交付物是三个「支付查询原语」**（依据 [competitors.md](./competitors.md) §四·3）：

  | 原语 | 现在的替代 | 对 agent 的直接价值 |
  |---|---|---|
  | **先例检索**（"这个对手方上次收我多少"） | 无 | ⭐ **避免重复采购、发现报价上涨**——让 agent 自己受益的那一格 |
  | **意图链追踪**（`taskId` → 全部支付 + 拦截 + 结果） | `taskId` 只是分组键 | 把"这笔钱属于哪次任务"变成一次遍历 |
  | **影响面**（某对手方/端点吃掉多少预算） | 无 | 异常视图的前置 |

- **验收**：100 万条收据下，月度聚合**秒级**返回；导出结构能被真实财务/AP 读入。
- ⚠️ **前置**：依赖 **Q7**（元数据集中到什么程度）与 **P1-7**（聚合可信度建立在"能证明没漏"之上）。
- ⚠️ **不引入图数据库**：`taskId` 是一层浅分组，SQL 递归或两次查询即可。

### P1-7. 增量验证 + 完整性的承重作用

> 依据 [architecture.md](./architecture.md) §B2 §C1。

**现状**：`verifyReceiptChain` 逐条重算，**无增量、无检查点**；`--check-chain` 每笔 2 次 RPC 且 `Promise.all` 无上限。

- **做什么**：增量验证（记录"上次验到第几条"，锚定边界可复用）；`--check-chain` 加**并发上限**与分批。
- ⭐ **关键认识**：**这一条与 N6 是同一件事，理由从"对标对手"变成"我们自己的架构承重墙"**——生态位的产品是跨 fleet 聚合，而**每个 agent 锚定 `(receiptCount, root)` 就能让控制面在不看收据的情况下验证其聚合没有漏**。

### P1-8. 协议与接口补齐：MPP、x402 `upto`、外部授权引用 ⭐ 优先级高于 P1-5 / P1-6

> **触发来自 AWS**，**性质不是竞品对齐，而是覆盖面**：**x402 之外的轨道、按量结算的报价、别人签发的授权，这三样现在都不在证据覆盖范围内。**

**A1. MPP provider 与结算校验** —— 现状：`protocol` 维度已存在，非 x402 一律报 `incomplete`（[architecture.md](./architecture.md) §六）。**AWS 已 GA 支持 MPP**——"等规范与真实需求"的条件满足了。做什么：读 MPP 规范 → `MppPaymentProvider`（`PaymentProvider` 接口已在）→ `mpp` 结算校验。**未知协议仍报 `incomplete`。** ⚠️ **前置：Q9 必须先定。**

**A3. x402 `upto` scheme** —— 接受 `upto` 报价，把**上限**与**实扣**分别记进 `segments.plan`，报价漂移对**上限**判定。**战略意义**：`upto` 把"先授上限、按量结算"做成一等公民，**而报价漂移正是它缺的那个校验——这是我们对 AWS 唯一可正面宣传的功能差异。**

**A4 / A5. 外部授权引用与外部控制面导入** —— `segments.mandate` 增加外部授权引用字段（如 `externalRef`）；新增一种"外部授权"导入形态（仿 AP2 路径）。**验收**：一份由外部控制面（AWS session / 钱包方 grant）授权的支付，其收据能引用该授权，**且仍能被五条策略再校验一遍**。

---

## 六、P2：可见性与互操作

> 全部低成本、高收益，但**必须在正确性之后**。

- **P2-1 Discovery surfaces**：`/.well-known/ledgeroot.json`、`/llms.txt`、`/skill.md`。参考 TrustBench 四件套 + EVIDIQ。
- **P2-2 生态提交（零成本存活性动作）**：x402 Bazaar、Agentic.Market、官方 MCP Registry、awesome-x402。
- **P2-3 PEAC 接入（借壳）**：签发时输出 `PEAC-Receipt` 头（JWS）；发布 `/.well-known/peac.txt`；冲击 **L3 Commerce**；mandate 写入 `commerce-mandate` 扩展组；**用锚定 + 哈希链补上 PEAC 的"`iat` 超 5 分钟即拒绝"缺陷**。
- **P2-4 Facilitator 多路化**：`FacilitatorNetworkConfig` 已抽出 network/scheme，再做可配置列表 + failover（`facilitator.ts`、`chains.ts`、`bootstrap.ts`、`env.ts`）。
- **P2-5 质量与信任工程**（三条都便宜，且都是"让我们已经说出口的话变成真的"）：
  - **① Install matrix**（`os × node` + **从 `npm pack` 产物安装后冒烟测试**）⭐ 最急——曾被 `engines: ">=20"` 的假声明坑过（node 20 上 `better-sqlite3@13` SIGSEGV）。
  - **② `ledgeroot doctor`**：逐项输出结论，特别是 **签名密钥 `kid` 与库内已有收据是否匹配**（不匹配会让整本账变 `incomplete`，这是我们独有的坑）。
  - **③ 发布物信任工程**：`npm publish --provenance`、Dependabot、依赖审计。

> 📌 这三条与其余各条性质不同：Discovery/生态提交是"让别人找到我们"，**这三条是"让我们关于自己的陈述是真的"**——实质上属于**正确性**。

---

## 七、P3：公信力与标准

- **P3-1 发布收据规范**：把 `ledgeroot.receipt.v1` 提炼为独立的开放规范。**PEAC 的教训：标准才是护城河。**
- **P3-2 可复现公开基准**：针对"策略引擎拦截效果 + 验证器正确性"发布可复现基准，结论带签名收据（对标 Black_Wall）。
- **P3-3 长期加密韧性评估**：评估混合签名（后量子）方案；至少在规范里写明威胁模型与升级路径。
- **P3-4 PROV-O / RDF 导出**（N2 最省力的一半）：给 `export` 增加 `--format prov-o` 出口；映射 payment=Activity、mandate/issuer=Agent、quote/response=Entity、`prevHash` 关系=`wasInformedBy`。
  ⚠️ **必须诚实标注**：PROV-O 表达**来源**，不表达**不可篡改**——它可以被完整伪造。**我们的签名 + 锚定仍是信任根。**

---

## 八、明确的非目标

| 不做 | 原因 |
|---|---|
| 不做托管 | 监管地雷；与支柱 3 冲突 |
| 不做路由器 / 发现层 | Coinbase Bazaar（23,000+ 资源）已垄断 |
| 不做 LLM 推理闸门 | Black_Wall 已占；我们的优势恰恰是**确定性** |
| 不做平台 / 代币 / NFT | 与"证据引擎"定位冲突，且没有那个分发面 |
| 不打 "pre-action gate" 这个词 | 已被占据 |
| 不宣称"所有 agent 都必须合规" | EU AI Act 第 12 条只覆盖高风险系统 |
| 不做按调用收费 | 需在请求路径里，与本地优先冲突 |
| 不做多租户 auth / billing | 市场未验证，会拖垮当前规模 |
| 不现在启动商业化 | 见 [commercialization.md](./commercialization.md) §八 启动信号 |
| **不做控制面 / 看板去对标 AgentCore / CloudWatch** | 没有渠道，且那是它的主场 |
| **不做钱包 / 入金 / 托管** | Coinbase / Privy / AWS 已做成零摩擦 |
| **不追框架插件矩阵** | AWS 的主场；守住 MCP 宿主这一个入口 |
| 不做绑死单一交易场所的产品 | 见 [tokenized-equities.md](./tokenized-equities.md) §九 |
| 不做按交易金额比例抽成 | 会改变监管主体身份 |

---

## 九、里程碑

| 里程碑 | 内容 | 达成标志 |
|---|---|---|
| **M1 — 可信** | P0 全部完成 | ✅ **已达成**：三态验证真实可用；`verify` 正常使用下不误报；链上校验能识别伪造 txHash；Merkle 通过 RFC 6962 向量 |
| **M2 — 不可替代** | P1 全部完成 | 能演示"删除一张收据 → 验证报错"；第三方可在无网络环境独立验证一张收据；**MPP 与 x402 `upto` 的支付都能出收据并验证为 `verified`** |
| **M3 — 可见** | P2 全部完成 | 出现在 Bazaar / Agentic.Market / MCP Registry；PEAC L3 兼容 |
| **M4 — 被引用** | P3 启动 | 收据规范公开；可复现基准发布 |

---

## 十、待定决策

| # | 决策 | 影响 | 状态 |
|---|---|---|---|
| **Q1** | P0-1 的 Merkle 变更是破坏性的——是否保留向后兼容？ | 决定 schema 版本升级与迁移路径 | ✅ **已答：采用破坏性升级。** 版本号已定：`0.7.0` |
| **Q2** | 签名密钥与锚定密钥是否分离？ | 安全边界 | ✅ **已答**：`LEDGEROOT_SIGNING_KEY` 独立且不回落；锚定 owner 取锚定钱包 |
| **Q3** | 独立验证器包放本仓库 monorepo 还是独立仓库？ | 分发与版本节奏 | 待定 |
| **Q4** | facilitator 多路化的目标链优先级？（Base / Solana / BNB） | 工作量与生态契合度 | 待定 |
| **Q5** | 支柱 1 的对外表述最终定稿？ | 全部文案 | 待定 |
| **Q6** | P0-8 的排序修复用哪个方案？ | — | ✅ **已答：方案 A（`seq` 列 → rowid 别名）** |
| **Q7** 🎯 | **零外泄 vs 聚合的边界在哪里？**（[architecture.md](./architecture.md) §三） | ⚠️ **决定控制面 schema 与 P1-6 的数据模型** | **待定——必须在 P1-6 之前决定** |
| **Q8** | 现在上多写 / 多租户，还是先做单 agent？ | ⚠️ 决定 `seq` 分配与访问层要不要现在重做 | 待定，**越晚越贵** |
| **Q9** 🎯 | **MPP Sessions 下的 epoch 边界语义是什么？**（N:1 结算 vs 按 `receiptCount` 切片） | ⚠️ 决定锚定与完整性证明在 MPP 下是否成立 | **待定——必须在 P1-8 的 A1 之前定** |
| **Q10** | 停牌状态源取哪一类？（官方 feed / 交易所 API / 多源共识 / 乐观挑战） | 决定 `IHaltOracle` 设计与 grant 申请的技术分量 | 待定 |
| **Q11** | 代币化股票垂直第一份收费交付物的目标格式？ | 需与真实 transfer agent / TSV 合规人员对话后定 | 待定 |
| **Q12** | mandate 的 issuer 是否支持"证券发行人持有撤销权"？ | 决定该垂直的核心设计，影响条件③ | 待定 |
| **Q13** | 是否为代币化股票垂直设独立仓库（如 `ledgeroot-tsv`）？ | 影响是否污染主仓库的标准位叙事 | 待定 |
| **Q14** | SEC 评论文件（2026-11-03）是否单独署名？ | 决定这条线索的归属与可引用性 | 待定（**有时限**） |
| **Q15** | 产品主线取名册层（TA）还是交易层（TSV），还是跨场所的名册 + 证据层？ | 决定架构、买方、是否绑死 Uniswap | 待定 |
| **Q16** | 是否承认"纯链上名册不成立"，把链下受控副本纳入架构？ | 直接决定名册层架构 | 待定 |
| **Q17** | 是否承担"Tokenization Agent"这一尚未定义的角色？ | 决定成为被点名的服务商类别还是工具供应商 | 待定 |

> 🔴 **Q7 是最关键的未决项**：产品是"跨 fleet 的账"，架构是"每 agent 本地一个 SQLite"——跨 fleet 聚合需要把 N 个 agent 的数字汇到一处，这与"零外泄"存在张力。推荐**"每 agent 自算 rollup + 锚定链接"**，它同时保住零外泄与可验证性。
>
> 🔴 **Q8 的代价随时间上升**：`seq` 分配与单写进程在单 agent 下无害，在舰队下会直接崩。

---

## 附：与其他文档的对应关系

| 本规划条目 | 来源 |
|---|---|
| 生态位（§一 第 0 条） | [commercialization.md](./commercialization.md) §零 |
| P0-1 ~ P0-8 | [landscape.md](./landscape.md) §二（x402 草案 A4 / 测试 3.2.4 / SI-2） |
| P0-9 / P0-10 | [architecture.md](./architecture.md) §一 |
| P1-5（索引）/ P1-6（聚合）/ P1-7（增量验证） | [architecture.md](./architecture.md) §B1 §B2 §C1 |
| Q7 / Q8 | [architecture.md](./architecture.md) §三 §B3 §B4 |
| 支柱 1/2/3 修订 | [standards.md](./standards.md) §六、[competitors.md](./competitors.md) |
| N1–N12 | [standards.md](./standards.md)、[competitors.md](./competitors.md) §一 |
| N13–N15 / P1-8 / Q9 | [competitors.md](./competitors.md) §二 |
| P1-6 查询原语 / P2-5 / P3-4 | [competitors.md](./competitors.md) §四（Semantica） |
| Q10–Q17 / 非目标（交易场所、抽成） | [tokenized-equities.md](./tokenized-equities.md) |
| 监控触发条件 | [landscape.md](./landscape.md) §八 |
