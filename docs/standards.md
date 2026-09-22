# 学术与标准全景

> 定位：2026 年 3–9 月的 arXiv 论文、IETF 草案、标准组织文件与**厂商规范**，以及它们占据/空出了哪些位置
> 状态：2026-09-22
> 关联：[landscape.md](./landscape.md)（分类 · 半衰期 · 监控） · [competitors.md](./competitors.md)（Vaara / AWS / TrustBench） · [roadmap.md](./roadmap.md) · [commercialization.md](./commercialization.md)
> 调研方法：**一手读取** OAP 论文全文、Vaara Receipt draft-10 全文、Vaara 官网与 README/LICENSING、NovaFabric 全文、arXiv TrustBench 全文；牵引数据经 PyPI Stats / npm registry API 直查；其余为摘要 / 检索片段 / 被引转述（置信度见附录）

**摘要**：**Ledgeroot 自认最难被抄的两件事——"执行前确定性授权"与"非省略证明"——都已被正式规格化，其中一件已被产品化到 v1.50.0。**

- **支柱 1（用户签名授权 + 执行前确定性强制）**：由 **OAP / APort** 占据（签名凭证、21 个策略包、fail-closed、签名拒绝 + reason code、6 框架集成、线上 CTF 实测、托管定价 $499/$4,990 月费）。
- **支柱 2（非省略证明）**：由 **Vaara Receipt** 占据，**机制比我们更完整**，已在 Vaara v1.4.0 产品化。
- **支柱 3（证据主权）**：**也被 Vaara 占住**（No SaaS / No telemetry / No signup + 断网单文件验证）。

---

## 零、先分清两类东西

**把厂商规范当学术论文会导致严重误判——学术论文给你思路，厂商规范抢你的位置。**

| 类别 | 成员 | 性质 | 应对 |
|---|---|---|---|
| **A. 厂商规范**（在售产品） | **APort / OAP**、**Vaara Receipt** | 公司拿 arXiv / IETF 当分发渠道，**有定价、有牵引、在抢标准位** | ⚠️ **正面竞争**（详见 [competitors.md](./competitors.md)） |
| **B. 学术论文**（无产品） | NovaFabric、TRACE、PCAS、AgentSpec、AgentGuardian、Safiron、Proof-of-Guardrail、SoK 等 | 真·论文，作者无商业化动作 | ✅ **思路来源**，几乎无商业威胁 |

**厂商侧的产品与定价**：**APort** 托管 SaaS（Free / **$499/mo** Team / **$4,990/mo** Enterprise），**614** 次/周；**Vaara** AGPL 自托管 + 付费 pilot + 商业许可，**≈2,164** 次/周。

> 📌 **牵引排序必须改**：Vaara 是 BlueTier（111/周）的 **20 倍**、APort 是它的 **5.5 倍**。

---

## 一、支柱 1：执行前确定性授权 —— 已被占据

### 1.1 OAP（Open Agent Passport）

| 项 | 内容 |
|---|---|
| 出处 | arXiv **2603.20953**《Before the Tool Call: Deterministic Pre-Action Authorization for Autonomous AI Agents》，Uchi Uchibeke（**APort Technologies Inc.**），2026-03-21，cs.CR |
| 许可 | **Apache 2.0**；规范 DOI `10.5281/zenodo.18901596`；npm `@aporthq/aport-agent-guardrails` |
| 核心概念 | **agent passport**——Ed25519 签名凭证，绑定"agent 身份 ↔ 授权能力域" |
| 强制点 | `before_tool_call` 阻塞钩子，**在框架层而非模型输出解析层**（prompt injection 无法绕过） |
| 判定 | `ALLOW` / `DENY` / `ESCALATE`（**ESCALATE 已定义但未实现**） |
| 策略 | **21 个 policy pack**（金融 5 / 数据 5 / 代码仓库 2 / web 2 / 系统 1 / 消息 1 / agent 生命周期 3 / MCP 1 / 法律 1） |
| 凭证字段 | `capabilities[]`、`limits{allowed_domains, currency_limits{max_per_tx, daily_cap}, allow_pii, max_calls_per_minute}`、`canonical_hash`、`registry_sig`、`registry_key_id` |
| 发现面 | `/.well-known/oap/` |
| 保证等级 | L0 自述 / L1 邮箱 / L2 GitHub / L3 域名 / L4KYC / L4FIN |
| 框架集成 | OpenClaw、Cursor、**Claude Code `PreToolUse`**、LangChain、CrewAI（生产）；n8n（beta）；A2A（提议） |
| 形式化 | Determinism / Completeness / Fail-closed / Non-bypassability / Auditability 五条 + 证明 |
| 性能 | 云 API p50 **53 ms** / p95 63 / p99 76；**本地评估 p50 174 ms** |
| 标准动作 | 提议控制类 **PAA-1…PAA-5**；映射 NIST AI RMF 与 SP 800-53；覆盖 OWASP Agentic Top 10 的 8/10 |

**实测数据（APort Vault CTF，2026-03）**：4,437 次判定 / 1,151 会话，拒绝 2,419（54.5%）；最高频拒绝码 `oap.unknown_capability`（1,453）；T1 宽松策略社科工程成功率 **74.6%**，T5 严格策略 **0%**。**结论一句话：模型被说服了，策略引擎没有。**

**它自己声明的局限（对我们很重要）**：不形式化委派链（多 agent 留到 v1.1）；策略**静态**需人工维护；**组合攻击（structuring）不能防**（v1.1 才加滑动窗口）；作用域限 tool call 边界；**平台信任**（运行时被攻破则钩子可被绕过）；规模仅 ~1,000 并发。

### 1.2 同一条线上的其他工作（未读原文）

**PCAS**（Datalog 派生策略语言 + 参考监视器，策略合规率 48%→93%）；**AgentSpec**（轻量 DSL）；**AgentGuardian**（从轨迹学习策略，放弃确定性）；**Safiron / AuraGen**（合成轨迹训练守护模型，继承分类器非确定性）；**Proof-of-Guardrail**（TEE + 远程证明，**证明护栏确实执行过**——补的正是 OAP 的平台信任缺口）；**L-DREA**（把 Anderson 1972 参考监视器推广到"外部有效动作"）；**GuardAgent**（ICML 2025，98.7% 策略执行准确率）；**AgentTrust**；**Bhattarai & Vu**（"Lethal Trifecta" 与 "Trinity Defense Architecture"）；**ceLLMate / NemoClaw**（沙箱路线）。

### 1.3 我们与 OAP 的差异（支柱 1 仅存的立足点）

| 维度 | OAP | Ledgeroot |
|---|---|---|
| 凭据来源 | **注册表服务签发** | **用户 EIP-712 本地签名**，私钥不出本机 |
| 作用域 | 通用 tool call | 支付 / x402 专用 |
| 数据出境 | 默认走云 API；本地评估可选 | 零出境 |
| 完整性证明 | ❌ 无 | ✅ 有（但见 §二） |
| 链上锚定 | ❌ 无 | ✅ 有 |
| 组合攻击 | ❌ 不能防 | ✅ 有累计上限 |
| 引用披露 | 签名拒绝 + reason code | 拒付留痕 |
| 生态 / 许可 | 6 框架生产集成、CTF、标准提案 / Apache 2.0 | 无 / MIT |

**关键差异只有两条**：**"用户自己签"而非"注册表签发"**，以及**零出境**。

---

## 二、支柱 2：非省略证明 —— 已被占据，且更完整

> ⚠️ **这是本次调研最重要的一节。** `commercialization.md` 曾把"唯一能证明没有遗漏"当作全部分析里唯一抄不动的东西——**该结论已不成立。**

### 2.1 Vaara Receipt

| 项 | 内容 |
|---|---|
| 出处 | `draft-sirkkavaara-vaara-receipt-10`，Henri Sirkkavaara，**2026-09-04，28 页**，Independent Submission，Informational |
| 格式 | `vaara.receipt/v1`，JCS（RFC 8785）规范化 |
| 信封 | `version` / `alg` / `backLink` / 派生载荷 / 身份声明 / `signature` / `timestampAnchors` |
| 签名算法 | **ES256**（默认）、RS256、HS256；**ML-DSA-65 MAY** |
| 签名覆盖 | **明确排除 `signature` 与 `timestampAnchors`** → 签名后可追加锚点而不失效 |
| 两种收据 | **decision receipt** 与 **execution receipt**，由 `backLink` 绑成一对可重算配对 |
| 执行状态 | `outcomeDerived.status` ∈ `executed` \| **`refused`** |
| 时间锚 | `rfc3161`（**可自建**，OpenSSL ts 即可）与 **`rfc3161-eidas-qualified`**（合格 TSA，"资质只多了法律／可呈堂权重"） |
| 生态 profile | governance decision（**地板**）、**x402 settlement binding**、authorization decision、**AP2 checkout binding**、**TAP request binding**、credential binding（MCP gateway）等 |
| 交付物 | 参考库 + **公开一致性向量** + **不 import 签发方代码**的独立 checker + 面向非技术操作者的终端应用 |

### 2.2 它的完整性机制（§6.4）—— 逐层比我们细

| 层 | 机制 | 抓什么 |
|---|---|---|
| 1. 顺序 | 单调 `seq` | 中间缺一条 → 指名缺口 |
| 2. 计数 | **签名进记录的 `runningCount`** | 持有集合本身即可判断"少了几条"，无需联系签发方 |
| 3. 封存 | 可选 **sealing record** `{boundaryId, sealed: true, total: N}` | **纯尾部截断** |
| 4. 锚定 | 对 `runningCount` 打 **RFC 3161 锚** | 连封存记录一起抹掉的残余情形 |

另有两处：**`maxClass`（最高动作类别）**——界定缺口最坏情况，且可在执行期消费（fail-closed）；它位于**未签名的证据块**，须先验签并重算证据绑定（有专门向量 `class_gate_v0/deny_relabeled`）。

### 2.3 它的原文主张（§11）

> *"None defines the held-set completeness mechanism ... None ships a recomputable conformance suite independent of any library. **This document specifies both.**"*

它点名了四篇 2026 年独立收敛的工作（Salfeld-Nebgen 机构证明、He & Yu 主权执行代理 ×2、OAP），承认它们都用了"逐动作签名 + 内容寻址证据"，但认为都没有 held-set 完整性机制。

### 2.4 机制对照：Vaara vs Ledgeroot

| | Vaara | Ledgeroot |
|---|---|---|
| 顺序 | 单调 `seq` | `prevHash` 回指 + `seq` 列 |
| 漏发检测 | 签名 `runningCount`，**逐条** | epoch Merkle 根 + `receiptCount`，**逐 epoch** |
| 尾部截断 | 封存记录 `total: N` | 按 `receiptCount` 切片（等效，无显式"封存"语义） |
| 残余 | **RFC 3161 对计数打锚** | 下一 epoch 的链上锚定（等效） |
| 缺口最坏情况 | `maxClass` | ❌ 无 |
| 时间戳 | **RFC 3161 + eIDAS 合格** | 仅链上锚定 |
| 独立验证器 | ✅ 独立 checker + 公开向量 | ❌ 与主库耦合 |

**结论：原理等价、工程落后**——差在逐条粒度、缺口最坏情况界定、独立可验证性、时间戳的合规形式。

### 2.5 它明确不做的

不定义撤销机制，也不对密钥新鲜度作要求（*"A consumer MUST NOT treat a signature that verifies as evidence that the signing key is still valid."*）；不记录"决策之后发生了什么"（单张 decision receipt 不证明动作发生过，须与 execution receipt 配对）；**只定义信封，语义交给下游 profile**。

---

## 三、收据 / 证据格式层 —— 高度拥挤

### 3.1 IETF 族（Vaara §11 点名，未逐一读原文）

| 草案 | 内容 | 关系 |
|---|---|---|
| `draft-farley-acta-signed-receipts`（ACTA） | 机器对机器访问控制决策的基础签名收据，JCS，**在决策做出之后记录** | 与我们的收据同层 |
| `draft-marques-asqav-compliance-receipts`（ASQAV） | 在 ACTA 之上加**合规 profile**，映射 **EU AI Act 与 DORA** | ⚠️ **直接抢 EU AI Act 叙事** |
| `draft-nivalto-agentroa-route-authorization` | 强制代理在 agent 进程之外，动作前授权，哈希绑定 MCP tool call，可登记 SCITT | ⚠️ 与支柱 1 + 锚定双重重叠 |
| `draft-sahu-agent-action-receipts` | 逐动作收据的换行分隔日志，链节是**上一条记录传输字节的 SHA-256** | 与我们的哈希链同层，链接方式更抗规范化分歧 |
| `draft-kuehlewind-audit-architecture`（Birkholz 合著） | IETF 的 agent 委派与交互审计架构，**刻意不定义线格式** | ⚠️ **定义权风险最高**，但也是形式规格化的入口 |
| `draft-kamimura-scitt-vcp` | SCITT profile，算法交易可验证审计轨迹 | 不同域，同一底座 |

### 3.2 学术侧

**NovaFabric**（arXiv 2609.12582）：Run Capsule（15 类实体 schema）+ DSSE/ECDSA P-256 签名 + **RFC 3161 时间戳** + append-only Merkle log + **redaction attestation**；四模式 replay；Evidence Bundle **不装 NovaFabric** 离线验证。**最值得学的三点**：**Self-contained tier**（采集/校验/回放/血缘不联系服务面）；**Schema 演进不变式**（读者容忍未知字段，破坏性变更须显式）；**诚实的信任边界**（自称 "conditional verifiability"，明说签名者可以签一份内容为假的 capsule）。

另有 **TRACE**（IEEE BigDataSecurity 2026，防篡改问责）、**Salfeld-Nebgen**（机构证明）、**He & Yu ×2**（主权执行代理 / 主权保证边界）。

---

## 四、支付 / 商业层 —— 已被系统化

| 工作 | 出处 | 内容 |
|---|---|---|
| **SoK: Security of Autonomous LLM Agents in Agentic Commerce** | arXiv **2604.15367** | 首个 agentic commerce 安全系统化综述。5 维度 × 12 攻击向量；**D2「交易授权」明确映射 AP2 / ACP / MPP / x402** |
| **Agent-to-Agent Finance** | arXiv 2607.00245 | agent 处于"分析工具与交易对手之间" |
| **How Agentic AI Will Reshape Payments** | **IMF Note 2026/004** | 交易发起从"人类指令"转向"agent 中介决策" |
| **AI Agents in Payments** | Cambridge | agic payments 的应用、风险与监管 |

> ⚠️ **注意 D2 的命名**：学术界已用 **"transaction authorization"** 作为标准术语指代支柱 1 在支付场景下那一层。**对外沟通时这是既有词汇，不是我们的创新。**

---

## 五、监管与标准侧的收口

| 机构 / 文件 | 内容 |
|---|---|
| **OWASP AISVS 1.0** 第 9 章（2026-06） | 控制项 C9.2.3（可信可逆性分级）、C9.2.4（运行时强制可逆性）、C9.2.10（跨多步链的最高影响类别强制） |
| **NIST AI Agent Standards Initiative**（2026-02-17） | 三支柱：产业主导标准 / 社区主导协议 / 安全与身份研究 |
| **Linux Foundation AAIF** | 创始成员 AWS、Anthropic、Block、Bloomberg、Cloudflare、Google、Microsoft、OpenAI。**OAP 指出：预行动授权尚未被任何 AAIF 工作组认领** |
| **OWASP Agentic Top 10 (2026) / MCP Top 10 / SAFE-MCP** | 风险清单，SAFE-MCP 已被 Linux Foundation 与 OpenID Foundation 采纳 |
| **A2A Protocol**（Google / Linux Foundation） | 企业指南强制"敏感动作前 MUST 执行适当授权"，但**机制未指定**；OAP 已提案为扩展 |
| **EU Product Liability Directive** | ⚠️ **2026-12-09 起**：软件与 AI 作为**产品**适用严格责任；第 10 条允许法院在无法披露证据时**推定产品有缺陷**——比 AI Act 第 12 条**更早、更宽** |
| **IMDA Model AI Governance Framework for Agentic AI v1.5**（新加坡，2026-05-20） | Vaara 被列入**行业致谢名单**。Ledgeroot 的 README 本就在对齐 **MAS SAFR（同属新加坡）**——**同一条监管车道，而对方有署名** |
| **OVERT 1.0**（overt.is） | attestation 协议；**Vaara 是其 "Arbiter"** |
| **ERC-8004** | agent 身份/声誉注册表，被 SoK 的 D3 与 x402 草案 SI-2 同时指向 |

---

## 六、我们还剩什么

去掉已被占据的部分，**真空只剩两条**，而且都是"组合位"不是"发明位"：

| # | 剩余空间 | 为什么仍然存在 | 强度 |
|---|---|---|---|
| ~~R1~~ | ~~本地优先 / 零外泄作为一等架构承诺~~ | ❌ **已作废**：**Vaara 明确占据** | ❌ 无 |
| R2 | **用户 EIP-712 签名 mandate 作为授权凭据** | OAP 的 passport 由注册表签发；Vaara 的 grant 由它自己的 credential broker 铸造。**两者都不是"用户自己签、私钥不出本机"** | ✅ 强——但需确认无人侧面覆盖 |
| R3 | **x402 支付语义 + 用户签名授权 + 非省略证明的合并** | Vaara 有 x402 profile 与完整性，但**产品重心是通用 tool call 门控**，grant 来自 broker；OAP 有货币限额与策略但不锚定、不做完整性 | ✅ 强——"组合位"不是"发明位" |
| **R4** | **小额生态位的适配** | OAP 与 Vaara **都是大额/高后果框架的产物**——Vaara 卖 EU AI Act 高风险合规，OAP 按席位托管收费。**美分级支付的粒度不在两者的经济模型里** | ✅ **最强的一条——不是"他们没做"，是"做了不划算"** |

**已经全部失去的**：收据签名、Merkle 完整性、离线验证、执行前拦截、拒绝留痕、**证据主权**。**其中"非省略证明"原本被视为唯一可变现的东西，现在归零。**

> 📌 **准确表述**：不是"三根支柱"，而是**"链上稳定币 × agent 小额 402 支付生态位里的用户签名授权 + 零出境"**。能力层没有独占，**生态位层有**。
>
> ⚠️ **R4 与 R2/R3 性质完全不同**：R2/R3 是"能力差异"，可被对手用半年抹平；**R4 是"经济结构差异"，对手转身进来要放弃自己的商业模式**。**防守重心应是 R4。**

---

## 七、战略含义

### 7.1 三条必须改的表述

1. `commercialization.md` 里的**"唯一能证明没有遗漏的审计报告"**——不能再作为商业论点的核心。
2. **"三根支柱均未被覆盖"**——支柱 1 与 2 均已被覆盖。
3. 用词：**"transaction authorization" 已是学术通用术语**，不能再当作自有概念。

### 7.2 "载波层"要扩容 —— 但 Vaara 与 OAP 不属于载波

| 层 | 成员 | 应对 |
|---|---|---|
| **A. 真·载波**（可接入） | PEAC、ACTA / ASQAV（信封 + 合规 profile 两层分工）、**`draft-kuehlewind-audit-architecture`**（格式留空，形式规格化入口） | ✅ 接入 |
| **B. 厂商规范**（格式可借、位置要抢） | **Vaara**、**OAP** | ⚠️ **可借格式，但按正面对手对待** |

**接入 Vaara 信封仍然值得做**（它的 SPEC 明确欢迎下游只定义 evidence schema），**但不要因此把它当载波**——"格式开放"不等于"不是对手"。

### 7.3 链上锚定要重新评估

Vaara 与 NovaFabric 都用 **RFC 3161**，Vaara 还区分"技术锚（可自建 OpenSSL）"与"法律锚（eIDAS 合格 TSA）"。**Ledgeroot 押链上锚定，在合规接受度上不优于合格时间戳，成本与依赖还更重。** 建议：**保留链上锚定作为可选技术锚，把 eIDAS 合格时间戳加进硬需求。**

### 7.4 支付协议层：x402 与 MPP 并列支持

| | **x402** | **MPP**（Machine Payments Protocol） |
|---|---|---|
| 出处 | Coinbase 提出，**x402 Foundation（Linux Foundation）**治理 | **Stripe + Tempo Labs** |
| 背书 | Coinbase 生态、Cloudflare | **Visa**（Acceptance Platform，已发卡规格）、**Circle** |
| 传输 | HTTP 402：challenge → 付款 → 重试 | HTTP 402：challenge → credential → receipt |
| 结算粒度 | **按请求** | 按请求 **或 Sessions**（通道 + 逐请求离线凭证，**最后一次性结算**） |
| 轨道 | 稳定币（USDC / EIP-3009） | **稳定币 + 卡 + BNPL** |

**两条直接影响**：**供给会同时出现在两条协议上**，只认 x402 会漏一半；**MPP Sessions 把"一笔支付 ↔ 一笔交易"变成 N:1，卡轨道则完全没有链**——直接打破"已付收据必然有链上交易"（该假设已于 2026-09-17 清除，见 [architecture.md](./architecture.md) §六）。

> ⚠️ **置信度**：来自 Stripe / Tempo 博客与二手报道，**未读 MPP 官方规范全文**。命名撞车注意："Agent Payments Protocol"（AP2）与 "Agentic Payments" 与 MPP 不是一回事。

### 7.5 最省力的正确动作

1. **按 Vaara §6.4 实现 held-set completeness**（`seq` + 签名 `runningCount` + 封存记录 + 对计数打 RFC 3161 锚），替换或包住现有的"哈希链 + epoch Merkle 根"。
2. **发布一致性向量 + 独立 checker**（对标 `_check_independent.py`、`traceipt-verify`）。
3. **发布一个 Vaara profile 与一个 OAP policy pack**，把自己定位成"**把 x402 支付 + 用户 EIP-712 签名 mandate + 零外泄绑定在一起的那一层**"。
4. **接入 OAP 的钩子面**（Claude Code `PreToolUse` 等），而不是自建同等物。

> **判断**：继续自研收据格式的边际价值已很低，"成为对方规范里空着的那一环"的边际价值很高。Vaara 的 profile 注册表与 OAP 的策略包库都是**开放接入点**，且两者规范里恰好都空着"用户签名授权凭据"这一格。

---

## 附录：置信度与来源

| 结论 | 置信度 | 依据 |
|---|---|---|
| OAP 的全部能力、指标、局限 | **高** | arXiv 2603.20953 **全文逐节读取** |
| Vaara 的信封、profile、完整性机制、§11 主张 | **高** | draft-10 **全文读取** |
| Vaara "独立重实现已复现向量" | **中** | 其自述，**未独立核实** |
| NovaFabric 设计 | **高** | arXiv 2609.12582 全文；**预印本未经同行评审** |
| SoK 五维分类与 D2 映射 | **中高** | 摘要 + 二手解读；**未读全文** |
| PCAS / AgentSpec / … | **中** | 检索片段 + OAP 引用转述；**未读原文** |
| IETF 六草案定位 | **中** | Vaara §11 转述 + 检索确认存在；**未读原文** |
| OWASP / NIST / AAIF / A2A 状态 | **中高** | OAP 引用；**未查一手文件** |
| "三根支柱均已被占据" | **高** | 基于上述一手读取，非推断 |

**一手读取（全文）**：[OAP（arXiv 2603.20953）](https://arxiv.org/abs/2603.20953) · [Vaara Receipt draft-10](https://datatracker.ietf.org/doc/html/draft-sirkkavaara-vaara-receipt-10) · [NovaFabric（arXiv 2609.12582）](https://arxiv.org/abs/2609.12582) · [arXiv TrustBench（2603.09157）](https://arxiv.org/abs/2603.09157)。牵引直查：PyPI Stats API、npm Downloads API、GitHub API。

**被引 / 摘要级（未读原文）**：[SoK 2604.15367](https://arxiv.org/abs/2604.15367) · [Salfeld-Nebgen 2606.26298](https://arxiv.org/abs/2606.26298) · [Sovereign Execution Broker 2606.20520](https://arxiv.org/abs/2606.20520) · [Sovereign Assurance Boundary 2606.11632](https://arxiv.org/abs/2606.11632) · [Agent-to-Agent Finance 2607.00245](https://arxiv.org/abs/2607.00245) · [PCAS 2602.16708](https://arxiv.org/abs/2602.16708) · [AgentGuardian 2601.10440](https://arxiv.org/abs/2601.10440) · [Safiron 2510.09781](https://arxiv.org/abs/2510.09781) · [Proof-of-Guardrail 2603.05786](https://arxiv.org/abs/2603.05786) · [Bhattarai & Vu 2602.09947](https://arxiv.org/abs/2602.09947) · [AgentSpec 2503.18666](https://arxiv.org/html/2503.18666) · [ceLLMate 2512.12594](https://arxiv.org/abs/2512.12594) · [IMF Note 2026/004](https://www.imf.org/en/publications/imf-notes/issues/2026/04/22/how-agentic-ai-will-reshape-payments-575560)

**IETF 族（仅确认编号与标题）**：[ACTA](https://datatracker.ietf.org/doc/draft-farley-acta-signed-receipts/) · [ASQAV](https://datatracker.ietf.org/doc/draft-marques-asqav-compliance-receipts/) · [AgentROA](https://datatracker.ietf.org/doc/draft-nivalto-agentroa-route-authorization/) · [sahu action receipts](https://datatracker.ietf.org/doc/draft-sahu-agent-action-receipts/) · [kuehlewind audit architecture](https://datatracker.ietf.org/doc/draft-kuehlewind-audit-architecture/) · [SCITT VCP](https://datatracker.ietf.org/doc/draft-kamimura-scitt-vcp/)
