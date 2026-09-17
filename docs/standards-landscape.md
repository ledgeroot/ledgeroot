# Agent 证据层 —— 学术与标准全景

> 调研日期：2026-09-17
> 最近修订：2026-09-17（第二次）—— ⚠️ **分类更正**：本文档初版把 OAP 与 Vaara 一并归入"学术界"，**这是错的**。两者都是**在售产品**（APort 有 $499/$4,990 月费，Vaara 有付费 pilot 与商业许可）。本节新增 §零 的分类更正、厂商定价与牵引数据，并作废 §六 的 R1
> 调研对象：2026 年 3–9 月的 arXiv 论文、IETF 草案、标准组织文件、以及在售产品
> 对比标的：Ledgeroot / MandateKey
> 调研方法：**一手读取** OAP 论文全文、Vaara Receipt draft-10 全文、Vaara 官网与仓库 README/LICENSING.md、NovaFabric 全文、arXiv TrustBench 全文；牵引数据经 PyPI Stats / npm registry API 直查；其余为摘要 / 检索片段 / 被引转述，**未读原文**（置信度见附录）
> 关联文档：[threat-landscape.md](./threat-landscape.md) · **[vaara-competitive-analysis.md](./vaara-competitive-analysis.md)** · [roadmap.md](./roadmap.md) · [commercialization.md](./commercialization.md) · [trustbench-competitive-analysis.md](./trustbench-competitive-analysis.md)

---

## 零、分类更正：这里混了两类完全不同的东西

初版把两份**厂商规范**当成了学术论文。这个混淆会导致严重误判——**学术论文给你思路，厂商规范抢你的位置。**

| 类别 | 成员 | 性质 | 应对 |
|---|---|---|---|
| **A. 厂商规范**（在售产品） | **APort / OAP**、**Vaara Receipt** | 公司拿 arXiv / IETF 当分发渠道，**有定价、有牵引、在抢标准位** | ⚠️ **正面竞争**。Vaara 详见 [vaara-competitive-analysis.md](./vaara-competitive-analysis.md) |
| **B. 学术论文**（无产品） | NovaFabric、TRACE、PCAS、AgentSpec、AgentGuardian、Safiron、Proof-of-Guardrail、SoK、Salfeld-Neggen、He & Yu | 真·论文，作者无商业化动作 | ✅ **思路来源**，几乎无商业威胁 |

**厂商侧的产品与定价（2026-09-17 核实）**

| | 形态 | 定价 | 周下载 |
|---|---|---|---|
| **APort** | 托管 SaaS：hosted enforcement、signed decisions、org audit、GitHub OIDC repo guard | Free / **$499/mo** Team / **$4,990/mo** Enterprise | **614**（npm `@aporthq/aport-agent-guardrails`） |
| **Vaara** | **AGPL-3.0 自托管**，明说 "No SaaS. No telemetry. No signup."；4 周付费 pilot、sponsor 档、闭源嵌入需商业许可 | 不公开（"scope and price agreed before work starts"） | **≈2,164**（PyPI 1,495 + npm 669） |

> 📌 **"BlueTier 是这一批里唯一有真实牵引的"这个判断必须改**（原见 `threat-landscape.md` §C1）：BlueTier 111/周，而 Vaara 是它的 **20 倍**、APort 是 **5.5 倍**。整份威胁排序的牵引依据需重做。

---

## 摘要

**Ledgeroot 自认最难被抄的两件事——"执行前确定性授权"与"非省略证明"——都已经被正式规格化，而且其中一件已经被产品化到 v1.50.0。**

- **支柱 1（用户签名授权 + 执行前确定性强制）**：由 **OAP / APort**（arXiv 2603.20953，2026-03-21）占据。签名凭证、21 个策略包、fail-closed 判定、带 reason code 的**签名拒绝记录**、覆盖 Claude Code 的框架钩子、**线上对抗测试场的实测数据**、托管定价 **$499/$4,990 月费**。
- **支柱 2（非省略证明）**：由 **Vaara Receipt** 占据，**且机制比 Ledgeroot 更完整**，**已在 Vaara v1.4.0 产品化**。其 §11 原文明确宣称"这些机制无人做过，本文两者都做了"。
- **支柱 3（证据主权）**：❌ **也被 Vaara 占住了**——"No SaaS. No telemetry. No signup."、断网单文件验证、证据不依赖厂商。**初版把它列为剩余真空是错的，见 §六。**

**时间线才是真正的信号**——从概念到带一致性测试向量的正式规范与产品，只用了 **6 个月**：

| 日期 | 工作 | 性质 |
|---|---|---|
| 2026-03-10 | arXiv 2603.09157 TrustBench（ASU + UCLA） | 论文：执行前实时信任验证（LLM-as-a-Judge 路线） |
| 2026-03-21 | **arXiv 2603.20953 OAP** | **厂商规范**：执行前确定性授权 + 线上 CTF 数据 |
| 2026-04 | arXiv 2604.15367 SoK | 论文：首个 agentic commerce 安全系统化综述 |
| 2026-04-20 | **Vaara 建仓** | **厂商产品**起点 |
| 2026-06 | arXiv 2606.26298 / 2606.20520 / 2606.11632 | 论文：机构证明 / 主权执行代理 / 主权保证边界 |
| 2026-07 | arXiv 2607.00245 | 论文：Agent-to-Agent 金融与信任 |
| 2026-09-02 → 09-04 | **Vaara Receipt `-08` → `-10`** | 4 天内两个版本，已带公开一致性向量 |
| 2026-09-11 | arXiv 2609.12582 NovaFabric | 论文：会话级可重放执行证据 |
| 2026-09（当前） | **Vaara v1.50.0，50 套一致性套件** | **建仓 5 个月** |

**这根"半衰期 6–12 个月"的估计是准的——但对三根支柱来说，它已经全部到期了。**

### 三根支柱的占位状态（2026-09-17）

| 支柱 | 文档原有表述 | 实际状态 | 占据者 |
|---|---|---|---|
| 1. 用户签名授权 + 执行前确定性强制 | "无人在做" | ❌ **已被占据**（规范 + 参考实现 + 线上实测 + 6 框架集成 + 定价） | **OAP / APort**、PCAS 等 |
| 2. 非省略证明（完整性） | "无人在做"，且是"唯一可以拿去卖的东西" | ❌ **已被占据且更完整，且已产品化** | **Vaara Receipt §6.4 / Vaara v1.4.0** |
| 3. 证据主权（本地 + 零外泄） | "无人在做" | ❌ **已被占据**（初版判断错误） | **Vaara**：自托管、无 SaaS、断网可验 |
| （附）链上锚定 | "已上线"算优势 | ⚠️ **可能是押错了**——对手用 RFC 3161 / Merkle log，合规接受度不低于链上 | Vaara、NovaFabric 均用 RFC 3161 |

---

## 一、支柱 1：执行前确定性授权 —— 已被占据

### 1.1 OAP（Open Agent Passport）—— 最直接的重叠

| 项 | 内容 | 置信度 |
|---|---|---|
| 出处 | arXiv **2603.20953**《Before the Tool Call: Deterministic Pre-Action Authorization for Autonomous AI Agents》，Uchi Uchibeke（**APort Technologies Inc.**，多伦多），2026-03-21，cs.CR | 高（全文） |
| 许可 | **Apache 2.0**；规范 DOI `10.5281/zenodo.18901596`；npm `@aporthq/aport-agent-guardrails` v1.0.15 | 高 |
| 核心概念 | **agent passport**——Ed25519 签名凭证，绑定"agent 身份 ↔ 授权能力域" | 高 |
| 强制点 | `before_tool_call` 阻塞钩子，**在框架层而非模型输出解析层**（prompt injection 无法绕过） | 高 |
| 判定 | `ALLOW` / `DENY` / `ESCALATE`（**ESCALATE 已定义但未实现**） | 高 |
| 策略 | **21 个 policy pack**：金融 5（charge/payout/refund/crypto trade/transaction）、数据 5、代码仓库 2、web 2、系统 1、消息 1、agent 生命周期 3、MCP 1、法律 1 | 高 |
| 凭证字段 | `capabilities[]`、`limits{allowed_domains, currency_limits{max_per_tx, daily_cap}, allow_pii, max_calls_per_minute}`、`canonical_hash`、`registry_sig`、`registry_key_id` | 高 |
| 发现面 | `/.well-known/oap/`（RFC 8615） | 高 |
| 保证等级 | L0 自述 / L1 邮箱 / L2 GitHub / L3 域名 / L4KYC / L4FIN | 高 |
| 框架集成 | OpenClaw、Cursor、**Claude Code `PreToolUse`**、LangChain、CrewAI（生产）；n8n（beta）；A2A（提议） | 高 |
| 形式化属性 | **Determinism / Completeness / Fail-closed / Non-bypassability / Auditability** 五条，配 Algorithm 1 与命题证明 | 高 |
| 信任假设 | 平台信任（框架真的调钩子）、实现信任（引擎确定性）、**密钥信任**——非绕过性只是"有平台信任前提的命题" | 高 |
| 性能 | 云 API p50 **53 ms** / p95 63 / p99 76；**本地评估 p50 174 ms** / p99 358（Python 子进程开销） | 高 |
| 标准动作 | 提议新控制类 **PAA-1…PAA-5**；映射 NIST AI RMF 与 SP 800-53（AC/AU/IA/SC/SI）；覆盖 OWASP Agentic Top 10 中的 8/10 | 高 |
| 利益披露 | 作者是 APort 创始人，CTF 由其运营 | 高 |

**实测数据（APort Vault CTF，2026-03）**

| 指标 | 值 |
|---|---|
| 总会话 / 总判定 | 1,151 / 4,437 |
| 拒绝数 | 2,419（54.5%） |
| 最高频拒绝码 | `oap.unknown_capability`（1,453）、`oap.merchant_forbidden`（412） |
| T1（宽松策略）社科工程成功率 | **74.6%**（788 次尝试，588 胜） |
| T5（严格策略）成功率 | **0%**（879 次尝试，全面拦截，$5,000 奖金无人领取） |

其结论一句话：**模型被说服了，策略引擎没有。**

**它自己声明的局限（对我们很重要）**

- **不形式化委派链**（多 agent 场景留到 v1.1）
- 策略是**静态**的，需人工维护
- **组合攻击（structuring）不能防**——逐笔评估，多笔小额可绕过累计上限；v1.1 才加滑动窗口
- 作用域限于 tool call 边界；不经工具调用的动作（直接渲染、检索、旁路）不在范围内
- **平台信任**——运行时被攻破则钩子可被完全绕过（建议用 TEE 证明补强）
- 规模仅 ~1,000 并发

### 1.2 同一条线上的其他工作（均未读原文）

| 工作 | 出处 | 内容 | 与 Ledgeroot 的关系 |
|---|---|---|---|
| **PCAS** | arXiv 2602.16708（Palumbo 等） | Policy Compiler for Secure Agentic Systems；**Datalog 派生的策略语言 + 参考监视器**；策略合规率 48% → 93% | ⚠️ OAP 自己承认"最直接可比的学术工作"。与 OAP 独立收敛到同一结论 |
| **AgentSpec** | arXiv 2503.18666 / ACM DOI 10.1145/3744916.3764546 | 轻量领域特定语言，为 LLM agent 指定与强制运行时约束 | 策略表达层 |
| **AgentGuardian** | arXiv 2601.10440 | 从执行轨迹**学习**上下文感知访问控制策略 | 换取适应性，放弃确定性 |
| **Safiron / AuraGen** | arXiv 2510.09781 | 用合成风险轨迹 + GRPO 训练守护模型，执行前筛查 agent 计划 | 干预点对，但**继承分类器的非确定性** |
| **Proof-of-Guardrail** | arXiv 2603.05786 | 用 TEE（AWS Nitro Enclaves）+ 远程证明，**证明护栏确实执行过** | 补的正是 OAP 的"平台信任"缺口；本身不强制策略 |
| **L-DREA** | Semantic Scholar（Gill & Lakhowal） | 确定性运行时强制架构，把 Anderson 1972 参考监视器**从数据访问推广到"外部有效动作"**，给出六条运行时不变式 | 理论地基 |
| **GuardAgent** | ICML 2025 | 独立 LLM agent 夹在目标 agent 与环境之间，逐动作生成并运行 Python 代码验证；98.7% 策略执行准确率 vs 提示内规则的 81% | 模型路线 |
| **AgentTrust** | arXiv 2605.04785 / 2606.08539 | 确定性安全地板：执行前门控 + 攻击链检测 | 工程实现 |
| **Bhattarai & Vu** | arXiv 2602.09947 | 论证训练与对齐无法修复架构缺陷；提出 "Lethal Trifecta" 与 "Trinity Defense Architecture"（动作治理 + 信息流控制 + 权限分离） | 论证材料 |
| **ceLLMate** | arXiv 2512.12594 | 在 HTTP 层沙箱化浏览器 agent，默认拒绝出站 | 沙箱路线（互补） |
| **NemoClaw** | NVIDIA GTC 2026 | 内核级网络白名单 + 文件系统写限制 + 独立进程策略引擎 | 沙箱路线（互补） |

> ⚠️ **arXiv TrustBench（2603.09157）也在这条线上**，但走的是 **LLM-as-a-Judge + 等渗回归校准**路线，非确定性。它与 OAP、PCAS 是三种不同架构，见 threat-landscape.md §C3。

### 1.3 Ledgeroot 与 OAP 的差异（这是支柱 1 仅存的立足点）

| 维度 | OAP | Ledgeroot |
|---|---|---|
| 授权凭据来源 | **注册表服务签发**（Cloudflare Workers，`.well-known/oap/`） | **用户 EIP-712 本地签名**，私钥不出本机 |
| 作用域 | 通用 tool call（含 `payments.charge`） | 支付/x402 专用 |
| 数据出境 | 默认走云 API（注册表 + 判定服务）；本地评估可选 | 零出境 |
| 完整性证明 | ❌ 无（有 SHA-256 per-agent 哈希链，但不做非省略证明） | ✅ 有（但见 §二） |
| 链上锚定 | ❌ 无 | ✅ 有 |
| 组合攻击 | ❌ 不能防（v1.1 才加） | ✅ 有累计上限 |
| 引用披露 | 签名拒绝 + reason code | 拒付留痕 |
| 生态 | 6 框架生产集成、CTF 数据、标准提案 | 无 |
| 许可 | Apache 2.0 | MIT |

**关键差异只有两条**：**"用户自己签"而不是"注册表签发"**，以及**零出境**。其余都被覆盖或反超。

---

## 二、支柱 2：非省略证明 —— 已被占据，且更完整

> ⚠️ **这是本次调研最重要的一节。** `commercialization.md` §四 把"唯一能证明没有遗漏"作为**全部分析里唯一抄不动的东西**。该结论**已不成立**。

### 2.1 Vaara Receipt

| 项 | 内容 | 置信度 |
|---|---|---|
| 出处 | `draft-sirkkavaara-vaara-receipt-10`，Henri Sirkkavaara（Vaara），**2026-09-04，28 页**，Independent Submission，Informational，2027-03-08 到期 | 高（全文） |
| 格式 | `vaara.receipt/v1`，JCS（RFC 8785）规范化（标签 `jcs-rfc8785` / `JCS` / `jcs-json-v1`） | 高 |
| 信封 | `version` / `alg` / `backLink` / 派生载荷 / 身份声明 / `signature` / `timestampAnchors` | 高 |
| 签名算法 | **ES256（默认，ECDSA P-256）**、RS256、HS256；**ML-DSA-65 MAY**（后量子） | 高 |
| 签名覆盖 | 明确排除 `signature` 与 `timestampAnchors` → **签名后可追加锚点而不失效** | 高 |
| 两种收据 | **decision receipt**（决策 + 依据证据）与 **execution receipt**（执行结果），由 `backLink` 绑成**一对可重算配对** | 高 |
| 执行状态 | `outcomeDerived.status` ∈ `executed` \| **`refused`**；`resultCommitment` 可按值或按摘要提交（原文不离开持有者） | 高 |
| 证据绑定 | `evidenceRef{canonicalization, digest, ref, schema}`；**`ref` 只是提示性的，MUST NOT 仅凭 ref 解析** | 高 |
| 时间锚 | `rfc3161`（**可自建**，OpenSSL ts 即可）与 **`rfc3161-eidas-qualified`**（合格 TSA，"资质只多了法律／可呈堂权重"） | 高 |
| 生态 profile | governance decision（**地板**）、**x402 settlement binding**、authorization decision、**AP2 checkout binding**、**TAP request binding**、generic external execution evidence、fallback projection、credential binding（MCP gateway）、ATLAS threat detection | 高 |
| 交付物 | 参考库（`@vaara.govern` 一行装饰器）+ **公开一致性向量** `tests/vectors/` + **不 import 签发方代码**的独立 checker `_check_independent.py` + 面向非技术操作者的终端应用 | 高 |
| 交叉验证 | 原文称"**独立重实现已复现这些向量**" | 高（其自述） |

### 2.2 它的完整性机制（§6.4）—— 逐层比 Ledgeroot 细

Vaara 的做法是四层叠加：

| 层 | 机制 | 抓什么 |
|---|---|---|
| 1. 顺序 | 每条记录带**单调 `seq`**（构造上保证无缺口） | 中间缺一条 → 指名缺口 |
| 2. 计数 | **签名进记录的 `runningCount`**（= `seq + 1`，即该边界下截至本条的总收据数） | 持有集合本身即可判断"少了几条"，**无需联系签发方、无需外部见证** |
| 3. 封存 | 可选 **sealing record** `{boundaryId, sealed: true, total: N}` | **纯尾部截断**——runningCount 单独看不出来（手里 0..k 时最新计数是 k+1，读起来是完整的） |
| 4. 锚定 | 对 `runningCount` 打 **RFC 3161 锚** | **连封存记录一起抹掉的残余情形** |

原文的层次总结：*"seq for order, the hash chain for tamper-evidence, the sealing record for a truncated tail, and the timestamp anchor for the seal-suppressed residual."*

另有两处设计值得注意：

- **`maxClass`（最高动作类别）**：封存记录可携带"该边界授权过的最高动作类别"，用来**界定缺口的最坏情况**。它既是审计期读数，也能**在执行期消费**——链上的下一跳可以只凭持有集合判定"我要不要在这个类别下继续"，失败即关闭（fail-closed）。原文明确：这是**成员测试而非序关系**，本文不定义类别间的排序。
- **`maxClass` 位于未签名的证据块**，只通过 `evidenceRef.digest` 间接被签名覆盖。因此消费方**必须先验签并重算证据绑定**，否则可被"把不可逆动作改标成许可类别"绕过——该攻击有专门的向量 `class_gate_v0/deny_relabeled`。

### 2.3 它的原文主张（§11）

> *"None defines the held-set completeness mechanism ... None ships a recomputable conformance suite independent of any library. **This document specifies both.**"*

它同时点名了四篇 2026 年独立收敛到同一观察的工作（**均未读原文**）：

- Salfeld-Nebgen，《Governing Actions, Not Agents: Institutional Attestation》，arXiv **2606.26298**——机构治理模式：保留规划自主，但高风险动作在执行点需要独立密码学绑定证明 + 确定性策略检查 + 防篡改日志
- He & Yu，《Sovereign Execution Broker》，arXiv **2606.20520**——在云环境中拦截 tool call 并做逐动作证明
- He，《Sovereign Assurance Boundary》，arXiv **2606.11632**——扩展到多租户与 Kubernetes
- Uchibeke，OAP（见 §1.1）

它承认这四篇都采用了"逐动作签名 + 内容寻址证据"，但认为它们都没有 held-set 完整性机制。

### 2.4 机制对照：Vaara vs Ledgeroot

| | Vaara | Ledgeroot |
|---|---|---|
| 顺序 | 单调 `seq`（每边界） | `prevHash` 回指 + `seq` 列 |
| 漏发检测 | 签名 `runningCount`，**逐条** | epoch Merkle 根 + `receiptCount`，**逐 epoch** |
| 尾部截断 | 封存记录 `total: N` | `verifyAnchor` 按 `receiptCount` 切片（等效，但无显式"封存"语义） |
| 抹掉封存后的残余 | **RFC 3161 对 runningCount 打锚** | 下一 epoch 的链上锚定（等效，但未对"计数"本身锚定） |
| 缺口最坏情况 | `maxClass` 界定并可执行期消费 | ❌ 无 |
| 拒绝留痕 | ✅ `status: "refused"` | ✅ `deny` 收据 |
| 时间戳 | **RFC 3161 + eIDAS 合格** | 仅链上锚定 |
| 独立验证器 | ✅ 独立 checker + 公开向量 | ❌ 与主库耦合 |
| 自托管时间锚 | ✅ OpenSSL 即可 | N/A |
| 平台中立 | ✅ 与 TEE 无关，"root-agnostic" | ✅ |

**结论：Ledgeroot 的完整性机制在原理上等价、在工程上落后**——差在逐条粒度、缺口最坏情况界定、独立可验证性，以及**时间戳的合规形式**。

### 2.5 它明确不做的

- **不定义撤销机制**，也不对密钥新鲜度作要求——原文：*"A consumer MUST NOT treat a signature that verifies as evidence that the signing key is still valid."*
- 不记录"决策之后发生了什么"——**单张 decision receipt 不证明动作发生过**，必须与 execution receipt 配对
- 不为任何一条支付轨道、合规制度或框架定义语义——**只定义信封**，语义交给下游 profile

---

## 三、收据/证据格式层 —— 高度拥挤

### 3.1 IETF 族（均由 Vaara §11 点名，**未逐一读原文**）

| 草案 | 内容 | 与 Ledgeroot 的关系 |
|---|---|---|
| `draft-farley-acta-signed-receipts`（ACTA，2026-06） | 机器对机器访问控制决策的**基础签名收据格式**，JCS 规范化，签发方密钥带外解析；**在决策做出之后记录** | 与我们的收据同层 |
| `draft-marques-asqav-compliance-receipts`（ASQAV，2026-07） | 在 ACTA 之上加**合规 profile**，字段映射 **EU AI Act 与 DORA**，把可选字段收紧为必填以供审计 | ⚠️ **直接抢 EU AI Act 叙事** |
| `draft-nivalto-agentroa-route-authorization`（AgentROA，2026-04） | 把**强制代理放在 agent 进程之外**，动作执行前授权，用规范参数的哈希绑定 MCP tool call，可向 **SCITT 透明服务**登记 | ⚠️ 与支柱 1 + 锚定双重重叠 |
| `draft-sahu-agent-action-receipts`（2026-08） | **逐动作收据的换行分隔日志**，链节是**上一条记录传输字节的 SHA-256**（含其签名与未识别成员）——刻意使链验证不依赖规范化一致 | 与我们的哈希链同层，且其链接方式更抗规范化分歧 |
| `draft-kuehlewind-audit-architecture`（2026-05，Birkholz 合著） | **IETF 的 agent 委派与交互审计架构**：角色、四类审计记录、候选工作项，**刻意不定义线格式** | ⚠️ **IETF AD 级别的人在做这个方向**，定义权风险最高 |
| `draft-kamimura-scitt-vcp`（VCP，2026-01） | SCITT profile，用于算法交易的可验证审计轨迹 | 不同域，同一底座 |

> 📌 **`draft-kuehlewind-audit-architecture` 值得单独盯。** 它由 IETF 管理层级的人主导，且**明确把线格式留空**——这意味着它可能最终收敛到 Vaara 或 ACTA，也可能催生一个自己定义的格式。Ledgeroot 若要进标准，这是入口。

### 3.2 学术侧

| 工作 | 出处 | 内容 | 置信度 |
|---|---|---|---|
| **NovaFabric** | arXiv **2609.12582**（2026-09-11，预印本） | Run Capsule（15 类实体 schema）+ **DSSE/ECDSA P-256 签名** + **RFC 3161 时间戳** + append-only Merkle log + **redaction attestation**；四模式 replay（exact/mocked/semantic/forensic）；Evidence Bundle 供第三方**不装 NovaFabric** 离线验证 | 高（全文） |
| **TRACE** | IEEE BigDataSecurity 2026 | 多 agent 系统的防篡改问责与密码学证据，支持**取证级决策溯源重建** | 中（仅摘要） |
| **Salfeld-Nebgen** | arXiv 2606.26298 | 见 §2.3 | 中（仅摘要） |
| **He & Yu ×2** | arXiv 2606.20520 / 2606.11632 | 见 §2.3 | 低（仅被引转述） |

**NovaFabric 对 Ledgeroot 最值得学的三件事**（其自述且可查）：

1. **Self-contained tier**：本地文件系统存 capsule + 嵌入式 SQLite 做注册表与血缘图，**核心操作（采集/校验/回放/对比/血缘查询）不联系任何服务面、不做许可证检查**。这是目前最接近"证据主权"的学术表述。
2. **Schema 演进不变式**（Invariant 4）：每个 capsule 与事件都带显式 schema 版本，读者必须容忍未知字段，旧 capsule 永久可读；删除字段/改类型/把可选变必填都算破坏性变更。**这正好对应 `commercialization.md` §五 留缝 4。**
3. **诚实的信任边界表述**：它把自己的保证称为 **"conditional verifiability"**，明说"签名密钥持有者可以签一份内容为假的 capsule，下游任何检查都发现不了"。

---

## 四、支付 / 商业层 —— 已被系统化

| 工作 | 出处 | 内容 | 置信度 |
|---|---|---|---|
| **SoK: Security of Autonomous LLM Agents in Agentic Commerce** | arXiv **2604.15367**（Mao, Wang, Liu, Zhu, Ma, Yan；2026-04，2026-05-20 更新） | 首个 agentic commerce 安全系统化综述。**5 维度 × 12 攻击向量**：agent 完整性 / **交易授权** / agent 间信任 / 市场操纵 / 监管合规。其中 **D2「交易授权」明确映射到 AP2 / ACP / MPP / x402 协议集**；D3 引出身份标准簇（ARIA、AIS-1、AID、ERC-8004）；D5 收口到监管 | 中高（摘要 + 二手解读，未读全文） |
| **Agent-to-Agent Finance: Blockchain Payments and Trust** | arXiv **2607.00245** | agent 开始处于"分析工具与交易对手之间"；对金融市场构成的新问题 | 中（仅摘要） |
| **How Agentic AI Will Reshape Payments** | **IMF Note 2026/004**，2026-04-22 | 交易发起从"人类指令"转向"agent 中介决策"；覆盖**授权、流动性、结算、合规、韧性** | 中（仅摘要） |
| **AI Agents in Payments: Applications, Risks and Regulations** | Cambridge（S1867299X26101032） | agentic payments 的应用、风险与监管 | 中（仅摘要） |

> ⚠️ **注意 D2 的命名**：学术界已经用 **"transaction authorization"** 作为标准术语来指代 Ledgeroot 支柱 1 在支付场景下的那一层。对外沟通时这是既有词汇，不是我们的创新。

---

## 五、监管与标准侧的收口

| 机构 / 文件 | 内容 | 置信度 |
|---|---|---|
| **OWASP AISVS 1.0** 第 9 章（Orchestration and Agentic Action），2026-06 | 明确控制项 **C9.2.3**（可信可逆性分级）、**C9.2.4**（运行时强制可逆性）、**C9.2.10**（跨多步链的最高影响类别强制）。Vaara 把自己的向量作为这三项的可重算测试证据 | 高（Vaara 引用其条号） |
| **NIST AI Agent Standards Initiative**，2026-02-17 | 三支柱：产业主导的 agent 标准 / 社区主导的协议开发 / agent 安全与身份研究 | 高（OAP 引用） |
| **Linux Foundation AAIF**（Agentic AI Infrastructure Foundation） | 创始成员 AWS、Anthropic、Block、Bloomberg、Cloudflare、Google、Microsoft、OpenAI。**OAP 原文指出：预行动授权尚未被任何 AAIF 工作组认领** | 高（OAP 引用） |
| **OWASP Agentic Top 10 (2026)** / **MCP Top 10** / **SAFE-MCP** | 风险清单，SAFE-MCP 已由 Linux Foundation 与 OpenID Foundation 采纳 | 高（OAP 引用） |
| **A2A Protocol**（Google / Linux Foundation） | 企业指南强制要求"敏感动作前 MUST 执行适当授权"，但**机制未指定**；OAP 已提案为 A2A 扩展（Discussion #1404） | 高（OAP 引用） |
| **EU Product Liability Directive**（第二次修订新增） | ⚠️ **2026-12-09 起**：软件与 AI 作为**产品**适用严格责任；**第 10 条允许法院在你无法披露证据时推定产品有缺陷——举证责任翻转到你身上。** 比 AI Act 第 12 条**更早、更宽**（后者只覆盖高风险系统）。Vaara 正以此为主要叙事钩子 | 高（Vaara 官网引述） |
| **IMDA Model AI Governance Framework for Agentic AI v1.5**（新加坡，2026-05-20）（第二次修订新增） | Vaara 被列入其**行业致谢名单**。注意 Ledgeroot 的 README 本就对齐 **MAS SAFR（同属新加坡）**——**两者在同一条监管车道上，而对方有署名** | 中高（Vaara README 给出链接，未逐一核实） |
| **OVERT 1.0**（overt.is）（第二次修订新增） | 一个 attestation 协议；**Vaara 是其 "Arbiter"**，开启 attestation 时每条记录同时输出 Protocol Profile 1.0 Base Envelope（canonical CBOR + Ed25519） | 中高（Vaara README） |
| **SEP-2828**（第二次修订新增） | 签名执行记录，已被推进为 `draft-sirkkavaara-vaara-receipt`；Vaara 自述**第二个独立实现已从干净检出复现其一致性向量、无共享代码** | 中（其自述） |
| **ERC-8004** | agent 身份/声誉注册表，被 SoK 的 D3 与 x402 草案 SI-2 同时指向 | 中 |

---

## 六、Ledgeroot 还剩什么

> ⚠️ **第二次修订：R1 已作废。** 初版把"本地优先 / 零外泄"列为真空，理由是"没有任何一方把它作为不可协商的卖点"。**该判断错误**——Vaara 官网首行就是 *"Open source. **No SaaS. No telemetry. No signup.**"*，并做到**断网单文件验证**。详见 [vaara-competitive-analysis.md](./vaara-competitive-analysis.md) §6.1。

去掉已被占据的部分，**真空只剩两条**，而且都是"组合位"不是"发明位"：

| # | 剩余空间 | 为什么仍然存在 | 强度 |
|---|---|---|---|
| ~~R1~~ | ~~本地优先 / 零外泄作为一等架构承诺~~ | ❌ **已作废**：**Vaara 明确占据**——自托管、无 SaaS、无遥测、无注册、断网可验、证据不依赖厂商。OAP 确实走 `aport.io` 云端注册表，但这不构成"真空" | ❌ **无** |
| R2 | **用户 EIP-712 签名 mandate 作为授权凭据** | OAP 的 passport 由**注册表签发**；**Vaara 的 grant 由它自己的 credential broker 铸造**。两者都不是"用户自己签、私钥不出本机"。这正是 `Mandate` 的真正位置 | ✅ 强——但需确认无人侧面覆盖 |
| R3 | **x402 支付语义 + 用户签名授权 + 非省略证明的合并** | Vaara 有 x402 profile 与完整性与强制执行，但**产品重心是通用 tool call 门控**，且其 grant 来自 broker；OAP 有货币限额与策略但不锚定、不做完整性。**没人把"支付 + 用户自签 + 完整性"三件合在一起** | ✅ 强——但这是"组合位"不是"发明位" |

**已经全部失去的**：收据签名、Merkle 完整性、离线验证、执行前拦截、拒绝留痕、拒付证明、**证据主权**。**其中"非省略证明"原本被视为唯一可变现的东西，现在归零。**

> 📌 **留给 Ledgeroot 的准确表述是**：不是"三根支柱"，而是**"支付专用的用户签名授权 + 零出境"这一格**。详见 [vaara-competitive-analysis.md](./vaara-competitive-analysis.md) §六 §七。

---

## 七、战略含义（对 roadmap / commercialization 的直接影响）

### 7.1 三条必须改的表述

1. `commercialization.md` §四 的**"唯一能证明没有遗漏的审计报告"**——**不能再作为商业论点的核心**。Vaara 已公开规格化，且带一致性向量。
2. `threat-landscape.md` §八 的**"三根支柱均未被覆盖"**——支柱 1 与 2 均已被覆盖。
3. `roadmap.md` §三 的用词——**"transaction authorization" 已是学术通用术语**，不能再当作自有概念。

### 7.2 "载波层"要扩容 —— ⚠️ 但 Vaara 与 OAP **不属于载波**

> **第二次修订更正**：初版把 Vaara 与 OAP 一并列入 A 类"载波（应接入，不对抗）"。**这是错的。** 载波的定义是"不碰你的能力面、你插进去就行"。**Vaara 与 OAP 都在正面对撞你的能力面**，只是它们的格式恰好开放可用而已。**"格式开放"不等于"不是对手"。**

正确的分层：

| 层 | 成员 | 应对 |
|---|---|---|
| **A. 真·载波**（可接入） | PEAC、ACTA / ASQAV（信封 + 合规 profile 两层分工）、**`draft-kuehlewind-audit-architecture`**（IETF 架构层，格式留空——**形式规格化的入口**） | ✅ 接入 |
| **B. 厂商规范**（格式可借、位置要抢） | **Vaara**（信封 + profile 机制 + 公开向量）、**OAP**（passport + policy pack + `.well-known/oap/`） | ⚠️ **可借格式，但必须按正面对手对待** |

**接入 Vaara 信封仍然值得做**（它的 SPEC 明确欢迎下游只定义 evidence schema），但**不要因此把它当载波**——它有定价、有牵引、在抢同一位置。

### 7.3 链上锚定要重新评估

Vaara 与 NovaFabric 都用 **RFC 3161**，Vaara 还区分了"技术锚（可自建 OpenSSL）"与"法律锚（eIDAS 合格 TSA，唯一区别是可呈堂权重）"。**Ledgeroot 押链上锚定，在合规接受度上不优于合格时间戳，在成本与依赖上还更重。**

建议动作：**保留链上锚定作为可选技术锚，但把 eIDAS 合格时间戳加进硬需求**——否则在 EU 场景里始终缺一张对手已经拿到的凭据。

### 7.4 最省力的正确动作

按 `roadmap.md` §一 既有的排序原则（"接入标准或停止自研竞争"），当前最优解是：

1. **按 Vaara §6.4 实现 held-set completeness**（`seq` + 签名 `runningCount` + 封存记录 + 对计数打 RFC 3161 锚），替换或包住现有的"哈希链 + epoch Merkle 根"。
2. **发布一致性向量 + 独立 checker**（对标 `_check_independent.py` 与 `traceipt-verify`）——这一步同时补齐了 §2.4 表的最后一行。
3. **发布一个 Vaara profile 与一个 OAP policy pack**，把自己定位成"**把 x402 支付 + 用户 EIP-712 签名 mandate + 零外泄绑定在一起的那一层**"。
4. **接入 OAP 的钩子面**（Claude Code `PreToolUse` 等），而不是自建同等物——OAP 已在 6 个框架上生产运行。

> **判断**：继续自研收据格式的边际价值已经很低，而"成为对方规范里空着的那一环"的边际价值很高。Vaara 的 profile 注册表与 OAP 的策略包库都是**开放的接入点**，且两者的规范里恰好都空着"用户签名授权凭据"这一格。

---

## 附录：置信度说明

| 结论 | 置信度 | 依据 |
|---|---|---|
| OAP 的全部能力、指标、局限 | **高** | **arXiv 2603.20953 全文逐节读取**（含 Algorithm 1、CTF 数据、OWASP 覆盖表、限制章节） |
| Vaara 的信封、profile、完整性机制、§11 主张 | **高** | **draft-sirkkavaara-vaara-receipt-10 全文读取**（含 §6.4 完整性四层与安全考量） |
| Vaara "独立重实现已复现向量" | **中** | 其自述，**未独立核实** |
| NovaFabric 的设计与自述局限 | **高** | arXiv 2609.12582 全文读取；但**预印本未经同行评审** |
| arXiv TrustBench 的方法与 87% 数字 | **中** | 全文读取，**未独立复现** |
| SoK 2604.15367 的五维分类与 D2 映射 | **中高** | 摘要 + 二手解读页；**未读全文**，12 个攻击向量未逐一核实 |
| PCAS / AgentSpec / AgentGuardian / Safiron / Proof-of-Guardrail / GuardAgent / AgentTrust / L-DREA / Bhattarai | **中** | 检索片段 + OAP 的引用转述；**未读原文** |
| IETF 族六份草案的定位 | **中** | Vaara §11 的转述 + 检索确认草案存在；**未读原文**（仅确认了编号与标题） |
| IMF / Cambridge / Agent-to-Agent Finance | **中低** | 仅摘要 |
| OWASP AISVS C9.2.3/4/10 条号 | **中高** | Vaara 引用其具体条号并称自己的向量可作其测试证据；**未查 OWASP 原文** |
| NIST / AAIF / A2A 的状态 | **中高** | OAP 引用；**未查一手文件** |
| "三根支柱均已被占据" | **高** | 基于上述一手读取，非推断 |

---

## 来源

**一手读取（全文）**
- [OAP — Before the Tool Call: Deterministic Pre-Action Authorization for Autonomous AI Agents（arXiv 2603.20953）](https://arxiv.org/abs/2603.20953) · [全文](https://arxiv.org/html/2603.20953v1) · [aport-spec（GitHub）](https://github.com/aporthq/aport-spec) · [alphaxiv 概览](https://www.alphaxiv.org/overview/2603.20953v1)
- **厂商侧（第二次修订新增）**：[APort 官网（含定价）](https://aport.io/) · [Vaara 官网](https://vaara.io/) · [Vaara Resin 验证器](https://vaara.io/verify.html) · [一致性结果页](https://vaara.io/conformance.html) · [vaaraio/vaara README](https://raw.githubusercontent.com/vaaraio/vaara/main/README.md) · [LICENSING.md](https://raw.githubusercontent.com/vaaraio/vaara/main/LICENSING.md) · [vaara（PyPI）](https://pypi.org/project/vaara/) · [@vaara/client（npm）](https://www.npmjs.com/package/@vaara/client)
- [Vaara Receipt — draft-sirkkavaara-vaara-receipt-10（2026-09-04）](https://datatracker.ietf.org/doc/html/draft-sirkkavaara-vaara-receipt-10) · [datatracker 索引](https://datatracker.ietf.org/doc/draft-sirkkavaara-vaara-receipt/) · [SPEC.md（GitHub）](https://github.com/vaaraio/vaara/blob/main/SPEC.md) · [I-D Action -08 公告](https://mailarchive.ietf.org/arch/msg/i-d-announce/F-ZY-qRUn2oE2Hgvu-eZGTTGVTA/)
- [NovaFabric: Tamper-Evident, Replayable Evidence for Autonomous AI Agent Runs（arXiv 2609.12582）](https://arxiv.org/abs/2609.12582) · [全文](https://arxiv.org/html/2609.12582v1)
- [Real-Time Trust Verification for Safe Agentic Actions using TrustBench（arXiv 2603.09157）](https://arxiv.org/abs/2603.09157) · [全文](https://arxiv.org/html/2603.09157v1)
- **牵引数据直查（2026-09-17）**：PyPI Stats API（`pypistats.org/api/packages/vaara/recent`）· npm Downloads API（`@vaara/client`、`@aporthq/aport-agent-guardrails`、`blackwall-mcp`）· GitHub API（`vaaraio/vaara`、`aporthq/aport-agent-guardrails`）

**被引 / 摘要级（未读原文）**
- [SoK: Security of Autonomous LLM Agents in Agentic Commerce（arXiv 2604.15367）](https://arxiv.org/abs/2604.15367) · [二手解读](https://agenticeconomy.dev/definition/agentic-economy-def-sok-agentic-commerce-security-d11)
- [Governing Actions, Not Agents: Institutional Attestation（arXiv 2606.26298）](https://arxiv.org/abs/2606.26298)
- [Sovereign Execution Broker（arXiv 2606.20520）](https://arxiv.org/abs/2606.20520) · [Sovereign Assurance Boundary（arXiv 2606.11632）](https://arxiv.org/abs/2606.11632)
- [Agent-to-Agent Finance: Blockchain Payments and Trust（arXiv 2607.00245）](https://arxiv.org/abs/2607.00245)
- [PCAS — Policy Compiler for Secure Agentic Systems（arXiv 2602.16708）](https://arxiv.org/abs/2602.16708)
- [AgentGuardian（arXiv 2601.10440）](https://arxiv.org/abs/2601.10440) · [Safiron / AuraGen（arXiv 2510.09781）](https://arxiv.org/abs/2510.09781) · [Proof-of-Guardrail（arXiv 2603.05786）](https://arxiv.org/abs/2603.05786) · [Bhattarai & Vu（arXiv 2602.09947）](https://arxiv.org/abs/2602.09947)
- [AgentSpec: Customizable Runtime Enforcement（arXiv 2503.18666）](https://arxiv.org/html/2503.18666) · [ACM 版](https://dl.acm.org/doi/abs/10.1145/3744916.3764546)
- [ceLLMate: Sandboxing browser AI agents（arXiv 2512.12594）](https://arxiv.org/abs/2512.12594)
- [TRACE: Tamper-Resistant Accountability and Cryptographic Evidence（IEEE BigDataSecurity 2026）](https://www.computer.org/csdl/proceedings-article/bigdatasecurity/2026/323600a090/2iSYSiO44nu) · [Semantic Scholar](https://www.semanticscholar.org/paper/TRACE%3A-Tamper-Resistant-Accountability-and-Evidence-Vijayakumar-Varadaraju/a3c833b78e47aa7e135465106205b482de34dd19)
- [L-DREA: Deterministic Runtime Enforcement](https://www.semanticscholar.org/paper/Deterministic-Runtime-Enforcement%3A-The-Execution-AI-Gill-Lakhowal/caabc005c428b48c4061b3870853173afeb6d278)
- [IMF Note 2026/004: How Agentic AI Will Reshape Payments](https://www.imf.org/en/publications/imf-notes/issues/2026/04/22/how-agentic-ai-will-reshape-payments-575560) · [Cambridge: AI Agents in Payments](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/C2EF22C4CD9513A9A6459D10680A5D12/S1867299X26101032a.pdf/ai-agents-in-payments-applications-risks-and-regulations.pdf)

**IETF 族（仅确认编号与标题）**
- [draft-farley-acta-signed-receipts](https://datatracker.ietf.org/doc/draft-farley-acta-signed-receipts/) · [draft-marques-asqav-compliance-receipts](https://datatracker.ietf.org/doc/draft-marques-asqav-compliance-receipts/) · [draft-nivalto-agentroa-route-authorization](https://datatracker.ietf.org/doc/draft-nivalto-agentroa-route-authorization/) · [draft-sahu-agent-action-receipts](https://datatracker.ietf.org/doc/draft-sahu-agent-action-receipts/) · [draft-kuehlewind-audit-architecture](https://datatracker.ietf.org/doc/draft-kuehlewind-audit-architecture/) · [draft-kamimura-scitt-vcp](https://datatracker.ietf.org/doc/draft-kamimura-scitt-vcp/)
