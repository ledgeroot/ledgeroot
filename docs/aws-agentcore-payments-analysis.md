# AWS AgentCore Payments 深度分析

> 调研日期：2026-09-18
> 调研对象：Amazon Bedrock **AgentCore payments**（2026-08-18 GA；2026-05 preview，与 Coinbase 和 Stripe 合作发布）
> 对比标的：Ledgeroot（本仓库）+ MandateKey
> 调研方法：**AWS 官方 GA 博客全文 + `docs.aws.amazon.com` 的 payments-how-it-works 官方文档页（均直接抓取一手页面）** / 二手报道交叉核对
> 关联文档：[threat-landscape.md](./threat-landscape.md) · [roadmap.md](./roadmap.md) · [commercialization.md](./commercialization.md) · [architecture-gaps.md](./architecture-gaps.md) · [vaara-competitive-analysis.md](./vaara-competitive-analysis.md)

---

## 结论摘要

**这是本项目目前遇到的最强信号——比 Vaara 强，而且性质不同。**

Vaara 是"一个与我们同量级起步的对手，跑得快"；AWS 是**一个自带企业买方关系的巨头，把一个 GA 产品放在了我们的生态位上，而且它占据的正是我们三根支柱的能力面**——授权（payment session）、执行前确定性校验（Payment guardrail）、审计留痕（Observability 明确称 "payment audit trails"）。

| | 判断 |
|---|---|
| **能力面** | ⚠️ **三根支柱的表述面被一个超大规模厂商占住**。"谁授权、花多少钱、付给谁、怎么审计"——这正是我们 `roadmap.md` §三 给 SAFR 做的映射句式，现在是 AWS 的公开产品话术 |
| **生态位** | ⚠️ **正面重合**。它的官方用例就是付费 API、MCP 工具、付费内容、pay-per-inference——**就是我们 §零 定义的那个位** |
| **协议面** | ⚠️ **它已实现 MPP**（还带 x402 v1+v2 与 `upto` scheme），我们只有一条接缝 |
| **分发面** | ❌ **压倒性**。AWS Marketplace 采购、既有企业账号、CloudFront + Cloudflare 边缘、Coinbase Bazaar 发现、Strands/LangGraph/OpenClaw/OpenAI 插件 |
| **证据面** | ✅ **它没有跨过去**。它的"审计轨迹"是 CloudWatch 日志与看板，**不是可被第三方独立验证的密码学证据** |

**但有一条比以上全部更重要，它推翻了我们自己的一条论证：**

> ⚠️ **`commercialization.md` §零 说这个位"由费率结构保证"——因为 $0.30 + 2.9% 摊在 $0.005 上是 6000%，物理不可行。这个论证排除的是卡组织，不排除云厂商。**
>
> **云厂商按请求/算力计费，不按支付金额抽成。** AWS 不需要这笔 $0.005 的支付在经济上成立，它需要的是**这个 agent workload 跑在 AWS 上**。博客自己写得很清楚：*"Making AWS the best place to build the world's most useful AI agents."*
>
> → **我们的护城河有一个 AWS 形状的洞：它挡住的是按比例抽成的对手，挡不住把支付当平台功能送的对手。** 详见 §6.2。

**关系定性**：在**分类法上**它是 B 类（分发垄断者），**但它在 B 类里第一次吃掉了 C 类的能力面** —— 现有 `threat-landscape.md` §一 的应对是分开的（B 类"不对抗"、C 类"正面竞争"），**这套打法对"同时是 B 和 C"的玩家没有对应的行**。详见 §6.1。

**战略结论**：不要试图与之对抗，也**不要**退回"我们也能做控制面"。唯一守得住的位置是**它结构上不会去做的那个**——**不参与交易、不属于任何云、可断网独立验证的中立证据层**。AWS **是交易的当事人**（它持有凭据、编排支付、签名），**因此它不能同时是验证的中立第三方**。这与"记账人不能同时是审计师"是同一条道理。

---

## 一、AgentCore payments 侧写

### 1.1 构成与治理

| 项 | 内容 | 置信度 |
|---|---|---|
| 状态 | **已 GA**（2026-08-18）；2026-05 与 Coinbase / Stripe 合作 preview | 高（官方博客 + What's New） |
| 定位 | AgentCore 生产栈的**支付层补充**：Runtime / Memory / Identity / Gateway / Policy / Observability **+ Payments** | 高 |
| 顶层资源 | **PaymentManager** —— 每 AWS 账号一个配置边界，创建时指定 authorizer（**`AWS_IAM` 或 `CUSTOM_JWT`**）与 IAM role，并在 AgentCore Identity 中开通 workload identity | 高（官方文档） |
| 支付连接器 | **PaymentConnector**：`CoinbaseCDP` 与 `StripePrivy` 两种。每 connector 属于恰好一个 PaymentManager | 高 |
| 凭据存储 | **AgentCore Identity → AWS Secrets Manager**，以 ARN 引用；运行时经 `GetResourcePaymentToken` 取 token | 高 |
| 可用区域 | 有区域列表限制 | 中（未核对列表内容） |
| 商业模式 | 云服务计费（**不按支付金额抽成**） | 中（未查定价页；由产品形态推断） |

### 1.2 它实际做了什么

**两个运行期对象：**

| 对象 | 官方定义 | 与我们的对应物 |
|---|---|---|
| **Payment session** | "individual payment contexts between an agent and an end user"，可配置 **`maxSpendAmount` + `currency` + expiry**；**会话过期或额度用尽后，该会话内的后续支付请求被拒绝** | ≈ **我们的 mandate**（但只有累计上限 + 到期） |
| **Payment instrument** | 终端用户的支付凭据（**加密钱包地址**），绑定单一区块链网络，状态 `INITIATED`/`ACTIVE`/`FAILED`/`DELETED`。**创建时为 0 USDC，客户显式授权前 agent 无权交易**；授权与撤销都在钱包方前端（Coinbase WalletHub / Privy）完成 | ≈ 我们的钱包 + mandate 撤销（**但授权由钱包方 UI 授予，不是用户签名的密码学凭据**） |

**官方支付流程（x402 路径，逐条）：**

1. agent 调用付费工具/端点 → 2. 商户返回 **402** 与付款要求（金额、收款方、资产、网络）→ 3. **AgentCore 用会话额度做限额检查，超限即拒**（官方原文：*"The check is deterministic and runs at the infrastructure layer"*）→ 4. 从 Identity 取钱包凭据、构造支付证明、**经外部合作方签名** → 5. agent 带 `X-PAYMENT` 头重试 → 6. **商户验证并在链上结算** → 7. **提交交易并更新会话消费台账；任一步失败则释放预留额度并把交易记为 `FAILED`**。

**MPP 路径**：流程相同，只是挑战头换成 **`WWW-Authenticate: Payment`**，凭据头换成 **`Authorization`**。

**协议范围**：**x402 v1 + v2 + MPP**，另加 x402 的 **`upto` scheme**（先授上限、按实际用量结算，官方用它打通 **pay-per-inference 与动态定价**）。

### 1.3 能力清单与生态

| 面 | 内容 |
|---|---|
| 钱包与入金 | Coinbase / Stripe Privy 稳定币钱包；**法币入金**（信用卡、借记卡、Apple Pay、Google Pay、ACH，部分受地域限制） |
| 凭据安全 | agent **看不到原始凭据**；短生命周期 token 派生自凭据，用于指示钱包方签名。GA 新增 Coinbase **Quick Create**（OAuth 一次性授权，不离开 AgentCore 即可开通） |
| 发现面 | 经 AgentCore Gateway 暴露 Coinbase 的按次付费 x402 端点（**已按社交证明/元数据/描述质量/可用性做成策展列表**）；AgentCore Browser 访问支持 x402 的付费墙站点 |
| 可观测性 | 自动投递 **CloudWatch 日志**与 AgentCore Observability span；预置看板（**交易成功率、平均交易金额**，可按 agent / session / 时间切分）；官方称提供 **payment audit trails** |
| 边缘合作 | **Amazon CloudFront + Cloudflare**（Monetization Gateway 按请求定价） |
| 框架集成 | **Strands 插件、LangGraph 中间件、OpenClaw 插件、OpenAI Agents SDK cookbook**；控制台 / CLI / **编码助手 skill（Claude Code、Kiro、Codex）** |
| 已公布客户 | Anchor Browser（付费网页内容）、**Travala**（旅行 MCP，2.2M 房源）、Elsa AI / Heurist AI（金融研究）、SpreadX/Incarna（经 BlockRun 做 pay-per-inference） |

> 📌 **注意 Travala**：我们的文档曾说旅行预订"复杂得多、未证明形成规模"。**AWS 的 GA 博客把旅行预订作为公开客户案例。** 这条边界至少在企业叙事上已经被挪动了。

---

## 二、逐维度对比：Ledgeroot vs AgentCore payments

| 维度 | AWS AgentCore payments | Ledgeroot |
|---|---|---|
| 形态 | **云服务**（控制面在 AWS，agent 跑在 AgentCore） | **本地 MCP 插件 + CLI**（宿主任意，无服务端） |
| 授权凭据 | **AWS 签发**（PaymentManager + IAM/JWT）+ **钱包方授予**（WalletHub 授权 agent） | **用户 EIP-712 本地签名 mandate**，私钥不出本机，chain-agnostic domain |
| 限额粒度 | **会话级** `maxSpendAmount` + currency + expiry | **mandate 级**：单笔上限 + 累计上限 + 端点限速 + 报价漂移 + 对手方白名单 + payTo 绑定 |
| 对手方约束 | ❌ **未见文档化**（只有总额度） | ✅ **白名单（host 维度）+ payTo 绑定** |
| 报价/实扣一致性 | ⚠️ 有 `upto` scheme（先上限后结算），但校验只到"不超会话额度" | ✅ **报价漂移策略**（默认 10%，比对实扣与 402 报价） |
| 执行前校验 | ✅ 确定性，**在基础设施层**（agent 拿不到凭据，绕不过） | ✅ 五条策略，**在本机**（agent 只能经 `ledgeroot_pay` 付款；若它另有支付通路则绕过可能） |
| 协议 | ✅ **x402 v1 + v2 + MPP + `upto`** | ⚠️ **仅 x402**（`protocol` 维度已有，MPP 未实现） |
| 审计产物 | **CloudWatch 日志 / span / 看板**，官方称 payment audit trails | **Ed25519 签名收据 + RFC 8785 哈希链 + epoch Merkle 根上链** |
| 拒绝留痕 | 失败记为 `FAILED`（服务状态） | ✅ **拒付同样出签名收据** |
| 第三方独立验证 | ❌ **必须信任 AWS**（读它的日志/看板） | ✅ **证据包 + JWKS 离线验签**，不连回 |
| 完整性（非省略） | ❌ 未见 | ⚠️ 逐 epoch Merkle 根 + `receiptCount`（无逐条 runningCount） |
| 断网/气隙验证 | ❌ 服务端产品 | ⚠️ CLI 本地可验；**单文件断网验证器未发布（N10）** |
| 钱包与入金 | ✅ **完整**（法币入金、WalletHub、Quick Create） | ❌ 只支持自带私钥 |
| 托管与持钥 | 凭据在 Secrets Manager；钱包在 Coinbase/Privy | ❌ **不做托管**，密钥在用户机器 |
| 发现面 | ✅ **Bazaar 策展列表 + Gateway + Browser** | ❌ 无 |
| 分发与采购 | ✅ **Marketplace + 既有 AWS 账号 + CDN 伙伴** | ❌ 无 |
| 框架集成 | ✅ Strands / LangGraph / OpenClaw / OpenAI SDK | ⚠️ MCP 宿主（Claude Code / opencode） |
| 数据出境 | 支付轨迹落在 CloudWatch（**厂商可见**） | ✅ **零出境** |
| 许可 | 专有 SaaS | **MIT** |

**读法**：这张表里 Ledgeroot 占优的行是**对手方约束、报价漂移、签名拒付收据、第三方离线验证、零出境、许可**。**其余大部分要么落后，要么是"它有而我们没有"。** 而且注意——**"确定性"这一格 AWS 也有**（官方明写 deterministic + infrastructure layer），我们不能再拿"确定性"当独有卖点。

---

## 三、AWS 领先之处（要认的）

1. **分发是压倒性的，而且它把这层做成了零摩擦。** 企业不需要新增供应商：**走既有的 AWS 账号与 Marketplace 采购流程**，代码级接入只需一个插件/中间件，编码助手还有现成 skill。我们的 `commercialization.md` §十一 那三条"非直销路径"在它面前基本失效——**它不是"需要直销"，而是"已经在企业预算里"。**
2. **协议广度领先我们一个身位。** **MPP 它已实现**（我们只有接缝），x402 覆盖 v1+v2 并加了 `upto`。`upto` 尤其关键：它把"先给上限、按实际用量结算"做成了一等公民，**这正是 pay-per-inference 这类动态定价需要的东西**。
3. **强制力比我们硬。** agent **拿不到凭据**，所有签名都经服务与钱包方。这与 `roadmap.md` §三 支柱 1 里对 ERC-6551 的让步是同一条：**在合约/基础设施层的强制 > 本地校验**。我们必须在文档里承认这一点，而不是拿"五条策略"当等效替代。
4. **入金问题被解决了。** 法币入金（卡、Apple Pay、Google Pay、ACH）+ 钱包 Hub + Quick Create。**我们完全没有这一环**，而这是 agent 支付真正的第一道坎。
5. **可观测性落在企业已有的地方。** CloudWatch 是它们现有的日志归宿，带 IAM 权限、保留策略与告警。**"已经在那里"本身就是竞争力。**
6. **它是一个 GA 的巨头产品**，安全与采购审查对企业来说已经是既成事实。

---

## 四、Ledgeroot 仍占优之处（要守的）

1. **证据 ≠ 日志。这是唯一真正不可让的一格。** 它的 audit trail 是**某家厂商云里的日志**：它证明"AWS 记录了这些"，**不证明记录完整、未被更改、且第三方可复核**。财务、AP、税务、审计师要的不是"登录 AWS 看板",而是**拿到一份能自己验的东西**。
   → Ledgeroot 的收据**签名 + 哈希链 + 上链锚定 + 离线三态验证**，第三方**不需要信任我们，也不需要信任 AWS**。**AWS 是交易的当事人**（持有凭据、编排支付、指示签名），**因此结构上不能同时充当验证的中立第三方**——与"记账人不能同时是审计师"同理。这是 `vaara-competitive-analysis.md` 里 `docs/logs-vs-evidence.md` 那条论证的直接复用，而 **AWS 没有跨过去**。
2. **对手方绑定 —— 这是最锋利、也最容易演示的一格。** 会话额度管的是**花多少**，不管**付给谁**。在一个被提示注入的 402 响应面前，agent 只要不超会话额度就会付给攻击者地址。**我们的白名单 + payTo 绑定 + 报价漂移正是拦这一类。** 我们的 dry-run demo 第 ④ 步演示的就是这个场景——**对照 AWS 的模型，那笔支付在额度内是被允许的。**
3. **宿主与链中立。** 任何 MCP 宿主、任何链；AWS 要求 agent 跑在 AgentCore、钱包用 Coinbase/Privy。**多云或多框架的舰队，无法把某一家云的控制面当作中立的证据根。**
4. **凭据由用户自签。** 它的授权是**AWS 签发 + 钱包方授予**；我们是**用户签名、私钥不出本机、可离线验签**。这与对 Vaara 的同一格（`roadmap.md` §三 支柱 1 表末行），现在同样适用于 AWS。
5. **零出境与迁移成本。** 支付轨迹本身是商业情报（买什么数据、向谁买、买多少、何时买）。在 AWS 那里它进 CloudWatch；在我们这里不出本机。
6. **MIT + 无平台绑定**，可自托管，可嵌进别人（包括卡组织）的产品里——见 `commercialization.md` §十一 的 OEM 路径。

---

## 五、它的弱点与可攻击面

| # | 弱点 | 我们的对应动作 |
|---|---|---|
| 1 | **证据可验证性缺失**：CloudWatch 日志没有签名、没有链、没有锚定、没有独立验证路径 | **把"日志 vs 证据"讲透**，并补 N10（单文件断网验证器）——**这是对抗超大规模厂商时唯一不靠营销的论证** |
| 2 | **只有总额度，没有对手方与报价约束** | demo 与文档主推"注入 → 转给未绑定地址"这一类；把 `upto` 与报价漂移接起来（见 §7.2） |
| 3 | **绑定 AgentCore + Coinbase/Privy** | 定位为**跨云中立证据层**，而不是另一个支付控制面 |
| 4 | **单一厂商信任模型**（凭据在 Secrets Manager、决策在 AWS） | 面向"不能把支付证据发给第三方"的客户群——这一列 `commercialization.md` §一 已论证过，Vaara 通过，**AWS 不通过** |
| 5 | **它把边界推向了旅行等场景**（Travala） | ⚠️ 我们的"不做旅行预订"边界需要重新表述：**不是"那类场景不会发生"，而是"我们的差异化不在交易撮合，而在证据"** |
| 6 | **服务端产品天然有可用性/区域限制** | 强调离线、气隙、无服务依赖 |

---

## 六、战略判断

### 6.1 分类法失灵：B 类第一次吃掉了 C 类的能力面

`threat-landscape.md` §一 的应对是分开的：**B 类（分发垄断者）→ "被索引，不对抗"；C 类（直接技术竞品）→ "正面竞争，靠差异化"。**

**AWS 同时是两者：** 它握有分发与采购（B），又**在能力面上把三根支柱的表述全部占住**（C）。现有打法对"同时是 B 和 C"的玩家没有对应的行——按 B 应对等于放弃能力面的辩护，按 C 应对等于拿没有的渠道去打不该打的仗。

→ **需要新增分类 B3 并改写应对口径**：对这类玩家，**唯一可行的位置是"它结构上不会去的层"**（见 6.3），而不是"被索引"（它本身就是索引）。

### 6.2 我们的"费率结构护城河"有一个 AWS 形状的洞

`commercialization.md` §零 的核心论证是：

> 卡组织费率 $0.30 + 2.9% 摊在 $0.005 上 = **6000%**，物理不可行 → 这个位由费率结构保证。

**这条论证是对的，但它只排除了按比例抽成的玩家。** 云厂商的收费单位是**请求 / 算力 / 服务订阅**，与支付金额解耦：

| 玩家类型 | 行为模式 | 在 $0.005 上 |
|---|---|---|
| 卡组织 / Stripe | 按交易金额抽成 | ❌ 物理不可行（原论证成立） |
| **云厂商（AWS）** | **按负载/服务计费，支付是平台功能** | ✅ **完全可行——甚至是亏本也要做** |

→ **这是本次调研对我们自己战略文档最重要的一处修订**：那个位保护我们不被"抽成型"对手进入，**但挡不住"把支付当平台功能送"的对手**。而后者恰恰是最有钱、最有渠道的那一类。

### 6.3 它要的是"位置"，不是"证据层"

官方话术是 *"Making AWS the best place to build the world's most useful AI agents"*——**支付是这个位置的一块拼图，不是收入来源。** 它要的是把 agent 的运行、记忆、身份、工具、权限、**支付**都沉进 AWS，让企业的运行关系不可迁移。

这决定了两件事：

1. **它不会为"独立可验证"这件事投入到"让第三方不信任 AWS 也能验"的程度**——那与"让运行关系留在 AWS"的方向相反。**中立性与它的平台战略相互排斥。**
2. **它需要证据层，但更可能外购而非自建**（与 `threat-landscape.md` §B2 对卡组织的判断同构）。

→ **这就是我们的位置：不是与它的控制面竞争，而是成为它（以及卡组织、以及其它云）之上那一层可移植、可独立验证的证据层。** 类比重构如下：

| | 记账/传输 | 独立证据 |
|---|---|---|
| 网络 | TLS | **Certificate Transparency**——不参与加密，只提供可公开验证的记录 |
| 财务 | 记账人 | **审计师**——不能是同一方 |
| Agent 支付 | AgentCore payments / 卡组织轨道 | **Ledgeroot** |

---

## 七、行动建议

### 7.1 立刻可做的接入（借力，不重复造）

| # | 动作 | 理由 |
|---|---|---|
| 1 | **读通 AgentCore payments 的数据面 API**（`CreatePaymentSession` / `CreatePaymentInstrument` / `ProcessPayment`） | 这是"外部控制面"的第一个真实形状；我们的收据将来要能引用它 |
| 2 | **把 Coinbase 的 `cdp-agentcore-template` 与 Privy 的 `aws-agentcore-sdk` 读一遍** | 它们是钱包方的前端范式，也决定了 agent 能拿到什么、拿不到什么 |
| 3 | **实测 `upto` scheme 与报价漂移的接法** | `upto` 是"先上限后实扣"，**我们的报价漂移策略就是它缺的那个校验**（见 7.2） |
| 4 | **接 Coinbase Bazaar 的策展发现面**（它已通过 Gateway 暴露成 MCP server） | 零成本拿到"被索引"的存活性 |
| 5 | **按 MPP 官方规范实现 provider**（不再等） | AWS GA 支持 MPP **就是**我们等的那个需求信号 |

### 7.2 必须补的（差距清单，含具体工程项）

| # | 工程项 | 具体改动 | 为什么现在 |
|---|---|---|---|
| **A1** | **MPP 实现** | 新增 `MppPaymentProvider`（`PaymentProvider` 接口已在）+ `mpp` 结算校验，替换 `verifySettlement` / `checkSettlement` 的 `incomplete` 分支 | ⚠️ **AWS 已 GA 支持 MPP**。我们此前"等规范和真实需求"的条件已满足 |
| **A2** | **MPP Sessions 下的 epoch 边界语义**（**这是 A1 的真问题**） | MPP 把"一笔支付 ↔ 一笔交易"变成 **N:1**，而当前 epoch 按 `receiptCount` 切片、**假定每张收据彼此独立**。需决定：N:1 下 `receiptCount` 的语义、以及无链上交易的收据如何进入 Merkle 树 | 见 [architecture-gaps.md](./architecture-gaps.md) §7.4 已预警的同一处碰撞。**先定语义再写代码，否则返工** |
| **A3** | **x402 `upto` scheme 支持** | 接受 `upto` 报价，把**上限**与**实扣**分别记进 `segments.plan`，并让报价漂移对"上限"而非固定报价判定 | `upto` 正是报价漂移策略存在的理由被放大的场景；**这是我们对 AWS 唯一可正面宣传的功能性差异** |
| **A4** | **收据支持"外部授权引用"** | `segments.mandate` 增加外部控制面引用字段（如 `externalRef`），使一张收据能说"这次支付由 AWS session X 授权，以下是它被执行的独立证据" | 控制面开始属于别人（AWS session / 钱包方 grant）。**没有这个字段，我们的证据层无法覆盖别人编排的支付** |
| **A5** | **把 AgentCore payment session 作为可导入授权** | 仿照 `ledgeroot_mandate_import` 的 AP2 路径，新增一种导入形态 | 这是"接入而非对抗"的**具体实现**：Ledgeroot 站在 AgentCore 后面，补上它没有的对手方绑定/报价漂移，并产出可移植证据 |
| **A6** | **N10 单文件断网验证器 —— 优先级上调** | 见 [roadmap.md](./roadmap.md) §2.4 | 对手是超大规模厂商时，"**验证不是一项服务**"是唯一不需要渠道就能成立的论证 |

### 7.3 不要做的

- ❌ **不要做控制面 / 看板 / 舰队管理去对标 AgentCore 控制台与 CloudWatch**——我们没有渠道，而且那正是它的主场。
- ❌ **不要做钱包、入金、托管**——Coinbase / Privy / AWS 已经把这一环做成零摩擦。
- ❌ **不要做发现层**——Bazaar 策展列表 + Gateway 是免费分发，重复造是浪费。
- ❌ **不要追框架插件矩阵**（Strands / LangGraph / OpenClaw / OpenAI SDK）——这是 AWS 的主场；**守住 MCP 宿主这一个入口即可**。
- ❌ **不要再用"审计轨迹 / 支出护栏"作为差异化话术**——一个 GA 的巨头产品已公开这么说；**换成"可独立验证的证据"与"日志 ≠ 证据"**。
- ❌ **不要用"确定性"做卖点**——AWS 官方明写 deterministic 且跑在基础设施层。
- ❌ **不要试图"做 agent 支付的 AWS"**——与我们"证据引擎"的定位冲突，且没有那个分发面。

---

## 附录 A：关键原文摘录

> **关于限额与确定性校验**："A payment session has two configurable caps: a maximum spend amount in a specified currency, and an expiry time. Before signing a payment, AgentCore payments checks the request against the session budget and rejects requests that would push the session past its cap. **The check is deterministic and runs at the infrastructure layer.**"
> —— AWS GA 博客

> **关于凭据不可见**："AgentCore stores developer credentials in the AgentCore Identity Secrets Manager. **The agent does not see the raw credentials.** AgentCore payments uses short-lived tokens derived from these credentials to instruct the wallet provider to perform wallet operations (such as transaction signing)."
> —— AWS GA 博客

> **关于入金与授权**（官方文档）："A payment instrument, once created, **starts with 0 USDC. The agent does not have permissions to transact through the instrument unless the customer explicitly grants them.**" … "Grant permissions to agent — Within the same wallet hub, the user can **grant or revoke permissions** to the agent."
> —— docs.aws.amazon.com `payments-how-it-works`

> **关于协议与 `upto`**："At GA, we have expanded protocol support to include the Machine Payment Protocol (MPP), another standard for machine payments co-authored by Stripe and Tempo… Additionally, we have introduced support for the **"upto" scheme within x402**, which enables an agent to set a **spending ceiling rather than committing to a fixed price.**"
> —— AWS GA 博客

> **关于可观测性**："developers need comprehensive observability—including **payment audit trails**, detailed logs, and key metrics such as success rates and average transaction values…" … "automatically emits **vended logs to your Amazon CloudWatch log group**, and vended spans to AgentCore Observability."
> —— AWS GA 博客

> **关于失败留痕**（官方文档支付流程第 7 步）："AgentCore payments commits the transaction and updates the session spending ledger. If any step fails, the payment limit reservation is released and **the transaction is recorded as `FAILED`.**"
> —— docs.aws.amazon.com `payments-how-it-works`

> **关于平台意图**："Making AWS the best place to build the world's most useful AI agents."
> —— AWS 2025 纽约峰会分享（**二手转述**，见附录 B）

> **关于边缘与内容方**："Amazon CloudFront and AWS WAF give content owners a **single control plane for AI traffic** — which agents can access what content, at what price, and for what use — with payment verified at the edge over the open x402 protocol."
> —— Nishit Sawhney, GM, AWS Edge Services

---

## 附录 B：置信度说明

| 项 | 置信度 | 依据 |
|---|---|---|
| GA 时间、组件构成、payment session 形状、协议范围（x402 v1/v2 + MPP + `upto`）、凭据管理、支付流程、Observability 形态 | **高** | **一手**：AWS GA 博客 + `docs.aws.amazon.com` 官方文档页，**本次直接抓取** |
| 客户案例（Anchor Browser / Travala / Elsa AI / Heurist AI / SpreadX）与 CDN 合作（CloudFront / Cloudflare） | **高** | 一手博客原文（但**均为官方自述，未独立核实**） |
| 商业模式"不按交易金额抽成" | **中** | **未查定价页**；由"云服务 + 平台战略"形态推断。**结论（§6.2）依赖它，若定价实际按笔收费则需重估** |
| 可用区域清单 | **中** | 仅知"有区域限制"，未核对列表 |
| "session 含单笔上限 + 总预算" | ⚠️ **低（二手夸大）** | **中文报道（公众号 @StableHunterAI 转载 @Yukiiiya）称会话含"单笔最多花多少、总预算是多少"。官方文档只显示 `maxSpendAmount` + `currency` + expiry，即会话级单一额度，未见单笔上限。** 本分析以官方文档为准 |
| 授权/撤销是否具备密码学凭据形态 | **中** | 官方只述"钱包 Hub 内授予/撤销权限"，**未见签名凭据格式**。若其已用可验证凭据，§四 第 4 格的差异会收窄 |
| 拒付是否可导出为可存档证据 | **低** | 官方仅称"记为 `FAILED`"，**未述导出形态**。需实测 |
| AgentCore Policy 与支付的耦合程度 | **低** | 中文报道将 Policy 列为 AgentCore 组件；**本次未核对它与 Payment guardrail 的关系** |

> ⚠️ **本次调研的一手覆盖面**：AWS 侧**已读到官方博客与官方文档页全文**（这是本仓库所有竞品分析里一手比例最高的一次）。**中文报道仅作线索，凡与官方文档冲突处以官方为准**，冲突点已在表中标出。

---

## 来源

**一手（直接抓取）**

- [Amazon Bedrock AgentCore payments is now generally available](https://aws.amazon.com/blogs/machine-learning/amazon-bedrock-agentcore-payments-is-now-generally-available-enabling-agents-to-transact-safely-and-autonomously-at-scale/) —— AWS ML Blog，2026-08-18
- [How AgentCore payments works](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/payments-how-it-works.html) —— AWS 官方文档
- [Amazon Bedrock AgentCore payments（开发指南首页）](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/payments.html)
- [AgentCore payments is now generally available in Amazon Bedrock](https://aws.amazon.com/about-aws/whats-new/2026/08/bedrock-agentcore-payments-ga/) —— AWS What's New

**二手（仅作线索，未采信冲突处）**

- 中文报道：@Yukiiiiiya，公众号 @StableHunterAI 授权转载（**其中"单笔上限"一说与官方文档不符**）
- [The Paypers](https://thepaypers.com/payments/news/amazon-bedrock-agentcore-payments-is-now-generally-available)
- [AWS News 摘要](https://aws-news.com/article/2026-08-18-amazon-bedrock-agentcore-payments-is-now-generally-available-enabling-agents-to-transact-safely-and-autonomously-at-scale)（提到 `upto` scheme）

**本仓库源码**

- `src/policy/defaults.ts`（五条策略）· `src/mandate.ts`（EIP-712）· `src/tools/pay.ts`（幂等与支付意图占位）· `src/verify/verifier.ts`（三态）· `src/x402/facilitator.ts`（`MONAD_TESTNET_X402`，唯一的网络配置实例）
