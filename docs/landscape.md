# 威胁全景

> 定位：赛道分类法、商品化半衰期与监控触发条件（本仓库的「世界状态」单一事实源）
> 状态：2026-09-22
> 关联：[competitors.md](./competitors.md)（Vaara / AWS / TrustBench / Semantica 逐维度拆解） · [standards.md](./standards.md)（学术与标准） · [roadmap.md](./roadmap.md) · [commercialization.md](./commercialization.md)
> 调研方法：官网 / 规范原文 / **源码逐行通读** / npm·PyPI 下载量 / GitHub API / IETF 草案 / 二手信源交叉核对

**核心判断**：**不要把这个赛道的对手平铺成一张清单——它们是几种性质完全不同的威胁，应对方式相反。**

| 类别 | 代表 | 性质 | 应对 |
|---|---|---|---|
| **A. 载波** | PEAC Protocol、x402 Receipt 草案 | 证据层的**外壳标准**，不碰支付/策略/路由 | **接入，不对抗** |
| **B. 分发垄断者** | Coinbase、**卡组织（Visa TAP / Mastercard Agent Suite / Stripe MPP）**、**AWS（AgentCore payments）** | 拥有发现层、轨道层，握有企业客户关系 | **被索引，不对抗**（AWS 例外，见下） |
| **C. 直接技术竞品** | **Vaara（最强）**、**APort / OAP**、BlueTier、EVIDIQ、TrustBench、agentstamp、Vaultra | 与我们在同一能力面竞争 | **正面竞争，靠差异化** |
| **D. 相邻 / 间接** | SpendGate、Infopunks、Dexter、PayAI、x402scan… · **学术论文层** | 不同层面；论文层几乎无商业威胁 | **监控 / 借鉴** |
| **E. 监管时钟** | EU AI Act 第 12 条 | 定义需求的时间表 | **对齐，但别过度承诺** |

> ⚠️ **分类法在 AWS 身上失灵**：原两分法是"B 类只管分发（不对抗），C 类只在能力面竞争（正面对抗）"。**AWS 同时是两者**——它握有分发与采购，又把三根支柱的表述全占（payment session = mandate、Payment guardrail = 策略引擎、Observability 自称 payment audit trails）。对这类玩家，**既不是"被索引"（它本身就是索引），也不是"正面竞争"（我们没有渠道）**，唯一可行的位置是**它结构上不会去的那层**：不参与交易、不属于任何云、可断网独立验证的中立证据层。详见 [competitors.md](./competitors.md) §二。

---

## 一、分类法

```
                    ┌─────────────────────────────────────────┐
                    │  A. 载波层（标准外壳）                    │
                    │  PEAC Protocol · x402 Receipt 草案       │
                    │  → 接入它，让它运载你的证据               │
                    └─────────────────────────────────────────┘
                                      ▲
                                      │ 证据可以搭车
                                      │
   ┌──────────────────┐   ┌───────────────────────┐   ┌──────────────────────┐
   │ B. 分发垄断者      │   │  Ledgeroot            │   │ C. 直接技术竞品       │
   │ Coinbase          │◄──┤  授权 + 强制 + 完整性  ├──►│ Vaara（最强）         │
   │ Bazaar 23k+       │   │  + 证据主权            │   │ OAP / APort          │
   │ Agentic.Market    │   └───────────────────────┘   │ BlueTier · EVIDIQ    │
   │ CDP Facilitator   │                               │ TrustBench · Vaultra │
   │ + 卡组织 Visa/MC  │                               │ agentstamp           │
   │ + AWS AgentCore   │                               └──────────────────────┘
   └──────────────────┘
        → B 类应对：被索引，不被对抗
                    ▲
                    │ 定义需求时间表
                    │
        ┌───────────────────────────┐
        │ E. 监管时钟                │
        │ EU AI Act Art.12 (高风险)  │
        └───────────────────────────┘
```

---

## 二、A 类：载波（应接入，非对抗）

### A1. PEAC Protocol

| 项 | 内容 |
|---|---|
| 定位 | "可验证交互记录"的开放标准；**证据层**，明言不替代身份/支付/可观测性 |
| 治理 | 开放标准，Apache-2.0 库；维护者 Jithin Raj（Originary） |
| 稳定格式 | `interaction-record+jwt`，规范版本 **v0.16.4（2026-08-09）**；旧格式 `peac-receipt/0.1` 已冻结 |
| 线格式 | JWS Compact，`alg: EdDSA`，Ed25519；传输头 `PEAC-Receipt: <jws>` |
| 策略面 | `/.well-known/peac.txt`（YAML），回退 `/peac.txt` |
| 一致性等级 | L0 发现 / L1 HTTP / L2 策略 / L3 **Commerce**（含 402 流程 + 签发收据 + 验证支付证据） |
| 扩展组 | 19 组，含 **`commerce-mandate`**、`agent-action`、`gateway-export` |
| 映射 | MCP、A2A/ACP、UCP、TAP、**x402（`@peac/rails-x402`）**、Stripe |

**它的三个关键弱点（= 我们的接入点）**：

1. **没有上链锚定**（全程只有 JWS + JWKS，无 Merkle 批次或链上根）。
2. **"离线"是有条件的**（首次验证必须抓 `/.well-known/jwks.json`）。
3. **时间新鲜度硬约束**：规范验证步骤 5 —— **`iat` 与当前时间相差超过 5 分钟即拒绝**。用它对**陈年收据做审计验证会失败**——对长期合规存档是结构性缺陷。

**它明确不做的**（规范/宣言原文）：*"PEAC is intentionally not a grab-bag standard… Payment rails, custody, or transaction processing | Observability platforms | **Agent orchestration or tool-routing protocols**"*、*"**PEAC is not a payment rail or policy engine.**"* → **它主动让出了"策略引擎"与"路由"，正是我们的所在。**

**结论：接入，不对抗。** 动作见 `roadmap.md` P2-3。

### A2. x402 Receipt Attestation Standard（草案）

| 项 | 内容 |
|---|---|
| 状态 | **Draft v0.2，2026-03，CC0，一个 GitHub gist** |
| 官方背书 | **无。未被 x402 Foundation 或 Coinbase 采纳。** |
| 设计目标 | 补上 x402 的空白：链上只有裸的 EIP-3009 转账，没有"买了什么/交付了什么/谁结算的" |
| 三个对象 | SettlementAttestation（facilitator 签，EIP-712）/ DeliveryReceipt（server 签）/ BusinessReceipt（payer 组合） |
| 锚定 | **可选**的 EVM 批量锚定：`IReceiptAnchor.anchorBatch(merkleRoot, …)`；`ReceiptAnchorOpen`（permissionless）vs `ReceiptAnchorPermissioned`；**生产推荐 permissioned** |

**它安全评审里三条直接命中我们**：

| 编号 | 发现 | 对 Ledgeroot 的含义 |
|---|---|---|
| **攻击 A4** | **伪造 Merkle 根 —— 在 permissionless 合约上"SUCCEEDS"** | ✅ **已修**。`LedgerootAnchor.sol` 已加 `owner` + `onlyOwner` |
| **测试 3.2.4** | "Facilitator 从批次中省略收据 —— 单张签名依然有效" | 他们**明确承认省略不可检测**；我们的哈希链可证"序列无缺口" |
| **SI-2** | "无 facilitator 注册表"——无法区分合法 facilitator 与攻击者地址；建议用 **ERC-8004** | 印证应接 ERC-8004；`Mandate.agentId` 已埋好 |
| 攻击 A7 | `BatchAnchored` 事件泄露 `receiptCount` | ⚠️ 我们的 `Anchored(epoch,…)` 泄露 epoch 序号——**已评估，判定不移除**（`lastEpoch` 本身是 public getter，删字段不改变可观察性） |

其他值得注意：`DeliveryReceipt.responseHash = keccak256(raw HTTP response body)`（= 我们第 6 段现在做的事）；明确声明"a Delivery Receipt is a **proof of emission, not a proof of validity**"；**需要 x402 规范在 `SettlementResponse` 增加 `attestation` 字段**（尚未提交）。

**结论：观察，并在合理处对齐格式。**

### A3. IETF 草案（vauban 系列）—— 最值得警惕的信号

| 草案 | 内容 |
|---|---|
| `draft-vauban-x402-consolidated-00` | x402 合规化的整体缺口分析 |
| `draft-vauban-x402-stark-receipts-02` | STARK 收据格式扩展，Stwo Circle STARK M31 |
| `draft-vauban-x402-pqc-receipts-00/01` | 后量子纪律：混合 **ES256K + ML-DSA-65** 双签收据 |

**核心引文（几乎是我们的招股书原话）**：

> "The x402 V2 protocol defines HTTP-native payment flows but leaves three gaps that block compliance use cases. First, the PAYMENT-RESPONSE carries a facilitator-issued reference rather than a **self-contained, offline-verifiable cryptographic receipt**; **an auditor cannot validate a retained receipt without contacting the facilitator.**"

**含义**：我们的核心卖点正在**从差异化变成合规刚需**，且是在 IETF 层面被推进，还带 STARK 与后量子。这既是**验证**（方向对），也是**警报**（有人在抢定义权）。底层现实：x402 V2 的 `PAYMENT-RESPONSE` 默认签名方案是 **ES256K**，长期完整性依赖量子计算机不存在的假设。

---

## 三、B 类：分发垄断者

### B1. Coinbase

| 资产 | 内容 |
|---|---|
| **Agentic.Market** | x402 服务公开目录，自称 agentic 经济的"默认起点"（2026-04-20 上线） |
| **x402 Bazaar** | 由 CDP Facilitator 发现的目录，**收录 23,000+ x402 资源** |
| **CDP Facilitator** | 验证 + 结算 + 交易筛查 + 代付 gas；累计处理 1 亿+ 笔 x402 支付（Base + Solana） |
| **分发通道** | "被发现"即同时进入 CDP API、Bazaar MCP server、**Amazon Bedrock AgentCore**、agentic.market |

**威胁性质：分发，不是技术。** 它结构上不会做本地优先、零外泄、不可见的证据层——必须看见流量才能变现轨道。**威胁是：它成为默认发现层，而我们不在里面 = 不存在。** **应对：被索引**（零成本的存活性动作）。

### B2. 卡组织（Visa / Mastercard / Stripe）

| 玩家 | 动作 | 关键点 |
|---|---|---|
| **Mastercard Agent Suite** | 2026-03 完成欧洲首笔现场 agent 支付 | "targets enterprise use cases with **strong compliance and audit capabilities**" |
| **Visa TAP**（Trusted Agent Protocol） | RFC 9421 HTTP 消息签名；**强制 8 分钟最大时间窗** | 企业侧 agent 身份与签名标准 |
| **Stripe MPP** | Sessions 2026 一次性发布 288 项 | 面向已有的企业商户基础 |

**为什么比 Coinbase 更危险**：Coinbase 拥有加密原生轨道与发现层；**卡组织拥有轨道 + 真实的企业买方关系**——即 `commercialization.md` 里的"付费方"。它们**不需要发明证据层**，可以直接要求整个生态使用它们的格式。

**但这也是机会**：卡组织**需要**一个证据层，且通常**外购而非自建**。**卡组织既是最大的长期威胁，也是最合理的 OEM 客户。**

> **置信度：中。** 以上来自二手信源，**未查卡组织一手规范**。

### B3. AWS —— Bedrock AgentCore payments

见 [competitors.md](./competitors.md) §二。要点：**GA 2026-08-18；能力面三根支柱全占；分发包揽 Marketplace + 既有企业账号 + 边缘；已实现 MPP 与 x402 `upto`**。**唯一没跨过去的一格**：它的 audit trail 是厂商云里的日志，不是可被第三方独立验证的密码学证据（**AWS 是交易当事人，结构上不能同时是验证的中立方**）。

---

## 四、C 类：直接技术竞品

> **Vaara / TrustBench / AWS 的逐维度拆解见 [competitors.md](./competitors.md)。** 本节只给定性并保留其余竞品的侧写。

| 竞品 | 性质 | 一句定性 | 详见 |
|---|---|---|---|
| **Vaara** | 自托管证据与门控层（AGPL） | 三根支柱全占，可验证性工程领先；但生态位不重合 | competitors.md §一 |
| **APort / OAP** | 托管 SaaS（$499/$4,990 月费） | 占据了"执行前确定性授权"（见 standards.md） | standards.md §一 |
| **AWS AgentCore** | 云厂商 GA 产品 | 分发 + 能力双占 | competitors.md §二 |
| **TrustBench** | 托管注册表 + 路由器 | 同层撞车，架构弱；自己让出了我们的道 | competitors.md §三 |
| **Semantica** | 相邻参照（非竞品） | 架构最像、对象不同 | competitors.md §四 |

### C1. BlueTier Operations（Black_Wall + Traceipt）—— 最同构的对手

**公司侧写**：BlueTier Operations（GitHub `bluetieroperations-create`）。产品一线 **Black_Wall**（预行动风险闸门，v1.0 上线 + 完整定价），产品二 **Traceipt**（x402 支付收据，已在 Base 主网写锚定）。**产品线形状 "gate before, prove after" 与 Ledgeroot（策略引擎）+ MandateKey（仪表盘）完全同构。** 牵引：`blackwall-mcp` 111 次/周；`traceipt-verify` 3 次/周；**`traceipt` 主代码库不公开**。

**Black_Wall**：`POST /api/v1/forecast` → 风险分 + 可逆性等级 + 28 个命名失效模式 + `GO/CAUTION/STOP`。**延迟 4–8 秒**（LLM 推理层，非确定性规则）。**发布可复现公开基准**（InjecAgent + AgentDojo 改编、带签名收据）——**我们无对标物**。两点可学：`gate()` 默认 fail-closed；`observe` 闭环回传真实结果。**它主动声明不做我们做的事**：*"策略和鉴权引擎是快的、确定性的…Black_Wall 抓你没预想到的"*，主张 "Run it alongside your policy or auth layer"。

**Traceipt**：402 → 结算 → 上链确认 → 签名 → Merkle 根 → 离线验证；USDC on Base，可自托管。收据可渲染为**带扫码验证的 VAT 合规 PDF**。**合规表述最诚实**：*"no rule today names a receipt like this. We are ahead of the mandate, not compelled by it."*

**密码学实现已打平（源码复核）**：Merkle RFC 6962、JWS protected header、三态纪律、链上结算内容校验——**均已对齐**；锚定权限控制**我们先拿到**（Traceipt 只比对 calldata，**不校验交易的 `from`**）。**仍落后**：后量子签名（Traceipt 混合 ML-DSA-65）、跨语言规范化变体、独立验证器包。

**弱点**：锚定不可归属（不校验 `from`）；**无用户签名授权**（Traceipt 自己签，不证明"那件事被授权过"）；**无非省略证明**；主代码库不公开。

**它比我们强的地方（要认）**：已在 Base **主网**跑锚定；VAT 合规 PDF + 扫码验证；混合后量子双签；独立验证器包；**Black_Wall 的可复现公开基准**。

**威胁等级：高**（架构最同构、密码学已打平）。

### C2. EVIDIQ Notary

`evidiq.dev/docs/notary` · 远程 MCP server · 已上架 **OKX.AI**。存证对象是 **AI 推理输出**（prompt + response + modelId），**不是支付**；`keccak256` 内容哈希 + **EIP-191** 签名 + Merkle proof；锚定 **0G Storage**；x402 v2，USDT0 on X Layer；6 个 MCP 工具（2 付费 $0.001/$0.005 + 4 免费）；**离线验证**齐全；发现面齐全（MCP endpoint + `/skill.md` + `/x402`）。自我定位：*"produces **evidence, not permission**."*

**结构性弱点（我们的叙事靶子）**：**prompt 与 response 全文上传到它的服务器**——在"不能外发数据"的企业面前直接出局。**它那句话反过来就是我们的定位：唯一同时产出 evidence 和 permission 的。**

### C3. TrustBench 同名撞车（四家）

`trustbench.io`（x402 注册表/路由器，**analyzed in competitors.md §三**）· `trustbench.net`（AI 输出质量评估 SaaS，$249/mo）· `trustmodel.ai/trustbench`（企业评估引擎）· **arXiv 2603.09157**（ASU + UCLA 的执行前实时信任验证，见 standards.md）。**对外沟通必须带域名限定。**

### C4. agentstamp —— 身份 / 声誉，不是支付

`agentstamp.org`，单人。**去中心化 agent 身份注册表 + 信任评分**；55 API 端点 / 19 MCP 工具 / 4 档戳记；Ed25519 签名戳记 + SHA-256 哈希链**事件日志（记的是平台事件，不是支付收据）**；x402，USDC on Base + Solana。**判定：互补大于竞争**——它做的是 ERC-8004 声誉领域，**可以是我们的身份来源，而不是对手**。

### C5. Vaultra —— 非加密路线的合规收据

`vaultra.io`。**"AI Agent Compliance Layer"**，7 层框架，为每个决策产出 Compliance Receipt；**RFC 3161 时间戳，由 Sectigo eIDAS QTSP 签发**；签名 PDF + 公开验证 URL；主打 EU AI Act（Art. 13/14）；**$299/mo**。

**它拿的是我们没有的东西：RFC 3161 合格时间戳。** Merkle 锚定证明"这个根在此区块之前存在"，**不等于法定时间戳**——EU 语境下 eIDAS QTSP 的戳有独立法律地位。**弱点**：全文上传到 Vaultra；层 ⑤ 人工闸门是托管功能不是用户签名授权；无 Merkle 锚定、无非省略证明；无牵引。

### C6. 其他签名收据实现

`anchor-x402-mcp`（签名决策证明 + OFAC 端点，中）· `certifieddata.io`（低）· `Loomal`（低）· `minia2a.uk`（收据绑定/过期/重放拒绝研究，低）。

---

## 五、D 类：相邻与间接

| 项目 | 定位 | 与 Ledgeroot 的关系 |
|---|---|---|
| **SpendGate.ai** | 代理/治理层，按 agent 的策略 | 功能重叠（策略），托管在请求路径里 |
| **Infopunks** | 信任层 / 智能评分 | 潜在互补（它要证据，我们产证据） |
| **Dexter / x402gle** | 全栈：支付 + 发现 + 数据 + 广告；2500 万+ 结算 | 间接，但规模与资金碾压 |
| **x402b（Pieverse）** | x402 扩展，BNB Chain；收据存 BNB Greenfield，主打 "audit-ready"；**融资 $7M，Animoca + UOB 背书** | ⚠️ 本赛道**首个有机构资金**的收据竞品；但收据与 BNB 强耦合、不可自托管 |
| **PayAI / pay.sh** | Solana 侧，Google Cloud + Solana Foundation 背景，50+ facilitator | 间接；多链维度 |
| **x402scan / x402atlas / 402index.io** | 发现层（402index 协议无关，15,000+ API） | 发现层 |
| **Pylon / agentsvc.io / httpay.xyz** | 商户型供给侧 | 供给侧 |
| **OpenRegistry** | 26 个司法辖区注册数据，免费 MCP | 可能的合作对象 |
| **AgentlyHQ / use-agently / aixyz** | 框架 + 市场 | 框架层，正交 |

**学术与标准层**见 [standards.md](./standards.md)——2026 年 3–9 月，这一层从"零散论文"变成**带一致性测试向量的正式规范**，是当前威胁最大的那一层。

---

## 六、E 类：监管时钟

### EU AI Act 第 12 条（记录保存）

《AI 法案》2024-08-01 生效，分阶段适用；关键日期 **2026-08-02**（大多数**高风险** AI 系统的完整合规截止日）；第 12 条要求高风险系统具备自动记录（logging）能力。

> ⚠️ **重要限定：第 12 条只覆盖"高风险 AI 系统"**（作为受监管产品安全组件的系统，或附件 III 列举的用途）——**不是所有 agent。**

**对我们的含义**：这是一个真实但**窄**的顺风。可以做叙事入口，但**不要宣称"所有 agent 都必须合规收据"**——过度承诺会被当场拆穿（TrustBench 的战略文档正好记录了它自己犯过这个错）。另注意 **EU Product Liability Directive（2026-12-09 生效）第 10 条**——无法披露证据时举证责任翻转——比第 12 条**更早、更宽**，Vaara 正以此为主要钩子。

---

## 七、半衰期：什么正在商品化

| 能力 | 状态 | 商品化压力 | 半衰期 | **Ledgeroot 现状** |
|---|---|---|---|---|
| 签名收据（Ed25519/JWS） | 已商品化 | PEAC、TrustBench、agentstamp、Vaultra、BlueTier、EVIDIQ… | **已过** | ✅ 已有 |
| Merkle + 链上锚定 | 快速商品化 | Traceipt、x402 草案、EVIDIQ、IETF | **6–12 个月** | ✅ 已有（RFC 6962 已对齐） |
| 离线验证 | 快速商品化 | PEAC、Traceipt、TrustBench、EVIDIQ | **6–12 个月** | ✅ 已有，且**零网络** |
| 交付证明（response hash） | 已有标准提案 | x402 草案 DeliveryReceipt；Black_Wall 已签 (request, response) | **6–12 个月** | ✅ 已有；**且拒付也出收据——无人对标** |
| 预行动闸门（一般意义） | **已被占据** | Black_Wall（有定价有牵引）；arXiv TrustBench 已学术化 | **已过** | ⚠️ 有，但**不要用这个词** |
| 人类可读交付物（VAT PDF / 审计报告） | 已被占据 | Traceipt、Vaultra | **已过** | ❌ **无** ← 进会计流程的门票 |
| **用户签名授权的确定性强制** | ❌ **已到期** | **OAP** 已规格化并实测 | **已过** | ⚠️ 仅剩"用户自己签 + 零出境"两点差异 |
| **非省略证明（完整性）** | ❌ **已到期** | **Vaara Receipt §6.4** 更完整 | **已过** | ❌ **落后**（无逐条计数、无缺口最坏情况、无独立 checker） |
| **证据主权（本地 + 零外泄 + 有强制力）** | ❌ **已到期** | **Vaara** 已占 | **已过** | ⚠️ **仅剩平价，且我们这一侧还差一截** |
| 合格时间戳（RFC 3161 / eIDAS） | **已商品化** | Vaara、Vaultra、NovaFabric | **已过** | ❌ **无** |
| 公开一致性向量 + 独立 checker | **已商品化** | Vaara、Traceipt、TrustBench | **已过** | ❌ **无** |
| **用户签名的授权凭据本身** | **无人在做** | OAP 的 passport 由注册表签发；Vaara 的 grant 来自 broker | **低** | ✅ **独有 ← 但这只是凭据形式，不是完整能力** |

**读法**：**只有最后一行"低"是真正剩下**，而且它只是**凭据形式**上的独有。前两行从"低"变成"已过"——**不要再拿完整性证明或本地优先做定位。** 已商品化的能力应**接入标准或停止自研竞争**；已被对手拉开、需要补的是：后量子签名、跨语言规范化、独立验证器包、RFC 3161 合格时间戳、公开一致性向量。

### 用词警告

| ❌ 不要用 | ✅ 改用 | 原因 |
|---|---|---|
| 预行动闸门 / pre-action gate | **用户签名的确定性强制** | 已被 Black_Wall 与 arXiv TrustBench 占据；用旧词会被读成它们的劣化版 |
| 收据 / signed receipt（单独用） | —— | 已商品化 |
| **完整性证明 / 非省略证明**（作为独有卖点） | **按 Vaara §6.4 实现并达标** | 已被 Vaara 占据且更完整 |
| **本地优先 / 零外泄**（作为独有卖点） | **支付专用的用户签名授权 + 零出境** | 已被 Vaara 占据，只剩平价 |
| 基准 / benchmark | **可复现验证** | TrustBench 因滥用此词被迫重写定位 |
| 合规收据（泛化） | **EU AI Act 第 12 条高风险场景对齐** | 第 12 条只覆盖高风险系统 |

**一句话切割**（必须能说清）：

- vs **Black_Wall**：它是**托管 LLM 推理**（猜"这个动作危险吗"），我们是**本地确定性规则**（证"这个动作被授权过吗"）。
- vs **arXiv TrustBench**：它是 **LLM-as-a-Judge + 等渗回归校准**（估计可信度），我们是 **EIP-712 用户签名 mandate 的 fail-closed 执行**。
- **它们给的是概率判断；我们给的是可离线验证的授权证明。**

---

## 八、监控触发条件（定期复核）

| 观察对象 | 触发条件 | 含义 |
|---|---|---|
| **AWS** | AgentCore payments 引入**签名收据 / 离线验证 / 锚定** | ⚠️ **最高级别警报**：证据面差异在分发层被抹平 |
| **AWS** | 会话升级为**用户可签名的可验证凭据** | 用户自签 vs 厂商签发的差异收窄 |
| **AWS** | 支持**对手方白名单 / payTo 绑定** | 最锋利的功能性差异被补齐 |
| **AWS** | Marketplace **上架第三方证据层** | ✅ **OEM 窗口打开 → 主动接触** |
| **AWS** | 定价从"服务订阅"改为**按交易金额抽成** | 费率结构护城河可能重新成立 |
| **AWS / Cloudflare 边缘** | 货币化网关**暴露按请求的收据** | 边缘层成为证据层 → 载体化机会 |
| **PEAC** | 规范出现 anchoring / 完整性机制 | 支柱被吸收 → 重新定位 |
| **PEAC** | 移除或放宽 `iat` 5 分钟窗口 | 其离线审计能力增强 → 压力上升 |
| **x402 官方** | 采纳 `SettlementResponse.attestation` | 收据层进入官方规范 → 载体化 |
| **Coinbase** | 发布跨 facilitator 路由 或 官方证据层 | 分发层向下挤压 → 评估止损 |
| **卡组织** | 发布公开的"agent 支付审计格式" | 定义权转移 → 必须兼容或让位 |
| **卡组织** | 开放第三方证据层接入 | **OEM 窗口打开** |
| **BlueTier** | Black_Wall 引入**用户签名授权**，或 Traceipt 增加**策略强制 / 非省略证明** | 最同构对手补全支柱 |
| **BlueTier** | Traceipt 从 onboarding 转**公开 GA / 定价** | 进入正面竞争阶段 |
| **BlueTier** | Black_Wall 提供**本地 / 可自托管**部署 | 证据主权受威胁 |
| **EVIDIQ** | 推出**本地 / 自托管**，或不再上传全文 | 其最大弱点被消除 |
| **Vaultra** | 获得首个具名客户 / 融资，或加入 Merkle 锚定 | 从纸面进入实装 |
| **TrustBench** | 近 30 天签发收据从 **0** 变为非零 | 从纸面进入实装 |
| **arXiv TrustBench** | 出现开源实现或商业化产品 | 用词必须彻底切割 |
| **NovaFabric** | 从预印本转产品，或把**支付/授权**纳入 schema | 会话级证据层向下挤压 |
| **Vaara Receipt** | 进入 WG、多地实现，或出现 held-set 完整性以外的扩展 | 形式标准成形 → 兼容或让位 |
| **Vaara Receipt** | 出现"用户签名凭据"类 profile | ⚠️ **我们最后的凭据差异被覆盖 → 支柱全数失效** |
| **OAP** | v1.1 落地（委派链形式化 + 滑动窗口防 structuring） | 其两处已知缺口被补齐 |
| **OAP / APort** | 推出**本地优先 / 零外泄**，或 passport 改由用户自签 | ⚠️ 支柱 1 与 3 同时被覆盖 |
| **OAP** | 被 AAIF 或 A2A 正式采纳 | 定义权落定 |
| **`draft-kuehlewind-audit-architecture`** | 从"不定义线格式"转向指定具体格式 | IETF 层面定义权落定 |
| **ASQAV** | 获得采纳（映射 EU AI Act + DORA） | 合规叙事入口被占 |
| **ERC-8004** | 正式采纳并出现注册表实现 | 身份层收口（对我们是机会） |
| **x402b（Pieverse）** | 收据脱离 BNB、支持自托管或迁至 Base | 有资金的对手进入我们的差异面 |
| **EU AI Act** | 第 12 条出现针对 agent 支付的具体指引 | 需求窗口打开 |

---

## 附录：置信度与来源

| 结论 | 置信度 | 依据 |
|---|---|---|
| PEAC 无锚定、有 5 分钟限制、让出 policy engine/路由 | **高** | 规范原文逐条核对 |
| Coinbase 资产与规模 | **高** | 官方文档 + 新闻 |
| x402 Receipt 草案三条关键发现 | **高** | 草案全文 + 测试报告 |
| IETF vauban 草案与引文 | **高** | 数据追踪器 + 草案原文 |
| BlueTier 产品线与牵引 | **高** | 官网 + npm 下载量 + GitHub API 全量仓库列表 |
| Traceipt 的密码学实现 | **高** | `traceipt-verify` README 逐项自述 |
| **Ledgeroot 当前代码状态** | **高** | 逐文件复核 |
| EVIDIQ / agentstamp / Vaultra 能力与定价 | **高 / 中高** | 官网文档一手；Vaultra **无牵引证据、公司实体未披露** |
| NovaFabric 设计与自述局限 | **中高** | 预印本全文；**未经同行评审** |
| **卡组织进场的动作与能力** | **中** | 二手信源，**未查一手规范** |
| EU AI Act 第 12 条适用范围窄化 | **中** | 多源一致，未查法条原文 |

**来源**：[PEAC 规范](https://www.peacprotocol.org/spec) · [PEAC 宣言](https://www.peacprotocol.org/manifesto) · [x402 Receipt Attestation 草案](https://gist.github.com/javierpmateos/389c28e6cb752ee4999a229ac7ca835f) · [IETF draft-vauban-x402-consolidated-00](https://www.ietf.org/archive/id/draft-vauban-x402-consolidated-00.html) · [Coinbase Agentic.Market](https://www.coinbase.com/developer-platform/discover/launches/agentic-market) · [x402 Bazaar](https://www.coinbase.com/developer-platform/discover/launches/x402-bazaar) · [Traceipt](https://traceipt.xyz/) · [traceipt-verify](https://github.com/bluetieroperations-create/traceipt-verify) · [Black_Wall](https://blackwalltier.com/) · [EVIDIQ Notary](https://evidiq.dev/docs/notary) · [agentstamp](https://agentstamp.org/about) · [Vaultra](https://vaultra.io/) · [NovaFabric（arXiv 2609.12582）](https://arxiv.org/abs/2609.12582) · [arXiv 2603.09157](https://arxiv.org/abs/2603.09157) · [awesome-agentic-commerce](https://github.com/MikeyPetrillo/awesome-agentic-commerce)

> 竞品深度来源见 [competitors.md](./competitors.md) 附录；学术与标准来源见 [standards.md](./standards.md) 附录。
