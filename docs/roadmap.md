# Ledgeroot 行动规划

> 制定日期：2026-09-17
> 最近修订：2026-09-18（第五次补充）—— ⚠️ **新增 §一 第 12 条前提（AWS Bedrock AgentCore payments 已 GA）、§2.4 的 N13–N15、§五 的 P1-8（A1/A3/A4/A5）、§十 的 Q9、§十一 监控触发**。**其中"费率结构护城河挡不住云厂商"一条推翻了 §零 生态位论证的一部分。** 详见 [aws-agentcore-payments-analysis.md](./aws-agentcore-payments-analysis.md)
> 依据文档：[aws-agentcore-payments-analysis.md](./aws-agentcore-payments-analysis.md) · [commercialization.md](./commercialization.md) · [architecture-gaps.md](./architecture-gaps.md) · [standards-landscape.md](./standards-landscape.md) · [threat-landscape.md](./threat-landscape.md) · [trustbench-competitive-analysis.md](./trustbench-competitive-analysis.md) · [vaara-competitive-analysis.md](./vaara-competitive-analysis.md)
> 适用范围：Ledgeroot（engine）+ MandateKey（dashboard）
> 排序原则：**先正确性，再差异化，再可见性，最后公信力** —— 前者是后者的前提
> 商业化定位：**开源内核 + 企业控制面 + 对账与聚合层**；本期不启动商业化，只做架构留缝

---

## 零、当前阶段：Monad 黑客松（2026-09-17 新增）

> ⚠️ **这是眼下的第一优先级，其余各节在此阶段从属于它。**

**目标**：跑通一个**完整的 loop** 让评委看懂——**agent 在 Monad 上通过 x402 支付 → 生成收据 → 锚定 → 离线验证**。

**阶段内该优化的**：演示的完整性与可信度（"钱真的动了、记录真的能独立验"），不是装机量，也不是百万笔性能。

| 阶段内的取舍 | 说明 |
|---|---|
| ✅ ~~**A1 提前到第 0 位**~~ | **已完成（2026-09-17）**：链外 `payment_intents` 占位，动钱之前落库。它原是唯一会在现场现形的 bug——demo 连续快跑正好放大那个窗口 |
| ✅ ~~**A2（`seq` 分配）**~~ | **已完成（2026-09-17）**。原判断（撞号）实测不成立；真实问题是每次插入全表扫描——50k 行时 **5.6 ms/笔 → 53 µs** |
| ⏭ **D1b（链改配置化）** | 成本低（`FacilitatorNetworkConfig` 类型已就绪），且让测试网 → 主网变成改配置。**下一个** |
| ⏸ **B 类整组（规模问题）** | 索引、批量、分区、聚合——**黑客松后**。见 [architecture-gaps.md](./architecture-gaps.md) §二 |
| ⏸ **「多笔微支付聚合对账」demo（P1-6）** | 演示场景见 `demo场景清单` §二 第 6 项。**黑客松后**——届时补齐聚合查询 / 可下钻 / 对账导出；赛内只用 `taskId` 做「N 笔 / 总额 / 拦截数」分组 |
| ⏸ **N 系列（竞品对齐项）** | RFC 3161、held-set completeness、单文件验证器——**黑客松后** |
| ⏸ **P1-8（协议补齐：MPP / `upto` / 外部授权引用）** | **黑客松后**——它会动到验证分派与 **epoch 边界语义（Q9）**，赛内不碰协议层 |

> 📌 **为什么选 Monad 不是凑数**：Monad 的定位是高吞吐 + 低费用，而 **agent 小额支付正是唯一真正需要那个吞吐量的工作负载**（每秒数百笔 $0.005，在吞吐与费率不够的链上光 gas 就不可行）。**它和 §一 第 0 条的生态位本来就对齐。** 详见 [architecture-gaps.md](./architecture-gaps.md) §D1a。

---

## 一、规划依据

三份调研收敛出的结论，是本规划的全部前提：

**0. 🎯 生态位（2026-09-17 第六次修订新增，其余各条都从属于它）**：本产品瞄准的是 **链上稳定币 × agent 小额 402 支付**，**明确不做大额**。理由不是打不过 Shopify/Stripe，是**卡组织费率结构**（$0.30 + 2.9%）在 $0.005 的粒度上物理不可行——**这个位由费率结构保证，不由技术优势保证**。完整论述见 [commercialization.md](./commercialization.md) §零。

> ⚠️ **这一条改变了下面若干条的读法**：
> - **买方**：是**财务 / AP 对账**（关不了账），不是合规 —— 合规在小额场景暂时不在场
> - **产品**：是**账**（聚合与对账），不是收据 —— 收据是原料，不是交付物
> - **三根支柱的意义变了**（能力不变）：授权更重要、完整性是为聚合数字的可信度、零外泄是为保护支付流量本身这个商业情报

1. **"签名收据"已商品化**（PEAC、TrustBench、agentstamp、Vaultra、BlueTier、Traceipt）。
2. **"Merkle + 上链锚定 + 离线验证"正在商品化，半衰期 6–12 个月**（Traceipt 已上线，x402 草案已写成标准，IETF 在推）。
3. **"预行动闸门"这个词已被两方占据** —— Black_Wall（有定价与真实牵引，`blackwall-mcp` **111 次/周** npm 下载）与 **arXiv TrustBench 2603.09157（ASU + UCLA，"after an agent formulates an action but before execution"，<200ms）**。**不要用这个词做定位**（见 §三 用词警告）。
4. **PEAC 是载波不是对手** —— 它明确声明不做 policy engine、不做路由。
5. **Coinbase 是分发层** —— 不被索引等于不存在。
6. **Pieverse（$7M，Animoca + UOB 领投，代币 + 2.4 亿用户分发）用 ERC-6551 提供了链上强制的消费限额** —— 这是对"用户授权"支柱的真实挑战。
7. ⚠️ **（第四次新增）"执行前确定性授权"已被 OAP 正式规格化**（arXiv 2603.20953，2026-03-21）：Ed25519 签名 passport、21 个策略包、fail-closed、**签名拒绝 + reason code**、Claude Code 等 **6 个框架生产集成**、线上 CTF 实测（社科工程成功率 74.6% → 严格策略下 0%）、p50 53ms、Apache-2.0、提议标准控制类 PAA-1…5。
8. ⚠️ **（第四次新增）"非省略证明"已被 Vaara Receipt 正式规格化**（`draft-sirkkavaara-vaara-receipt-10`，2026-09-04，28 页）：`seq` + **签名进记录的 `runningCount`** + 显式**封存记录** + 对计数打 **RFC 3161 锚** + `maxClass` 界定缺口最坏情况；带**公开一致性向量**与不 import 签发方代码的独立 checker。**其 §11 原文明确宣称这些机制无人做过、本文两者都做了。**
9. **"transaction authorization" 已是学术通用术语**（SoK 2604.15367 的 D2 维度，明确映射 AP2/ACP/MPP/x402），不再是可占位的概念。
10. ⚠️ **（第四次修订二）性质判断更正：这些不是"学术界"，是厂商在售产品。** APort 定价 **$499 / $4,990 月费**；**Vaara 是 AGPL 自托管 + 付费 pilot + 商业许可**。
11. ⚠️ **（第四次修订二）牵引排序更正**：**Vaara ≈2,164 次/周**（PyPI 1,495 + npm 669），**APort 614**，而原判断里"唯一有真实牵引"的 BlueTier 只有 **111**。**Vaara 是它的 20 倍。** 而且 **Vaara 建仓 2026-04-20，5 个月到 v1.50.0**。
12. ⚠️ **（第五次新增，性质最严重）AWS 把三根支柱的表述面全占了。** **Amazon Bedrock AgentCore payments 已于 2026-08-18 GA**：**payment session**（= mandate：`maxSpendAmount` + currency + expiry）、**deterministic 的基础设施层限额检查**（= 策略引擎）、自带 **"payment audit trails"** 的 Observability（= 收据），并**已实现 MPP** 与 x402 的 **`upto`** scheme。它的官方用例（付费 API / MCP 工具 / 付费内容 / pay-per-inference）**就是 §零 定义的那个生态位**。
    → ⚠️ **它同时推翻了 §零 护城河论证的一半**：费率结构排除**按交易金额抽成**的对手（卡组织 / Stripe），**不排除按负载计费、把支付当平台功能送的云厂商**。详见 [aws-agentcore-payments-analysis.md](./aws-agentcore-payments-analysis.md) §6.2。
    → **唯一守住的位置**：**不做控制面，做它结构上不会去的中立证据层**——AWS 是这笔交易的当事人（持有凭据、编排支付、指示签名），**因此不能同时是验证的中立方**。

**结论（第四次修订二）**：Ledgeroot 不能靠"我们有锚定收据"取胜，**也不能再靠"我们证明没有遗漏"取胜**，**也不能靠"我们本地优先"取胜**——三者都已被 Vaara 占据。**唯一剩下的一格是"支付专用的用户签名授权 + 零出境"。** 同时必须承认：**对手的发布节奏比我们快一个数量级**，`§一` 原有的排序原则（正确性 → 差异化 → 可见性 → 公信力）在无订单但有标准位争夺的情况下需要重排。

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

### 2.2 正确性缺陷（源码级，P0）—— ✅ 8/8 已修

> ⚠️ **本表为缺陷原始登记，状态见最右列。**（2026-09-18 复核）

| # | 缺陷 | 位置 | 后果 | 状态 |
|---|---|---|---|---|
| D1 | **Merkle 无域分隔**：`sha256Hex(level[i] + right)`，叶与内部节点同构造，且对十六进制字符串而非字节运算 | `src/anchor/merkle.ts` | 结构性第二原像问题；**Traceipt 已用 RFC 6962 做对** | ✅ 已修（P0-1） |
| D2 | **收据完全无签名** | `src/receipt/builder.ts`、`src/types.ts` | 能证"没被改"，**不能证"谁做的陈述"** | ✅ 已修（P0-2） |
| D3 | **`incomplete` 是死代码**：`classify()` 只返回 `verified` / `tampered` | `src/verify/verifier.ts` | README 宣称三态，实际两态；"缺 txHash"被误判为"被篡改" | ✅ 已修（P0-3） |
| D4 | **锚定后误报篡改**：`verify` 用全量收据对比 `latestAnchor().root` | `src/tools/receipts.ts` | 锚定后再发生任何支付 → 重算根不匹配 → 报 `tampered` | ✅ 已修（P0-4） |
| D5 | **第六段交付凭据是假的**：`segments.delivery = { payloadHash: payment.txHash }` | `src/tools/pay.ts` | 把 txHash 抄进交付证明字段；品牌核心能力原为占位符 | ✅ 已修（P0-5） |
| D6 | **锚定合约无权限控制**：`anchor(bytes32)` 任何人可调 | `contracts/src/LedgerootAnchor.sol` | "上链了"只证明"有人锚了这个根"；x402 草案攻击 A4 已把同类问题标为可伪造 | ✅ 已修（P0-6） |
| D7 | **无链上结算内容校验**：只信任 facilitator 返回的 `txHash` | `src/verify/verifier.ts` | 出错或被攻破的 facilitator 返回伪造 txHash，验证照样报 `verified` | ✅ 已修（P0-7） |
| **D8** | **收据排序不确定**：`listReceipts` 按 `created_at ASC, id ASC` 排序，同毫秒时次级排序回退到**内容哈希** `id`，与追加顺序无关 | `src/store/db.ts` | 旗舰的离线验证会间歇性误报 `tampered`（实测 12 次里 7 次）；且 epoch 根依赖该顺序 → **锚定不可复现** | ✅ 已修（P0-8，方案 A：`seq` 列 + 迁移） |

> 📌 **D1–D8 的完成意味着**：截至 2026-09-18，Ledgeroot 的密码学实现**已与最强的对手（Traceipt）打平**，锚定权限这一项还先走一步（Traceipt 的 calldata 方案同样不校验 `from`）。剩下的是商业债而非技术债——见 §2.4。

### 2.3 未开始

- 独立验证器包（第三方拿到一张收据无法单独验证）
- 任何 discovery surface（`/skill.md`、`/llms.txt`、`/.well-known/`）
- 任何生态提交（Bazaar、Agentic.Market、MCP Registry）
- PEAC 兼容
- 多 facilitator / 多链
- ❗ **协议与接口补齐（P1-8）**：**MPP 支持**、**x402 `upto` scheme**、**收据的外部授权引用 + 外部控制面授权导入**
- ERC-8004 接入（`Mandate.agentId` 字段已埋，未接注册表）
- 收据规范发布
- 可复现基准

### 2.4 ❗ 新增差距（2026-09-17 竞品复核）—— 技术债已清，剩商业债

P0 修完后，与对手之间**仍然真实存在**的差距只剩这几项。它们不是密码学问题，而是"能不能交付给企业"的问题：

| # | 差距 | 谁有 | 现状 | 为什么重要 |
|---|---|---|---|---|
| N1 | **RFC 3161 合格时间戳** | Vaultra（Sectigo eIDAS QTSP，eIDAS Art. 41）、NovaFabric | ❌ 无 | Merkle 锚定证明"这个根在此区块之前存在"，**不等于法定时间戳**；EU 监管语境下 eIDAS QTSP 的戳有独立法律地位 |
| N2 | **人类可读交付物**（VAT 合规 PDF / 审计报告） | Traceipt（VAT PDF + 扫码验证）、Vaultra（auditor-ready PDF + 公开验证 URL） | ❌ 无 | 机器可验 ≠ 会计可归档。这是进财务/审计流程的门票，也是 commercialization.md §三"合规交付物"那一层最先被问到的东西 |
| N3 | **主网**（⚠️ 2026-09-17 修订，见下） | Traceipt / Black_Wall（Base 主网）、EVIDIQ（0G + X Layer 主网） | ❌ Monad **测试网**——**但这是刻意的**（Monad 黑客松） | 测试网上的锚定不能作为真实审计的凭据；**黑客松期间不需要** |
| N4 | **跨语言规范化变体** | Traceipt（键按 Unicode 码点排序 + 支持 Python `ensure_ascii` 变体） | ⚠️ 用 `canonicalize` 包，未处理变体 | 第三方用别的语言实现验证器时会对不上 |
| N5 | **后量子签名** | Traceipt（混合 ML-DSA-65 双签）；**Vaara 也把 ML-DSA-65 列为 MAY** | ❌ 无 | 长期档案韧性；对手已领先 |
| N6 ❗ | **held-set completeness（逐条 runningCount + 封存记录）** | **Vaara Receipt §6.4** | ⚠️ 只有逐 epoch 的 Merkle 根，无逐条计数、无封存语义、无缺口最坏情况 | **原支柱 2 已被占**；现在的差距是工程粒度而非概念 |
| N7 ❗ | **公开一致性向量 + 不 import 主库的独立 checker** | Vaara（`_check_independent.py`）、Traceipt（`traceipt-verify`）、TrustBench（`verify-receipt`） | ❌ 无 | 它是"第三方能独立验证"的唯一可证明形式；= 旧 N2 的前置条件 |
| N8 ❗ | **RFC 3161 合格时间戳** | Vaara（含 **eIDAS 合格 TSA**，且技术锚可自托管）、Vaultra、NovaFabric | ❌ 无 | 见 N1；**Vaara 把它做成"技术锚／法律锚可分离"两种 method** |
| N9 ❗ | **Vaara profile / OAP policy pack 的接入形态** | Vaara 明确欢迎下游只定义 evidence schema；OAP 策略包库开放 | ❌ 未开始 | 成为"对方规范里空着的那一环"比自研格式的边际价值更高 |
| **N10** ❗ | **单文件断网验证器**（浏览器直接验、收据不出本机） | **Vaara Resin**——单 HTML、WebCrypto、断网可用，原文 "verification is not a service and Vaara is not a party to it" | ❌ 无 | 这是"零出境"最彻底的证明形式；**我们的支柱 3 叙事缺这一块就说不圆** |
| **N11** ❗ | **独立重铸 / 逐字节复现**（第二个实现仅凭规范化规则重现签名载体） | **Vaara v1.14.0 independent re-mint**；50 套公开一致性套件 | ❌ 无 | "独立实现能复现"的最强形式，比"有 checker"更硬 |
| **N12** ❗ | **发布节奏**（对手 5 个月从建仓到 v1.50.0） | Vaara 2026-04-20 建仓 → 2026-09 v1.50.0 | ⚠️ 见 §一 排序原则 | 不是能力差距而是**节奏差距**；可见性与可验证性工程不能继续排最后 |
| **N13** ❗ | **MPP provider 与结算校验** | **AWS（B3，已 GA 支持 MPP）** / Stripe + Tempo 规范 | ❌ 只有 `segments.tx.protocol` 接缝 | ⚠️ **AWS 已 GA 支持 MPP，就是我们预留接缝时写的"等规范和真实需求"里的那个需求信号。** 且 AWS 在协议广度上领先我们一个身位 |
| **N14** ❗ | **x402 `upto` scheme 支持** | **AWS（GA 时引入）** | ❌ 无 | `upto` = 先授上限、按实际用量结算。**报价漂移策略正是它缺的那个校验**——这是我们对 AWS 唯一可正面宣传的功能性差异 |
| **N15** ❗ | **外部授权引用 + 外部控制面授权导入** | **AWS AgentCore payment session** / 钱包方 grant | ❌ 无（`mandateId` 仅是本地标识） | 控制面开始属于别人。**没有这个字段，证据层无法覆盖别人编排的支付**——也就无法成为"站在 AgentCore 后面"的那一层 |

> 📌 **N6 = 原支柱 2。** 它从"我们独有的卖点"变成了"必须补上的工程差距"。**N7 是 N2 与 N6 的共同前置条件**——审计师要能独立验证，就必须有向量和独立 checker。
>
> 📌 **N1/N8 应优先于 P1–P3 的其他项**——它们是 `commercialization.md` §四"卖审计报告"能否成立的前提。**证明得再严谨，如果审计师拿不到一份能归档、能用 eIDAS 时间戳定时的东西，商业层就是空的。**

> 📌 **N3 的修订（2026-09-17）**：原先把"Monad 测试网"整体写成差距。**选了 Monad 是刻意的**（配合 Monad 黑客松），而且与该链的高吞吐定位对齐——**agent 小额支付正是唯一真正需要那个吞吐量的工作负载**。真正的技术债只有"链是硬编码的"这一条，见 [architecture-gaps.md](./architecture-gaps.md) §D1。
>
> 测试网锚定确实不产生证据价值（区块时间不是外部权威），但**黑客松期间不需要解决**。主网或在 RFC 3161 那一档（N1/N8）是黑客松之后的事。
>
> 📌 **N6–N9 的紧迫性来自标准侧而非产品侧**：Vaara 的草案 4 天内从 `-08` 走到 `-10`，并已在 §11 点名四篇独立收敛的工作。**它的 profile 注册表是开放的接入点，但窗口不会一直开着。**

---

## 三、战略收敛：修订后的三根支柱

> ⚠️ **重要修订一**：Pieverse 的 ERC-6551 Agent 授权（"从用户既有钱包操作，带可编程消费限额和到期时间"）**已在链上做到用户授权的消费限额**。因此支柱 1 不能再说"无人在做"，必须换口径。
>
> ⚠️ **重要修订二（2026-09-17 第四次，更严重）**：学术与标准层已经收走支柱 1 与支柱 2。**OAP**（arXiv 2603.20953）以签名 passport + 21 个策略包 + fail-closed + 签名拒绝 + 6 框架集成 + 线上 CTF 数据占据了"执行前确定性授权"；**Vaara Receipt**（`draft-sirkkavaara-vaara-receipt-10`）以 `seq` + 签名 `runningCount` + 封存记录 + RFC 3161 锚占据了"非省略证明"，**且比我们更完整**。详见 [standards-landscape.md](./standards-landscape.md)。
>
> **下面的支柱表述据此刻意改为"我们守住的是哪一格"，而不是"我们有什么"。**

### 支柱 1（修订）：链上表达不了的约束 + 拒绝留痕 + **凭据由用户自签**

承认两个对手在各自覆盖范围内强制力更强——**ERC-6551** 在合约层强制（> 本地校验），**OAP** 在框架层强制且已有 6 个生产集成。Ledgeroot 守的是它们守不住的部分：

| 约束 | 为什么别人难做 | Ledgeroot 现状 | 对手状态 |
|---|---|---|---|
| **报价漂移** | 需要对比 402 报价与实际扣款 | ✅ `quoteDrift` 策略 | OAP 无支付语义 |
| **对手方白名单（host 维度）** | 链上只知道地址，不知道 host | ✅ `counterpartyWhitelist` | OAP 有 `allowed_domains`（⚠️ 已部分覆盖） |
| **按端点的限速** | 链上无法表达"每端点每窗口调用次数" | ✅ `endpointRateLimit` | ⚠️ OAP 有 `max_calls_per_minute`（粗粒度） |
| **组合攻击（累计上限）** | — | ✅ 有累计上限 | ⚠️ **OAP 明确承认防不住 structuring**，v1.1 才加 |
| **拒绝留痕** | 链上不记录"被拦下的尝试" | ✅ 拒绝也生成收据 | ⚠️ **OAP 已有签名拒绝 + reason code** |
| **凭据由用户自签** | OAP 的 passport 由**注册表签发**；Vaara 的 grant 来自 **credential broker** | ✅ EIP-712 本地签名，私钥不出本机 | ✅ **仍独有** |
| **链无关凭证** | ERC-6551 绑定 EVM/单链 | ✅ EIP-712 domain 刻意不含 chainId | — |
| **本地确定性 + 零出境** | OAP 默认走云端注册表与判定服务 | ✅ 毫秒级、零网络 | ✅ **仍独有（见支柱 3）** |

### 支柱 2（修订）：完整性 —— ❌ **不再是我们独有的，必须改为"接入并达标"**

> ⚠️ **本节原写"这是标准层面的空白"。** 该结论**已被 Vaara Receipt §6.4 推翻**：它有 `seq` + 签名 `runningCount` + 显式封存记录 + 对计数打 RFC 3161 锚，还带公开一致性向量与不 import 签发方代码的独立 checker。

- ✅ 仍然成立：x402 草案测试 3.2.4 确实承认"遗漏不影响单张签名有效性"，"能证明没漏比每张都签名更硬"这个判断没错
- ❌ 不再成立：**"Traceipt 亦无此能力 → 这是标准层面的空白"**
- 现在的问题是**工程差距**而非概念空白：

| | Vaara | Ledgeroot |
|---|---|---|
| 漏发检测 | 逐条 `runningCount` | 逐 epoch Merkle 根 |
| 尾部截断 | 显式封存记录 | 隐含 |
| 缺口最坏情况 | `maxClass` | ❌ |
| 独立 checker | ✅ 公开向量 + `_check_independent.py` | ❌ |

→ **动作：按 Vaara §6.4 实现，而不是继续自研。** 见 §2.4 的 N6–N9 与 [standards-landscape.md](./standards-landscape.md) §七。

### 支柱 3（修订）：证据主权 —— ⚠️ **不再是我们独有的**

> ⚠️ **第四次修订二更正**：本节原写"Coinbase / TrustBench / Black_Wall 结构上做不到"。**Vaara 已经做到了，而且比我们更彻底。**

- 本地 SQLite、无服务器、零网络、零外泄 —— 做法没错
- Coinbase / TrustBench / Black_Wall **结构上做不到**（必须看见流量才能变现）—— ✅ 仍成立
- Pieverse **方向相反**（TEE 托管钱包 + Facilitator 生成收据 + 存 Greenfield）—— ✅ 仍成立
- PEAC 做得到但没有强制力 —— ✅ 仍成立
- ❌ **Vaara**：官网首行 *"Open source. **No SaaS. No telemetry. No signup.**"*；**单 HTML 断网验证**且收据不出标签页；原文 *"The evidence does not depend on the vendor; that is the point of the design."* —— **这是自托管 + 零出境 + 无厂商依赖的完整实现**

| | Vaara | Ledgeroot |
|---|---|---|
| 自托管 | ✅ | ✅ |
| 无 SaaS / 无遥测 | ✅ 明示 | ✅ |
| 断网可验证 | ✅ **单 HTML 文件** | ⚠️ CLI 本地读 SQLite |
| "验证不是一项服务"的表述 | ✅ 明写 | ❌ 无 |
| 牵引 | ≈2,164/周 | 0 |

→ **动作：补 N10（单文件断网验证器）。** 在补齐之前，"本地优先"是**平价而非优势**，不能再用作差异化定位。

### 词汇纪律（必须遵守）

| ❌ 不要用 | ✅ 改用 | 原因 |
|---|---|---|
| 预行动闸门 / pre-action gate | **用户签名的确定性强制** | 已被 Black_Wall 与 arXiv TrustBench 占据 |
| 收据 / signed receipt（单独用） | —— **已失效，见下** | "签名收据"已商品化 |
| **完整性证明 / 非省略证明**（作为独有卖点） | **按 Vaara §6.4 实现并达标** | ⚠️ **已被 Vaara 占据且更完整，不能再说"我们有"** |
| **本地优先 / 零外泄**（作为独有卖点） | **支付专用的用户签名授权 + 零出境** | ⚠️ **已被 Vaara 占据，只剩平价** |
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

> ✅ **已完成（2026-09-17）**。
> 实现：新增 `src/receipt/signing.ts`，用 `node:crypto` 的 Ed25519（零依赖；实测 WebCrypto 在该环境不可用）。
> **签的是 `receiptHash` 而不是收据本身**——因为哈希链、epoch Merkle 根、签名三者因此提交到同一个值，一处承诺贯穿全线。签名覆盖 `canonicalJson({ payload: { receiptHash }, protected })`，`alg`/`kid` 落在被签字节内。
> `kid` 用 **RFC 7638 JWK thumbprint**（`base64url(sha256({"crv":"Ed25519","kty":"OKP","x":...}))`）——标识由密钥本身派生，无需注册表也不会与密钥漂移。
> 密钥边界（原 Q2）：新增 **`LEDGEROOT_SIGNING_KEY`**，**刻意不回落**到 `LEDGEROOT_PRIVATE_KEY`——支付密钥动钱，签名密钥只做陈述，互不兼任。dry-run 下回落到一次性密钥以保持演示自洽。
> 验证语义：未签名 / 验证方不持有该 `kid` → `incomplete`；签名不符或 `alg` 非 `EdDSA` → `tampered`。
> 发布面：`ledgeroot jwks` 导出 JWKS；`exportEvidence` 的证据包内附 `keys`，第三方无需连回即可验签。
> 验证：新增 `test/signing.test.ts`（9 个用例）与 `test/receipt.test.ts` 的归因组（4 个用例），含**"内容被改并重新哈希后链校验通过、只有签名能发现"**这一关键用例。78 个测试全过。

- **为什么**：D2 是"证据引擎"最根本的缺口。没有签名，收据只证完整性不证来源。
- **做什么**：
  - 采用与业界一致的封装：JWS 式 `{ protected: { alg: "EdDSA", kid, typ }, payload, signature }`
  - **签名覆盖 `canonicalJson({ payload, protected })`** —— 使 `alg` / `kid` 落在被签字节内，防算法混淆
  - 公钥以 **JWKS（Ed25519 OKP）** 发布
  - 签名密钥与锚定密钥分离（见 P0-6）
- **涉及**：`src/types.ts`、`src/receipt/builder.ts`、新增 `src/receipt/signing.ts`、`test/receipt.test.ts`
- **验收**：篡改任一字段 → 验签失败；替换 `alg` 或 `kid` → 验签失败
- **参考实现**：Traceipt `src/index.mjs` 的 `verifyEnvelope`
- ⚠️ **行为变化（非破坏性 API，但是可见变化）**：未配置 `LEDGEROOT_SIGNING_KEY` 时收据不签名，`verify` 会从 `verified` 变为 `incomplete`。这是刻意的——无法归因的证据不该报 `verified`。

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

> ✅ **已完成（2026-09-18）**。
> 实现：`owner` + `onlyOwner`，owner 在 constructor 中一次性确定；constructor 拒绝 `address(0)`——否则该合约永久无法锚定且没有退路，部署就该 revert，而不是留下一个静默拒绝一切的合约。
> owner 取**锚定钱包**而非部署者：`deploy/monad.ts` 从 `LEDGEROOT_PRIVATE_KEY` 推导，即 `Anchorer` 实际提交所用的 key，因此用另一把 key 部署仍得到一个该 key 能写入的合约。`anchorAbi` 相应补上 constructor 项。
> 已部署 `0xc0234ea7e3af77e5ae686caff62ff88eaccd8c30`（Monad testnet，block 63511816），owner `0x055A…A8f7`；链上 runtime bytecode 与 `forge build` 产物逐字节一致。
> 附带修掉部署路径上两个 bug：`readFoundryBytecode` 无条件加 `0x` 前缀（forge 本就带前缀）→ 实际发出 `0x0x…`，节点回 `eth_estimateGas: Invalid parameters`（看着像节点问题，其实是字符串问题）；`deployAnchor` 返回的是交易哈希而非合约地址。
> 验证：`forge test` 5/5，含「非授权地址回滚」与「越权替换后 root 与计数器都不动」。

- **为什么**：D6。x402 草案攻击 A4 已把 permissionless 锚定判为可伪造，且建议生产环境默认用 permissioned。
- **做什么**：
  - `anchor()` 加 `onlyOwner` 或记录提交者身份 —— ✅ 已做（`onlyOwner`）
  - 事件中 `epoch` 序号的隐私风险（对照草案攻击 A7）—— ⚠️ **已评估，判定不移除**：`Anchored` 事件每次锚定发一条，任何人数一下事件条数得到的就是同一个数字，且 `lastEpoch` 本身是 `public` getter——把字段从事件里删掉只是把同一个数从两个出口减到一个，观察者零成本还原。草案那条是 `receiptCount`（批次大小），**没有别的字段能推出**，所以那边删了是真删。Ledgeroot 这边「锚定活动可被观察」是锚定本身固有的（除非少锚或合并锚），不是 `epoch` 字段造成的。
- **涉及**：`contracts/src/LedgerootAnchor.sol`、`contracts/test/LedgerootAnchor.t.sol`、`src/anchor/anchorer.ts`、`deploy/monad.ts`
- **验收**：非授权地址调用 `anchor()` 回滚 —— ✅ 已由 `test_RevertWhen_NonOwnerAnchors` 覆盖

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

### P0-9. 收据先于结算写入 ⭐ 新发现（架构评估），最高优先

> ✅ **已完成（2026-09-17）。** 实现与验证见 [architecture-gaps.md](./architecture-gaps.md) §1.1。
>
> **实现要点**：链外新增 `payment_intents` 表，在**动钱之前**用 `requestId` 占位；占位失败（说明上一次尝试的结果未被记录）→ **拒付并记一条 denied 收据**；结算成功写库后释放占位。
>
> ⚠️ **本节原先的修法（"先写 pending 收据再更新为 paid"）做不到**——`buildReceipt` 把 `id` 定义为内容哈希，改 `status` 就会改哈希，下一张收据的 `prevHash` 会指向不存在的哈希。链是 append-only 的，预写记录只能在链外。
>
> **验证**：真实进程死亡（结算后 `exit(9)`，收据未写）→ 新进程用同一 `requestId` 重试 → **轨道未被再次调用**，返回 denied。测试 **85 passed**。

> ⚠️ **与生态位无关也必修。** 这是**丢钱 + 丢证据**，而且丢的正是产品声称要防的事。详见 [architecture-gaps.md](./architecture-gaps.md) §A1。

**现状**（`src/tools/pay.ts` 已付路径，逐行核实）：

```ts
const payment = await services.payments.pay(quote);   // :204  ← 钱在这里动了（/verify + /settle 两次网络往返）
const segments = buildSegments(...);                  // :206
const receipt = buildReceipt({ ... prevHash });       // :215
record(services, receipt);                            // :227  ← 收据在这里才落库
```

**204 与 227 之间存在窗口：钱已结算，收据未写。** 窗口内崩溃的后果：

1. 钱动了，没有任何记录
2. 幂等键 `requestId` 只在本地库（`getReceiptByRequestId` 查的就是那张还没写的表）
3. agent 重试 → 幂等检查查不到 → **再付一次**

> 📌 **同一个文件里已有正确做法**：三条拒绝路径（`:121` / `:144` / `:180`）都是**先 `buildReceipt` 再 `record`**——因为拒绝时没有钱要动。**问题只出在已付路径。**

- **做什么**：已付路径拆成两步——先写一条 `pending` 收据（**含 `requestId`，在动钱之前**），结算成功后再更新为 `paid` + `txHash`
- **备选**：把 EIP-3009 的 `nonce` 持久化做上游幂等（`facilitator.ts` 已随机生成，但未落库）
- **涉及**：`src/tools/pay.ts`、`src/store/db.ts`（`pending` 状态与更新路径）、`src/types.ts`（`ReceiptStatus`）、`test/pay.test.ts`
- **验收**：模拟"结算成功但写库前崩溃"，恢复后重试**不会**重复付款；`verify` 能识别遗留的 `pending` 收据

### P0-10. `seq` 交给 SQLite 分配 ⭐ 新发现（架构评估）

> ✅ **已完成（2026-09-17）。** 实现与基准见 [architecture-gaps.md](./architecture-gaps.md) §A2。
>
> ⚠️ **原判断（"跨进程会撞号"）实测不成立。** 那条 `INSERT` 是单条 SQL 语句，SQLite 持有写锁，子查询与插入原子——两个连接交错追加 400 行，`seq` 零重复。
>
> **真实问题是性能，而且更严重**：`seq` 上没有索引，`SELECT MAX(seq)` 每次插入都要**扫全表**（而每行都存着完整 `receipt_json`）：
>
> | 行数 | 修复前 | 修复后 |
> |---|---|---|
> | 5,000 | 84 µs | **41 µs** |
> | 25,000 | 518 µs | **48 µs** |
> | 50,000 | **5,576 µs** | **53 µs** |
>
> **10 倍数据 → 66 倍单次成本。** 50k 行时每笔支付光插入 5.6 ms，而这是每个 agent 调用都要走的路径。
>
> **改法**：`seq` 变成 **rowid 别名**（`INTEGER PRIMARY KEY AUTOINCREMENT`），`id` 降为 `NOT NULL UNIQUE`；SQLite 自己分配，不扫描，且唯一、单调、不复用。主键改型需**重建表**（建→拷→删→改名，一个事务），`seq` 值按追加顺序重编号而不拷贝。旧的 `backfillReceiptSequence()` 已删除。
>
> **验证**：新增 3 个用例（中间形态重建保序、`seq` 必须是 rowid 别名、`seq` 从 1 连续）。全库 **88 passed**。

**现状**（`src/store/db.ts` `appendReceipt`）：

```sql
INSERT OR IGNORE INTO receipts (seq, ...)
VALUES ((SELECT COALESCE(MAX(seq), 0) + 1 FROM receipts), @id, ...)
```

两个问题叠加：

1. `better-sqlite3` 在单进程内串行化这个读-写，但**两个进程并发时会读到同一个 `MAX(seq)`** → 重复 `seq`
2. **`INSERT OR IGNORE` 按 `id` 去重（`id TEXT PRIMARY KEY`），`seq` 上没有唯一约束** → 撞号不会被挡住

后果：重复 `seq` → `listReceipts` 顺序不稳定 → `prevHash` 比对失败 → **报 `tampered`**。

- **做什么**：`seq` 交给 SQLite（`INTEGER PRIMARY KEY AUTOINCREMENT` 或直接用 `rowid`），应用层不再计算；叠加 `UNIQUE` 兜底
- **涉及**：`src/store/db.ts`（建表 + 迁移 + `appendReceipt`）、新增并发写入回归测试
- **验收**：两个进程并发追加不同收据，`seq` **无重复**；`verify` 恒为 `verified`
- ⚠️ **注意与 P0-8 的关系**：P0-8 选择了"新增 `seq` 列 + 迁移"方案。本条是它的收尾——**既然引入了 `seq`，就必须保证它唯一且单调**，否则只是把一个不确定性换成了另一个。

---

## 五、P1：核心差异化

> P0 修完后再做。这一层决定 Ledgeroot 是"另一个收据工具"还是"唯一能做这三件事的系统"。

### P1-1. 完整性证明产品化（支柱 2）

> 🚧 **部分完成（2026-09-18，0.4.0）**：`merkleProof` / `verifyMerkleProof` 已实现（RFC 6962 §2.1.3 审计路径），并带交叉验证测试——对 size 1–33 的**每个**叶子，用 §2.1.2 栈式算法独立算出的根校验，避免"证明与验证器互相印证同一个错误"。另加 `listMandateRecords()`（列出全部 mandate 含撤销状态）。
> ✅ **接入完成（2026-09-18）**：逐张包含证明已接进 mandatekey 的证据包与包内 `verify.mjs`（篡改任一证明路径即报 `tampered` 且可定位到收据）。
> **仍未做**：`ledgeroot` 本体的 CLI / `ledgeroot_verify` 仍未输出或校验逐张证明；"缺口检测"语义与 `maxClass` 那一档。

- **做什么**：
  - 把"哈希链 + epoch 根 ⇒ 序列无缺口"从实现细节变成**显式可验证的声明**
  - 新增能力：给定一个 epoch 的收据集合，能证明**没有收据被省略**
  - 为每张收据生成 **Merkle 包含证明**（目前 `merkle.ts` 只有 `merkleRoot`，没有 proof 生成/验证）
  - 明确"缺口检测"语义：序号连续性 + 链回指 + 根比对三层
- **涉及**：`src/anchor/merkle.ts`（加 `merkleProof` / `verifyMerkleProof`）、`src/verify/verifier.ts`、`src/tools/receipts.ts`
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

### P1-5. 索引与热路径（架构评估新增）

> 依据 [architecture-gaps.md](./architecture-gaps.md) §B1。**全库没有一个 `CREATE INDEX`。**

**现状**：每一次 `ledgeroot_pay` 跑 4 次未索引全表扫描，其中两次（`cumulativeSpent` 按 mandate+status、`callTimestamps` 按 endpoint）**还会 `JSON.parse` 整个匹配集**。单笔 O(n) → 一个月 O(n²)。**100 万条时每笔支付要反序列化上百万个对象——这不是"慢一点"，是跑不起来。**

- **做什么**：为 `request_id`、`mandate_id`、`endpoint`、`status`、`seq` 建索引；`listReceipts` 加分页（`LIMIT`/游标）；避免在热路径上加载全量收据
- **涉及**：`src/store/db.ts`（建表 + 迁移）、`src/tools/pay.ts`（改为定向查询）、`src/tools/receipts.ts`
- **验收**：10 万条收据下，单笔 `ledgeroot_pay` 的本地耗时**不随表增长**（基准测试）

### P1-6. 对账与聚合层 ⭐ 生态位的产品本体

> 依据 [architecture-gaps.md](./architecture-gaps.md) §B1 与 [commercialization.md](./commercialization.md) §三 §四。**这是 §零 定义的生态位里唯一能收费的那一层，目前完全不存在。**

**现状**：全库**没有一处 SQL 聚合**（无 `GROUP BY` / `SUM` / `COUNT`）。唯一的"按维度分组"是 `mandatekey/components/timeline.tsx` 里对已全量加载的数组做客户端 `Map` 分组——UI 便利，不是聚合。**无异常/趋势检测，无 ERP/对账导出**（两条导出路径都是审计证据包：原始收据 + Merkle 证明 + 公钥）。

- **做什么**：
  - 按对手方 / 按 agent / 按任务 / 按时间桶的**聚合查询**
  - **可下钻**：从聚合数字回到单张收据
  - **对账导出**：能进 ERP 的数据结构（不是审计证据包）
  - **异常视图**：谁在涨、哪条策略拦得最多
- **演示场景（对应 `demo场景清单` §二 第 6 项「多笔微支付聚合对账」）**：平台账单 vs 本地收据逐笔核对，在「每笔一张收据、哈希链串联」的前提下给出聚合对账视图（笔数 / 金额 / 对手方 / 时间桶 + 可下钻到单张收据）。⚠️ **该场景为赛后交付**——黑客松 demo 只用已实现的 `taskId` 分组展示「N 笔 / 总额 / 拦截数」，完整的聚合查询、对账导出与下钻由本条交付。
- **涉及**：新增聚合模块；`mandatekey/app/api/` 新增路由；`src/store/db.ts` 的查询层
- **验收**：100 万条收据下，月度聚合在**秒级**返回；导出的结构能被真实财务/AP 人员读入
- ⚠️ **前置**：本条依赖 **C1 的设计决定**（见 §十）——元数据集中到什么程度，决定聚合层的数据模型
- ⚠️ **同时依赖 P1-7**：聚合的可信度建立在"能证明没漏"之上

### P1-7. 增量验证 + 完整性的承重作用（架构评估新增）

> 依据 [architecture-gaps.md](./architecture-gaps.md) §B2 与 §C1。

**现状**：`verifyReceiptChain` 遍历**每一条**收据逐条重算 SHA-256 与 Ed25519；**无增量、无检查点**。100 万条 = 100 万次验签/每次运行。`verify --check-chain` 更糟：**每笔已付收据 2 次 RPC，且 `Promise.all` 无并发上限**——会打爆节点并撑爆内存。

- **做什么**：
  - 增量验证：记录"上次验到第几条"，从检查点继续（锚定边界可复用）
  - `--check-chain` 加**并发上限**与分批
- **验收**：验证耗时可从上次检查点续算，而非从头
- ⭐ **关键认识**：**这一条与 N6（held-set completeness）是同一件事，而理由从"对标对手"变成了"我们自己的架构承重墙"。**
  - 生态位的产品是**跨 fleet 的聚合**，而聚合需要把 N 个 agent 的数字汇到一处（见 C1）
  - **如果每个 agent 锚定的是 `(receiptCount, root)`，控制面不需要看到任何收据，就能验证"这个 agent 报的聚合数字没有漏"**
  - **没有完整性证明，分布式聚合只能"相信 agent 上报的数字"** —— 而那是 §零 生态位里最不能接受的事
  - → **N6 因此不只是竞品对齐项，它是 P1-6 能否成立的前提。** 见 §2.4 的 N6 与 [standards-landscape.md](./standards-landscape.md) §二

### P1-8. 协议与接口补齐：MPP、x402 `upto`、外部授权引用（2026-09-18 新增）⭐ 优先级高于 P1-5 / P1-6

> **触发来自 AWS**（依据 [aws-agentcore-payments-analysis.md](./aws-agentcore-payments-analysis.md) §7.2），**但性质不是竞品对齐，而是覆盖面**：这三项决定**我们的证据层能不能覆盖别人编排的支付**。AWS 已经 GA 了一个占住我们能力面的产品，而它——以及 MPP 规范本身——的编排会继续扩散。
>
> **一句话说明它为什么是 P1 而不是可有可无**：**x402 之外的轨道、按量结算的报价、别人签发的授权，这三样现在都不在我们的证据覆盖范围内。** 缺了它们，Ledgeroot 只能给"我们自己发起的 x402 支付"出证据，而生态位的现实正在变成"支付由别人编排"。

**A1. MPP provider 与结算校验**

- **现状**：`segments.tx.protocol` 维度已存在，`verifySettlement` / `checkSettlement` 对非 x402 一律报 `incomplete`（[architecture-gaps.md](./architecture-gaps.md) §七 的接缝）。
- **为什么现在**：**AWS 已 GA 支持 MPP。** 我们预留接缝时写的条件是"等 MPP 规范与真实需求"——**需求信号到了。**
- **做什么**：读 MPP 规范全文 → 实现 `MppPaymentProvider`（`PaymentProvider` 接口已在 `src/x402/facilitator.ts`）→ 实现 `mpp` 的结算校验，替换两处 `incomplete` 分支。
- **涉及**：`src/x402/facilitator.ts`、`src/verify/verifier.ts`、`src/verify/onchain.ts`、`src/types.ts`、`src/tools/pay.ts`
- **验收**：MPP 收据验证返回 `verified` 而非 `incomplete`；**未知协议仍报 `incomplete`**（不能为了支持新协议放宽旧纪律）。
- ⚠️ **前置：Q9 必须先定。**

**A3. x402 `upto` scheme 支持**

- **做什么**：接受 `upto` 报价；把**上限**与**实扣**分别记进 `segments.plan.quote`；报价漂移对**上限**判定而非固定报价。
- **涉及**：`src/policy/defaults.ts`（`quote-drift`）、`src/tools/pay.ts`、`src/types.ts`（`segments.plan`）
- **验收**：`upto` 场景下"实扣 > 上限"被拒、"实扣 ≤ 上限"放行，且上限与实扣**都留在收据里**。
- **战略意义**：`upto` 把"先授上限、按量结算"做成一等公民，**而报价漂移正是它缺的那个校验**。这是我们对 AWS 唯一可正面宣传的功能性差异。

**A4 / A5. 外部授权引用与外部控制面导入**

- **做什么**：`segments.mandate` 增加**外部授权引用**字段（如 `externalRef`）；新增一种"外部授权"导入形态（仿 `ledgeroot_mandate_import` 的 AP2 路径）。
- **涉及**：`src/types.ts`、`src/mandate.ts`、`src/tools/mandate.ts`、`src/consistency.ts`（一致性分析要能读外部引用）
- **验收**：一份由**外部控制面**（AWS session / 钱包方 grant）授权的支付，其收据能引用该授权，**且仍能被我们的五条策略再校验一遍**——这才是"站在 AgentCore 后面补它没有的对手方绑定"的具体形态。

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
| **M2 — 不可替代** | P1 全部完成 | 能演示"删除一张收据 → 验证报错"；第三方可在无网络环境独立验证一张收据；**MPP 与 x402 `upto` 的支付都能出收据并验证为 `verified`（而不是 `incomplete`）** |
| **M3 — 可见** | P2 全部完成 | 出现在 Bazaar / Agentic.Market / MCP Registry；PEAC L3 兼容 |
| **M4 — 被引用** | P3 启动 | 收据规范公开；可复现基准发布 |

---

## 十、待定决策

| # | 决策 | 影响 | 状态 |
|---|---|---|---|
| **Q1** | **P0-1 的 Merkle 变更是破坏性的 —— 是否保留向后兼容？** | 决定是否需要收据 schema 版本升级与迁移路径 | ✅ **已答（2026-09-17）：采用破坏性升级。** 实现见 P0-1。**遗留：版本号决策未定 —— 破坏性变更按 semver 应升到 `0.2.0`（当前 `0.1.2`），且 MandateKey 依赖 `ledgeroot@^0.1.2`，需同步** |
| **Q2** | 签名密钥与锚定密钥是否分离？ | 安全边界设计 | ✅ **部分已答（2026-09-17）**：P0-2 新增独立的 `LEDGEROOT_SIGNING_KEY` 用于收据签名，且**不回落**到支付密钥。**锚定密钥是否也独立，留待 P0-6 一并定** |
| **Q3** | 独立验证器包放本仓库 monorepo 还是独立仓库？ | 分发与版本节奏 | 待定 |
| **Q4** | facilitator 多路化的目标链优先级？（Base / Solana / BNB） | 工作量与生态契合度 | 待定 |
| **Q5** | 支柱 1 的对外表述最终定稿？ | 全部文案 | 待定 |
| **Q6** | **P0-8 的排序修复用哪个方案？**（新增 `seq` 列 vs 依赖 `rowid`） | 是否做 schema 迁移 | 待定，推荐方案 A |
| **Q7** 🎯 | **零外泄 vs 聚合的边界在哪里？**（架构评估新增，见 [architecture-gaps.md](./architecture-gaps.md) §C1） | ⚠️ **决定控制面 schema 与 P1-6 的数据模型** | **待定——但必须在 P1-6 之前决定，否则返工** |
| **Q8** | **现在上多写 / 多租户，还是先做单 agent？** | ⚠️ 决定 `seq` 分配与访问层要不要现在重做（见 P0-10、`architecture-gaps.md` §B3 §B4） | 待定，**越晚越贵** |
| **Q9** 🎯 | **MPP Sessions 下的 epoch 边界语义是什么？**（N:1 结算 vs 当前按 `receiptCount` 切片、假定每张收据彼此独立） | ⚠️ **决定锚定与完整性证明在 MPP 下是否还成立**；也决定无链上交易的收据如何进入 Merkle 树 | **待定——必须在 P1-8 的 A1 之前定，否则返工**（[architecture-gaps.md](./architecture-gaps.md) §7.4 已预警同一处碰撞） |

> 🔴 **Q7 是当前最关键的未决项。** `commercialization.md` §零 的产品是"跨 fleet 的账"，而架构是"每 agent 本地一个 SQLite"——**跨 fleet 聚合需要把 N 个 agent 的数字汇到一处，而"一处"就是服务器**，这与"零外泄"和"控制面只看元数据"的设计原则存在张力。三条候补方案（元数据集中 / 收据复制 / 每 agent 自算 rollup + 锚定链接）见 [architecture-gaps.md](./architecture-gaps.md) §C1，**推荐第三条**，因为它同时保住了零外泄与可验证性。
>
> 🔴 **Q8 的代价随时间上升**：`seq` 分配（P0-10）与单写进程（`better-sqlite3` 同步阻塞）在单 agent 下无害，在舰队下会直接崩。**如果目标确定是舰队形态，这两条现在改比以后改便宜一个数量级。**

---

## 十一、监控触发条件（定期复核）

| 触发 | 含义 | 应对 |
|---|---|---|
| **AWS AgentCore payments 引入签名收据 / 离线验证 / 锚定** | ⚠️ **最高级别警报**：我们的证据面差异在分发层被抹平 | 重估定位 |
| **AWS Marketplace 上架第三方证据层** | ✅ **OEM 窗口打开** | 主动接触 |
| **AWS 支持对手方白名单 / payTo 绑定** | 最锋利的功能性差异被补齐 | 重估差异化 |
| **AWS 定价从服务订阅改为按交易金额抽成** | §零 的费率结构论证可能重新成立 | 重估生态位 |
| **PEAC 规范出现 anchoring / 完整性机制** | 支柱 2 被吸收 | 重新定位 |
| x402 官方采纳 `SettlementResponse.attestation` | 收据层载体化 | 加速 PEAC 接入 |
| BlueTier 的 Traceipt 增加非省略证明或用户签名授权 | 支柱 1/2 同时受威胁 | 评估差异化是否还成立 |
| BlueTier 的 Black_Wall 提供本地/自托管部署 | 支柱 3 受威胁 | 同上 |
| Pieverse 的收据脱离 BNB Greenfield、支持自托管 | 支柱 3 受威胁 | 评估其"证据主权"叙事 |
| Coinbase 发布官方证据层或跨 facilitator 路由 | 分发层向下挤压 | 评估止损或转向 |
| IETF vauban 草案进入 WG | 离线可验证成为正式标准 | 对齐或参与 |

---

## 附：与各文档的对应关系

| 本规划条目 | 来源 |
|---|---|
| **生态位（§一 第 0 条）** | **`commercialization.md` §零** —— 链上稳定币 × agent 小额 402 支付 |
| P0-1 ~ P0-8 | `threat-landscape.md` §四 C1 源码核验表、§九 防御清单 |
| **P0-9 / P0-10** | **`architecture-gaps.md` §A1 §A2 —— 与规模无关的真 bug** |
| **P1-5（索引）** | **`architecture-gaps.md` §B1** |
| **P1-6（对账与聚合层）** | **`commercialization.md` §三 §四 + `architecture-gaps.md` §B1** |
| **P1-7（增量验证）** | **`architecture-gaps.md` §B2 §C1** |
| **Q7 / Q8（待定决策）** | **`architecture-gaps.md` §C1 §B3 §B4** |
| 支柱 1 修订 | `threat-landscape.md` §五 x402b 条目（ERC-6551 挑战） |
| 支柱 2 | `threat-landscape.md` §四 A2（x402 草案测试 3.2.4） |
| 支柱 3 | `threat-landscape.md` §七 半衰期表末三行 |
| 词汇纪律 | `threat-landscape.md` §七 用词警告 |
| P2-3 PEAC 接入 | `threat-landscape.md` §二 A1、§九 接入清单 |
| P2-2 生态提交 | `threat-landscape.md` §三 B1 |
| 非目标前六条 | `trustbench-competitive-analysis.md` §六、`threat-landscape.md` §八 |
| 非目标后三条 | `commercialization.md` §六 |
| **P1-1 的优先级** | `commercialization.md` §四 —— **完整性证明同时是商业论点本身，不是 nice-to-have**；⭐ **并见 P1-7：它还是分布式聚合的承重墙** |
| **P1-2 的必要性** | `commercialization.md` §五 留缝 1 —— 第三方独立验证是"卖报告"的前置条件 |
| **N1–N12（§2.4）** | `standards-landscape.md` §二 §七、`vaara-competitive-analysis.md` §三 §七 |
| **N13–N15 / P1-8（A1·A3·A4·A5）/ Q9** | **`aws-agentcore-payments-analysis.md` §7.2** —— AWS Bedrock AgentCore payments GA（2026-08-18），一手来源 |
| **§一 第 12 条（护城河的 AWS 形状的洞）** | **`aws-agentcore-payments-analysis.md` §6.2** |

> **商业化对路线图的影响**：见 [commercialization.md](./commercialization.md)。
> ⚠️ **第六次修订更正**：此处原写"P1-1（完整性证明）的优先级被商业化逻辑进一步抬高 —— 它是**唯一可售的差异点**"。**该表述已失效**（Vaara v1.4.0 已产品化同类机制，见 [standards-landscape.md](./standards-landscape.md) §二）。
>
> **但它现在有两个不是"唯一性"的理由，而且都更强**：
> 1. **它是聚合层的承重墙**（P1-7）—— 没有"能证明没漏"，跨 fleet 的账就只能靠信任 agent 上报的数字
> 2. **它是零外泄与聚合之间的调和机制**（Q7）—— 每个 agent 锚定 `(receiptCount, root)`，控制面不必看到任何收据就能验证其聚合数字的完整性
>
> → **优先级不变，但理由从"别人没有"换成了"我自己的架构依赖它"。**
>
> 但商业化**不在本期启动**，只做"留缝"（`commercialization.md` §五）。
