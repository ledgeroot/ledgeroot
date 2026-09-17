# Vaara 竞品深度分析

> 调研日期：2026-09-17
> 调研对象：Vaara（https://vaara.io · https://github.com/vaaraio/vaara · PyPI `vaara` · npm `@vaara/client`）
> 对比标的：Ledgeroot（本仓库）+ MandateKey
> 调研方法：官网 / 仓库 README / LICENSE / LICENSING.md / IETF `draft-sirkkavaara-vaara-receipt-10` 全文 / PyPI 与 npm 下载统计 / GitHub API
> 关联文档：[standards-landscape.md](./standards-landscape.md) · [threat-landscape.md](./threat-landscape.md) · [roadmap.md](./roadmap.md) · [commercialization.md](./commercialization.md)

---

## 结论摘要

**Vaara 是 Ledgeroot 目前最接近的对手——比 TrustBench 近，也比 BlueTier 近。它同时占据了原三根支柱里的两根半，且在牵引、合规包装、可验证性工程上全面领先。**

- 它是**自托管的证据与门控层**，明说 "No SaaS. No telemetry. No signup."——**直接占住 Ledgeroot 的支柱 3**。
- 它在 **v1.1.0 就发了强制执行**（credential broker + attestation-bound grant + gateway），**v1.4.0 发了 gap-evident completeness**——**支柱 1 与支柱 2 都已产品化**。
- 牵引差距是决定性的：**Vaara ~2,164 次/周（PyPI 1,495 + npm 669）**，而 `threat-landscape.md` §C1 写成"唯一有真实牵引"的 BlueTier 是 **111 次/周**。**差 20 倍。**
- 它已经拿到 Ledgeroot 缺的合规凭据：**eIDAS 合格时间戳、TPM 2.0 硬件绑定、EU AI Act 逐条证据包、IMDA 框架致谢**。
- ⚠️ **但它是通用 tool call 门控，不是支付层**；x402 在它那里只是下游 profile（**记录别处发生的结算，不授权也不执行支付**）。
- 🎯 **第六次修订：生态位不重合。** 它卖的是**高风险系统合规**（EU AI Act、产品责任、DORA），买方是**合规 / 法务**；Ledgeroot 的是**agent 小额 402 支付**，买方是**财务 / AP 对账**。**两者不重合的原因不是偏好，是经济结构**——$0.005 的支付既不触发产品责任，也不在 FATF/MiCA 的金额门槛内。见 §6.2。

**关系定性（第六次修订）**：在**能力层**它是正面对手，而且是目前唯一在完整意义上正面对手的那个——不是"载波"（它不欢迎你插进它的格式），也不是"互补的另一半"（它不需要你的证据层）。**但在生态位层，两者不重合**，且不重合的原因是经济结构而非偏好。**评估它时要把这两层分开，否则会同时高估和低估它。**

---

## 一、Vaara 侧写

### 1.1 主体、许可与治理

| 项 | 内容 | 置信度 |
|---|---|---|
| 作者 | **Henri Sirkkavaara**，**唯一版权持有人**（LICENSING.md 原文） | 高 |
| 主体形态 | 个人 / 独立项目；付费 pilot 直接由作者承接（"I take on pilot deployments"、"I answer them myself"） | 高 |
| 许可 | **AGPL-3.0-or-later**；v0.70.0 及以前是 **Apache-2.0**，v1.0.0 起改为 AGPL | 高 |
| 商业许可 | 闭源嵌入或"修改后作为托管服务且不公开改动"需**单独商业许可**，由唯一版权人授予 | 高 |
| ⚠️ 贡献政策 | **不接受第三方代码贡献**——为保留再许可能力，需先签版权转让协议；在此之前不收外部代码 | 高 |
| 分发 | PyPI（CLI+proxy+server）、Homebrew tap、npm `@vaara/client`、MCP Registry（`io.github.vaaraio/vaara`） | 高 |
| 版本 | **v1.50.0**（站点与 README 一致） | 高 |
| 存档 | 每个 tag 由 Zenodo 归档并授予 DOI（软件整体 `10.5281/zenodo.22027975`） | 高 |
| 供应链 | **SLSA Build Level 3** + Sigstore 签名 + 对 decoder/audit/policy loader 的**持续 fuzzing**；OpenSSF Best Practices（passing）与 Scorecard | 高 |
| 对外背书 | **IMDA Model AI Governance Framework for Agentic AI v1.5 行业致谢名单**（新加坡，2026-05-20）；AMD AI Developer Program testimonial；EU Apply AI Alliance Futurium 三篇立场文 | 高 |

> ⚠️ **AGPL 的方向性**：AGPL 可以吸收 MIT 代码，**反过来不行**。若 Ledgeroot 维持 MIT，Vaara 能取用 Ledgeroot，Ledgeroot 不能取用 Vaara。这是 `commercialization.md` 待定项 **C2** 的直接输入。
>
> ⚠️ **"不接受外部贡献"是一条被低估的护城河**：它挡住了分叉，但也意味着 Vaara 永远只有一个贡献者。

### 1.2 规模与牵引（这是最刺眼的一节）

| 指标 | Vaara | 对比 |
|---|---|---|
| **PyPI 周下载** | **1,495** | — |
| PyPI 月下载 | 6,059 | — |
| PyPI 日下载 | 348 | — |
| **npm `@vaara/client` 周下载** | **669** | — |
| **合计周下载** | **≈ 2,164** | **BlueTier `blackwall-mcp` 111 / APort 614** |
| GitHub star | **12** | 低——典型 CLI 分发形态，star 会严重低估它 |
| 仓库创建 | 2026-04-20 | 约 5 个月 |
| 最后提交 | 2026-09-17（调研当日） | 高频活跃 |
| 公开一致性套件 | **50 suites / 0 failing**，结果页逐行链式、可被第三方添加、**无黑名单** | 无人对标 |

> 📌 **必须修正 `threat-landscape.md` §C1 的判断**："BlueTier 是这一批项目里唯一有真实牵引的"——**错了**。Vaara 是它的 20 倍。整份威胁排序的牵引依据需要重做。

### 1.3 能力清单（带版本标记）

| 版本 | 能力 |
|---|---|
| 基础 | `@vaara.govern` 装饰器：每次调用在执行前风险打分并按策略判定 allow / block / escalate；决策 + 调用 + 真实结果写入哈希链 trail（默认 `~/.vaara/trail/audit.db`）；`report_outcome` 闭环回传真实结果以重加权打分器；`shadow=True` 影子模式 |
| 打分 | 五个专家信号 + **保形置信区间**（分布无关覆盖保证）；词表 **85.6% recall @ 5.1% FPR**；BIPIA 注入压力下**良性调用 0.0% FPR**（四个后端）；热路径规则打分器 **140 µs** 均值；25,556 条对抗语料 |
| **v1.1.0** | **强制执行**：**credential broker 铸造签名短期凭据**，绑定 attestation digest、限定单一 tool + 参数承诺 + tenant，带 **typed capability scopes**；受保护 tool 前的 **gateway 拒绝任何无有效 attestation-bound grant 的调用**，使绕过不再静默（**默认关闭**） |
| **v1.4.0** | **Gap-evident completeness**：每条授权收据可携带**签名进记录的 per-boundary 序列号与 running count**，边界内丢一条即可从持有集合证明缺口，**无需联系签发方、无需外部见证**（`vaara verify-contiguity`）（**默认关闭**） |
| **v1.14.0** | **独立重铸（independent re-mint）**：每个公开向量集里的第二个生成器，仅凭声明的规范化规则**逐字节重现签名载体**，**不 import 任何 Vaara 代码** |
| v1.0 | **主权推理 harness**：本地模型 + 签名代理产出**硬件根植的推理收据**，由第二个不同的本地模型交叉检查 |
| 验证 | **Vaara Resin**：**单个 HTML 文件**，WebCrypto 重算 DSSE 预认证编码并验 Ed25519；**收据不出标签页、页面断网可用**——原文："**verification is not a service and Vaara is not a party to it**"；另附公开透明日志浏览器（按 digest 或公钥查询，**无需账号，公钥即身份**） |
| 时间锚 | **自托管 RFC 3161**（离线铸造）+ **eIDAS 合格时间戳** profile |
| 硬件根 | `verify-tpm-binding` / `verify-tpm-chain`：绑定机器 **TPM 2.0 quote 与 IMA 度量**；支持 AMD SEV-SNP；可重表达为 **IETF RATS EAR / AR4SI**；"root-agnostic"——有无 TEE 同一份记录都可验 |
| 合规交付 | `vaara compliance report` 输出**逐条 EU AI Act 证据**，无事件的相关条款返回 **`evidence_insufficient` 而非橡皮图章**；渲染为 **Notified-Body PDF**、静态 HTML 看板、**Sigstore 签名的交接信封**；`trail export-article12` 一条命令出监管包（含 Article 19 existence-in-time） |
| 集成 | LangChain / CrewAI / OpenAI Agents SDK 的原生钩子；**MCP 代理**（`vaara-mcp-proxy`，可 `--shadow`）；**Claude Code plugin**；HTTP API；TypeScript 客户端；云与 OSS 护栏适配器（Bedrock、Azure、GCP、NeMo、Guardrails AI、LLM Guard、Rebuff） |
| CI | GitHub Action：校验策略、跑用例、验证 trail 链与签名，不合规即 fail build |
| 部署 | 多副本部署文档、Kubernetes / Rancher 指南 |
| 标准 | **`vaara.receipt/v1`（SPEC.md）是母规范**；SEP-2828 签名执行记录 → IETF 草案；**OVERT 1.0（overt.is）中 Vaara 是 "Arbiter"**，开启 attestation 时每条记录同时输出 Protocol Profile 1.0 Base Envelope（canonical CBOR + Ed25519）；**可选并行 ML-DSA-65 签名**——剥离后成为可检测的降级而非静默丢失 |
| Dogfooding | **自家营销站点跑在这套门控下**，并公开 trail 与验证公钥 |

**它还明确承诺了表面稳定性**：*"The public surface is fixed... No new primitives are planned. From here the work is hardening and subtraction within this surface."*

---

## 二、逐维度对比：Ledgeroot vs Vaara

| 维度 | Vaara | Ledgeroot |
|---|---|---|
| 形态 | 自托管 MCP 代理 + 装饰器 + CLI，**多语言**（Py/TS），零运行时依赖 | 本地 MCP 插件 + CLI，**单语言**（TS） |
| 数据出境 | **零**；断网可验，站方明说"Vaara 不是验证的一方" | **零** |
| 授权凭据 | **credential broker 铸造**：短期凭据绑定 attestation digest，限定单 tool + 参数承诺 + tenant，typed capability scopes | **用户 EIP-712 本地签名 mandate**，私钥不出本机 |
| 执行前强制 | ✅ v1.1.0（默认关闭） | ✅ 五条策略 |
| 风险打分 | ✅ **统计模型**（85.6% recall @ 5.1% FPR，保形区间） | ❌ 无（纯确定性规则） |
| 支付语义 | ⚠️ 仅下游 profile（x402 settlement binding） | ✅ **x402 为主界面** |
| 累计/聚合限额 | ❌ 未见文档化 | ✅ 累计上限 |
| 报价漂移 / payTo 绑定 | ❌ 无 | ✅ 有 |
| 完整性（非省略） | ✅ **v1.4.0**：逐条签名 seq + running count，`verify-contiguity` | ⚠️ 逐 epoch Merkle 根 + `receiptCount` |
| 缺口最坏情况 | ✅ `maxClass` | ❌ |
| 独立可验证 | ✅ **极强**：Resin 单文件断网验、`_check_independent.py` 不 import 签发方、**independent re-mint 逐字节重现**、50 套一致性套件公开 | ❌ 与主库耦合 |
| 时间戳 | ✅ **RFC 3161 自托管 + eIDAS 合格** | ⚠️ 仅链上锚定 |
| 硬件根植 | ✅ TPM 2.0 + IMA、SEV-SNP、RATS EAR | ❌ |
| 后量子 | ✅ 并行 ML-DSA-65，剥离即降级可检 | ❌ |
| 合规交付物 | ✅ **逐条 AI Act 证据 + Notified-Body PDF + Article 19** | ❌ |
| 发现面 | ✅ MCP Registry、brew、PyPI、npm、HuggingFace Space、公开一致性页 | ❌ |
| 供应链 | ✅ SLSA L3 + Sigstore + fuzzing + OpenSSF | ❌ |
| 许可 | **AGPL-3.0**（+ 商业许可） | **MIT** |
| 牵引 | **≈2,164/周** | 0 |
| 主网 | N/A（不发链上） | Monad **测试网** |

**读法**：这张表里 Ledgeroot 占优的行只有四行——**支付语义、报价漂移/payTo、累计限额、凭据由用户自签**。其余要么打平，要么落后。

---

## 三、Vaara 领先之处（要认的）

1. **合规包装的完成度**。它不只是"能做证据"，而是直接产出 **Notified-Body PDF** 与**逐条 Article 证据**，并且**诚实地对无事件条款返回 `evidence_insufficient`**。这正是 `commercialization.md` §七 风险 2 说的"报告格式是领域问题，不是技术问题"——**它已经跨过去了，Ledgeroot 还没有。**
2. **可验证性的工程严谨度**。三件事叠加：单 HTML 断网验证（Rein）、不 import 签发方代码的独立 checker、**独立重铸逐字节重现**。最后一条是**"独立实现能复现"的最强形式**，Ledgeroot 完全没有对标物。
3. **硬件根植**。TPM 2.0 quote + IMA 度量 + 可选 SEV-SNP + RATS EAR 重表达。这把它从"软件证据"推到"平台证据"，在举证场景里更难被质疑。
4. **公开对抗语料与打分数字**。25,556 条语料、留出集指标带置信区间、跨模型攻击者族、以及**主动披露"诚实最坏情况"**（跨模型 86.3% vs 分布内更高，并说明哪个是更苛刻的分母）。这套披露纪律比 Black_Wall 的自发布基准更可信。
5. **监管车道的署名**。IMDA Agentic AI 框架致谢 + EU Apply AI Alliance 三篇立场文。**Ledgeroot 的 README 本来就在对齐 MAS SAFR（同为新加坡），对方已有署名而我们没有。**
6. **时效性叙事打得准**。它用 **EU Product Liability Directive（2026-12-09 生效）第 10 条**——法院在你无法披露证据时**推定产品有缺陷**，举证责任翻转——这个钩子比 AI Act 第 12 条**更早、更宽**（第 12 条只覆盖高风险系统，Ledgeroot 自己已正确指出过）。
7. **供应链与发布卫生**。SLSA L3、Sigstore、持续 fuzzing、OpenSSF Best Practices + Scorecard、每版 Zenodo DOI。
8. **自证（dogfooding）**。自家营销站点跑在自己的门控下并公开 trail 与公钥。**这是最难伪造的一种公信力。**

---

## 四、Ledgeroot 领先之处（仅四行，要守住）

1. **x402 / 支付作为主界面**。Vaara 是通用 tool call 门控，x402 在它的 SPEC 里只是下游 profile，产品页不强调支付。Ledgeroot 的报价漂移、payTo 绑定、累计上限都建立在支付语义上。
2. **凭据由用户自签**。Vaara 的 grant 由**它自己的 credential broker 铸造**——这是"厂商授权"，不是"用户授权"。Ledgeroot 的 EIP-712 mandate 是**用户签名、私钥不出本机、可离线验签**。**这一格是 `commercialization.md` §一 那个"不能外发数据"客户群的真正门槛。**
3. **聚合视角下的拒绝留痕**。Ledgeroot 能出"尝试 N 笔 / 执行 M 笔 / 拦截 K 笔"的授权-执行一致性视图（MandateKey 时间线）。Vaara 有决策记录，但未见等价的聚合视图。
4. **许可更宽松**（MIT vs AGPL）——但按 `commercialization.md` 待定项 **C2**，这既是资产也是负债（允许竞品白标）。

---

## 五、它的弱点与可攻击面

| # | 弱点 | 说明 |
|---|---|---|
| 1 | **单人 + 不接受外部贡献** | 唯一版权人、不收第三方代码（为保留再许可能力）。**巴士系数 = 1**，且生态无法通过贡献者扩张。对大企业采购是实质风险 |
| 2 | **社区可见度低** | 12 star。下载量高但无社区表面，企业尽调时会注意到 |
| 3 | **强制执行与完整性默认关闭** | v1.1.0 与 v1.4.0 两个关键能力**都 off by default**——默认配置下它只是一个记录器 |
| 4 | **不是支付专用** | 无报价漂移、无 payTo 绑定、无累计限额语义；x402 只是 profile |
| 5 | **凭据非用户自签** | broker 铸造 = 厂商在授权链上，与它的"不依赖厂商"叙事存在张力 |
| 6 | **策略表达能力未公开** | README 未说明策略语言的形式化边界（OAP 至少把它限制在可判定片段并给了论证） |
| 7 | **无链上锚定** | 用 RFC 3161——**在合规接受度上这是优势而非弱点**（见 `roadmap.md` §2.4 N8），但它意味着证据的公开可审计性依赖 TSA 而非公开账本 |
| 8 | **AGPL 对企业的摩擦** | 闭源嵌入需商业许可，法务流程长；对"只想嵌进自己产品"的 ISV 不友好 |

---

## 六、战略判断

### 6.1 它把"证据主权"从"位置"变成了"已占据的位置"

`standards-landscape.md` §六 原先把"本地优先 / 零外泄作为一等承诺"列为剩余真空（R1）。**该结论作废。** Vaara 是自托管、无 SaaS、无遥测、无注册，并且做到了**断网单文件验证**——比 Ledgeroot 当前的"本地 SQLite + CLI"更彻底。

**Ledgeroot 的支柱 3 不再是差异，只是平价。**

### 6.2 但生态位没有重合——比"支付 + 用户自签"更根本

> 🎯 **2026-09-17 第六次修订：这一节原本只写"支付语义 + 用户自签凭据是防守位"。加上生态位之后，这个判断更清楚了，而且防守性质完全不同。**

先说能力层：Vaara 可以加 x402 profile，但它不会把产品重心从"通用 tool call 门控"移到"agent 支付"——**它的表面稳定性承诺明确写了"No new primitives are planned"**。同理，它的 credential broker 模式是它的架构选择，改成"用户 EIP-712 自签"意味着重做授权模型。

**但真正的分界不在能力，在生态位：**

| | Vaara | Ledgeroot |
|---|---|---|
| 卖给的场景 | **高风险系统合规**（EU AI Act、产品责任、DORA） | **agent 小额 402 支付** |
| 单价量级 | 高后果、低频 | **$0.001–$0.05、高频** |
| 买方 | 合规 / 法务 / 风险 | **财务 / AP 对账** |
| 收费模型 | 付费 pilot + 商业许可 | 免费内核 + 聚合层（计划） |

**这两个生态位不重合，而且原因不是偏好，是经济结构**：Vaara 的整个叙事建立在"责任翻转、举证责任在你"——那是**大额高后果**框架；$0.005 的支付既不触发产品责任，也不在 FATF/MiCA 的金额门槛内。**它转身进来不是"加个功能"，是"换一个买家和一套话术"。**

**所以防守位的准确表述是三件，且优先级不同**：

1. 🎯 **生态位**（小额 402 支付）—— **经济结构差异，最难撼动**
2. **支付语义**（报价漂移 / payTo / 累计上限）—— 能力差异，可被抹平
3. **用户自签凭据**（EIP-712 本地签名）—— 能力差异，可被抹平

**前一条是结构性的，后两条是时间性的。** 把它们混在一起谈，会高估后两条的价值。

### 6.3 真正的问题不是 Vaara 抢了什么，而是我们慢了多久

Vaara **2026-04-20 建仓，5 个月到 v1.50.0**，发了 50 套一致性套件、SLSA L3、TPM 绑定、逐条 AI Act 证据、以及一份 IETF 草案（4 天内从 `-08` 走到 `-10`）。**Ledgeroot 是 0 下载、测试网、无发现面、无独立 checker。**

这不是"对手太强"，是**发布节奏差了一个数量级**。`roadmap.md` §一 的排序原则（"先正确性，再差异化，再可见性"）在**没有订单的情况下是对的，但在有对手正在抢标准位的情况下需要重排**——**可见性与可验证性工程不能排在最后**。

---

## 七、行动建议

### 7.1 立刻可做的接入（借力，不重复造）

| # | 动作 | 理由 |
|---|---|---|
| 1 | **跑一遍 Vaara 的公开向量与 `_check_independent.py`** | 零成本拿到一个外部验证基线；同时实测它的诚实度 |
| 2 | **读 `docs/PRIOR_ART.md` 与 `docs/logs-vs-evidence.md`** | 前者是概念首发时间线（对我们判断"什么是真创新"极有用），后者是"日志 vs 证据"的论证范本 |
| 3 | **读 `docs/eu-ai-act-article-12.md`** | 它公开写了"第 12 条要求什么、不要求什么、应该向工具要求什么"——**这正是我们打算自己去问审计师的那份功课** |
| 4 | **对齐 `vaara.receipt/v1` 作为可选输出格式** | 它的 SPEC 明确欢迎下游只定义 evidence schema；Ledgeroot 的形状是一个天然 profile |
| 5 | **在 C2 决策里纳入 AGPL 的对照** | 它的许可选择证明"AGPL + 商业双授权"是可行的守位方式，而 MIT 允许白标 |

### 7.2 必须补的（差距清单）

见 `roadmap.md` §2.4 的 **N1–N9**，其中相对 Vaara 新增的两条最急：

| # | 差距 | Vaara 的对标物 |
|---|---|---|
| **N10** ❗ | **单文件断网验证器**（浏览器可直接验，收据不出本机） | Vaara Resin——**"verification is not a service and Vaara is not a party to it"** |
| **N11** ❗ | **独立重铸／逐字节复现**能力 | v1.14.0 independent re-mint；50 套公开一致性套件 |

### 7.3 不要做的

- ❌ **不要做通用 tool call 门控**——Vaara 与 OAP 已占据，且 Ledgeroot 没有框架钩子面。
- ❌ **不要追它的合规套件广度**（DORA、GDPR、HIPAA、NIS2、ISO 42001 全映射）——**先做透 EU AI Act 第 12 条 + 支付场景这两格**。
- ❌ **不要用"本地优先"做差异化定位**——它已经自称 "No SaaS. No telemetry. No signup."。**改为"支付专用的用户签名授权 + 零出境"**。

---

## 附录 A：Vaara 关键原文摘录

> **关于自托管与不依赖厂商**："Open source. No SaaS. No telemetry. No signup."
> "Everything runs in your infrastructure and stays there... they stay verifiable with the standalone checker even if you never talk to us again. **The evidence does not depend on the vendor; that is the point of the design.**"
> —— vaara.io

> **关于验证不是服务**："One HTML file, no build step and no dependencies... The receipt never leaves the tab, nothing uploads, and the page works with the network off, so **verification is not a service and Vaara is not a party to it**."
> —— README

> **关于它自己的诚实边界**："It also states what a passing check does not establish: that the key belongs to the party you expect, that the signed statement is true, that `decided_at` means anything without an external time authority, or that **one receipt is a whole history**."
> —— README

> **关于表面稳定性**："The public surface is fixed... **No new primitives are planned.** New behavior ships as profiles that pin to `vaara.receipt/v1`, not as new core types... From here the work is hardening and subtraction within this surface, so anyone building on it has a stable target."
> —— README

> **关于许可**："If you want to build on Vaara without the AGPL's source-disclosure obligations... a separate commercial license is available. Henri Sirkkavaara is the sole copyright holder."
> "**Until such an agreement is in place, the project does not accept third-party code contributions.**"
> —— LICENSING.md

> **关于免责**："Vaara helps deployers assemble evidence for their own conformity work. **It does not certify compliance or constitute legal advice.**"
> —— README

## 附录 B：置信度说明

| 结论 | 置信度 | 依据 |
|---|---|---|
| 许可、贡献政策、商业许可 | **高** | LICENSING.md 原文 |
| 能力清单与版本标记（v1.1.0/v1.4.0/v1.14.0/v1.0） | **高** | README 一手读取 |
| 牵引数字 | **高** | PyPI Stats API + npm registry API 直接查询（2026-09-17） |
| 完整性机制细节 | **高** | IETF draft-10 全文 + README 双重确认 |
| Resin 的断网可验证性 | **中高** | README 自述；**未实际下载 HTML 断网验证** |
| 打分指标（85.6% recall 等） | **中** | 其自发布，带置信区间与语料 SHA；**未独立复现** |
| "independent re-mint 逐字节重现" | **中** | 其自述；**未运行验证** |
| IMDA 致谢 / AMD testimonial | **中高** | README 给出链接；**未逐一打开核实** |
| 它的付费 pilot 定价 | **低** | 官网写"scope and price agreed before work starts"，**无公开数字** |
| "不来抢支付"这一判断 | **中** | 基于其"No new primitives are planned"的承诺；**是承诺不是约束** |

## 来源

- [Vaara 官网](https://vaara.io/) · [Vaara Resin 验证器](https://vaara.io/verify.html) · [一致性结果页](https://vaara.io/conformance.html)
- [vaaraio/vaara（GitHub）](https://github.com/vaaraio/vaara) · [README](https://raw.githubusercontent.com/vaaraio/vaara/main/README.md) · [LICENSING.md](https://raw.githubusercontent.com/vaaraio/vaara/main/LICENSING.md) · [SPEC.md](https://github.com/vaaraio/vaara/blob/main/SPEC.md) · [COMPLIANCE.md](https://github.com/vaaraio/vaara/blob/main/docs/COMPLIANCE.md) · [PRIOR_ART.md](https://github.com/vaaraio/vaara/blob/main/docs/PRIOR_ART.md)
- [IETF draft-sirkkavaara-vaara-receipt-10](https://datatracker.ietf.org/doc/html/draft-sirkkavaara-vaara-receipt-10) · [datatracker 索引](https://datatracker.ietf.org/doc/draft-sirkkavaara-vaara-receipt/)
- [vaara（PyPI）](https://pypi.org/project/vaara/) · [@vaara/client（npm）](https://www.npmjs.com/package/@vaara/client)
- [IMDA Model AI Governance Framework for Agentic AI v1.5](https://www.imda.gov.sg/-/media/imda/files/about/emerging-tech-and-research/artificial-intelligence/mgf-for-agentic-ai.pdf)（新加坡，2026-05-20）
- [OVERT 1.0](https://overt.is/) · [OpenSSF Best Practices #12612](https://www.bestpractices.dev/projects/12612) · [Zenodo DOI](https://doi.org/10.5281/zenodo.22027975)
