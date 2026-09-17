# Agent 支付证据层 —— 威胁全景

> 建立日期：2026-09-17
> 最近修订：2026-09-17（第四次）—— ⚠️ **新增学术与标准层调研（见 [standards-landscape.md](./standards-landscape.md)）：支柱 1 与支柱 2 均已被正式规格化。** OAP（arXiv 2603.20953）占据了"执行前确定性授权"，Vaara Receipt（`draft-sirkkavaara-vaara-receipt-10`）占据了"非省略证明"且机制更完整。§五 D1 重写为指向新文档的摘要，§七 半衰期与 §八 支柱、§九 行动清单、§十 监控同步改写
> 第三次修订：2026-09-17 —— **对照当前源码逐条复核：Ledgeroot 已追平 Traceipt 的密码学实现**（§C1 的旧对比表有 4 项已失效，见"状态修正"）；§C2–C6 补齐 EVIDIQ / TrustBench 同名撞车 / agentstamp / Vaultra 一手情报；新增 §五 D 类的 NovaFabric 与一批 2026 年论文；§七 半衰期、§九 行动清单、§十 监控、附录同步更新
> 第二次修订：2026-09-17 —— 新增 §三 B2 **卡组织威胁**（Visa TAP / Mastercard Agent Suite / Stripe MPP，与 Coinbase 同类但握有企业客户关系）
> 前次修订：§四 C1 重写（Traceipt → BlueTier Operations 双产品线）；新增 x402b / Pieverse 情报；半衰期表新增"预行动闸门已被占据"；行动清单新增 RFC 6962 等四项
> 适用范围：Ledgeroot / MandateKey
> 关联文档：[vaara-competitive-analysis.md](./vaara-competitive-analysis.md) · [standards-landscape.md](./standards-landscape.md) · [roadmap.md](./roadmap.md) · [commercialization.md](./commercialization.md) · [trustbench-competitive-analysis.md](./trustbench-competitive-analysis.md)
> 调研方法：官网 / 规范原文 / **源码逐行通读** / npm 下载量 / GitHub API / IETF 草案 / 二手信源交叉核对

---

## 摘要

**不要把这个赛道的对手平铺成一张清单——它们是三种性质完全不同的威胁，应对方式相反。**

| 类别 | 代表 | 性质 | 应对 |
|---|---|---|---|
| **A. 载波** | PEAC Protocol、x402 Receipt Attestation 草案 | 证据层的**外壳标准**，不碰支付/策略/路由 | **接入，不对抗** |
| **B. 分发垄断者** | Coinbase（Bazaar / Agentic.Market / CDP）、**卡组织（Visa TAP / Mastercard Agent Suite / Stripe MPP）** | 拥有发现层、轨道层，**且卡组织直接握有企业客户关系** | **被索引，不对抗** |
| **C. 直接技术竞品** | **Vaara（§C7，最强）**、**APort / OAP**、BlueTier（Black_Wall + Traceipt）、EVIDIQ、TrustBench（**同名四家**）、agentstamp | 与 Ledgeroot 在同一能力面竞争 | **正面竞争，靠差异化** |
| **D. 相邻/间接** | SpendGate、Infopunks、Dexter、PayAI、x402scan… · **学术论文层**（NovaFabric 等，§五 D1） | 不同层面；**论文层几乎无商业威胁，是思路来源** | **监控 / 借鉴，按需合作** |
| **E. 监管时钟** | EU AI Act 第 12 条 | 定义需求的时间表 | **对齐，但别过度承诺** |

**最重要的判断**：Ledgeroot 的早期差异化能力（收据签名、Merkle 锚定、离线验证）**已经被标准化 —— 而且我们已追平**（2026-09-17 源码复核：RFC 6962 域分隔、Ed25519 签名、三态纪律、链上结算校验、第 6 段交付证明**均已实现**，仅剩锚定权限控制未修）。这三项不再是差异化，不要再拿它们做定位。

> ⚠️ **第四次修订更正（两处）**：
>
> **(1)** 上面这句原本接着写"真正未被任何对手占据的仍是**授权强制**、**完整性证明**与**证据主权**"。**三项该结论现已全部不成立**——前两项分别被 **OAP / APort**（arXiv 2603.20953）与 **Vaara Receipt** 正式规格化并产品化，**第三项被 Vaara 以 "No SaaS. No telemetry. No signup." 直接占住**。详见 [standards-landscape.md](./standards-landscape.md) 与 [vaara-competitive-analysis.md](./vaara-competitive-analysis.md)。
>
> **(2)** 更要紧的是**性质判断错了**：这些不是"学术界的研究"，**是厂商在售产品**。APort 定价 **$499 / $4,990 月费**；Vaara 是 **AGPL 自托管 + 付费 pilot + 商业许可**，**周下载 ≈2,164**（BlueTier 的 20 倍）。**学术论文给你思路，厂商规范抢你的位置——这两件事必须分开看。**

> ✅ **本次修订的核心结论（三段合读）**：
>
> 1. **技术债已清完，密码学实现已追平最强对手**；但战略叙事所依赖的三根支柱**在同一年内被产品化的对手收走**。
> 2. **最强的对手是 Vaara，不是 BlueTier**——它在能力面、牵引、合规包装、可验证性工程四个维度同时压过我们，只剩"支付语义 + 用户自签凭据"两格留给我们。
> 3. 因此重心必须转向三件事并行：**补商业债**（RFC 3161 / 人类可读交付物 / 独立验证器 / 主网 / 公开基准）、**接入可行的标准**（Vaara profile、OAP policy pack）、以及**重排发布优先级**——对手 5 个月做到 v1.50.0，可见性工程不能再排在最后。详见 §七 与 §九。

---

## 一、威胁分类法

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
   │ Coinbase          │◄──┤  授权 + 强制 + 完整性  ├──►│ BlueTier（最同构）    │
   │ Bazaar 23k+       │   │  + 证据主权            │   │  · Black_Wall 闸门   │
   │ Agentic.Market    │   └───────────────────────┘   │  · Traceipt 收据     │
   │ CDP Facilitator   │                               │ EVIDIQ · TrustBench  │
   │ + 卡组织 Visa/MC  │                               │ agentstamp · Vaultra │
   └──────────────────┘                               └──────────────────────┘
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

| 项 | 内容 | 置信度 |
|---|---|---|
| 定位 | "可验证交互记录"的开放标准；**证据层**，明言不替代身份/支付/可观测性 | 高（规范原文） |
| 治理 | 开放标准，Apache-2.0 库；维护者 Jithin Raj（Originary） | 高 |
| 稳定格式 | `interaction-record+jwt`，规范版本 **v0.16.4（2026-08-09）** | 高 |
| 旧格式 | `peac-receipt/0.1`，已冻结，仅向后兼容 | 高 |
| 线格式 | JWS Compact，`alg: EdDSA`，Ed25519；传输头 `PEAC-Receipt: <jws>` | 高 |
| 策略面 | `/.well-known/peac.txt`（YAML），回退 `/peac.txt` | 高 |
| 验证 | 解析 JWS → 校验头 → **抓 issuer 的 `/.well-known/jwks.json`** → 验签 → 校验时间 → 校验证据 | 高 |
| 一致性等级 | L0 发现 / L1 HTTP / L2 策略 / L3 **Commerce**（含 402 流程 + 签发收据 + 验证支付证据） | 高 |
| 扩展组 | 19 组，含 **`commerce-mandate`**、`agent-action`、`gateway-export` | 高 |
| 映射 | MCP、A2A/ACP、UCP、TAP、**x402（`@peac/rails-x402`）**、Stripe | 高 |
| 争议包 | Dispute Bundle（ZIP：收据 + 策略快照 + 验证报告），用于离线审计 | 高 |
| 资金 | **有 `public-interest/support` 页面在寻求资助**；Substack 约一年 | 中 |

**它的三个关键弱点（= Ledgeroot 的接入点）**

1. **没有上链锚定。** PEAC 全程只有 JWS + JWKS，不存在 Merkle 批次或链上根。
2. **"离线"是有条件的。** 首次验证必须抓 `/.well-known/jwks.json`。只有公钥被缓存后才离线。
3. **时间新鲜度硬约束。** 规范验证步骤 5：**`iat` 与当前时间相差超过 5 分钟即拒绝**。这意味着用它对**陈年收据做审计验证会失败**——对长期合规存档是结构性缺陷。

**它明确不做的（规范/宣言原文）**

> "PEAC is intentionally not a grab-bag standard. It standardizes the evidence layer beside these systems: Global identity registries or authentication systems | Payment rails, custody, or transaction processing | Observability platforms or telemetry pipelines | **Agent orchestration or tool-routing protocols**"

> "**PEAC is not a payment rail or policy engine.**"

→ **它主动让出了"策略引擎"和"路由"两处。这正是 Ledgeroot 的所在。**

**结论：接入，不对抗。** 具体动作见 §五。

---

### A2. x402 Receipt Attestation Standard（草案）

| 项 | 内容 | 置信度 |
|---|---|---|
| 状态 | **Draft v0.2，2026-03，CC0，pre-draft/discussion，一个 GitHub gist** | 高 |
| 作者 | javierpmateos（个人） | 高 |
| 官方背书 | **无。未被 x402 Foundation 或 Coinbase 采纳。** | 高 |
| 设计目标 | 补上 x402 的空白：链上只有裸的 EIP-3009 转账，没有"买了什么/交付了什么/谁结算的/收了多少费" | 高 |
| 三个对象 | SettlementAttestation（facilitator 签，EIP-712）/ DeliveryReceipt（server 签）/ BusinessReceipt（payer 组合） | 高 |
| 锚定 | **可选**的 EVM 批量锚定：`IReceiptAnchor.anchorBatch(merkleRoot, periodStart, periodEnd)` + `verifyInclusion` | 高 |
| 锚定合约 | `ReceiptAnchorOpen`（permissionless）vs `ReceiptAnchorPermissioned`（owner-gated）；**生产环境推荐 permissioned** | 高 |
| 测试 | 46/46 通过 + 8 攻击模拟 + gas 分析 | 高 |

**它的安全评审里，有三条直接命中 Ledgeroot**

| 编号 | 发现 | 对 Ledgeroot 的含义 |
|---|---|---|
| **攻击 A4** | **伪造 Merkle 根 —— 在 permissionless 合约上"SUCCEEDS"** | ⚠️ `LedgerootAnchor.sol` 正是 permissionless 且无 owner 检查。**这个洞已在标准层面被标为已知问题** |
| **测试 3.2.4** | "Facilitator 从批次中省略收据 —— 单张签名依然有效" | ✅ 他们**明确承认省略不可检测**。Ledgeroot 的哈希链可证"序列无缺口"——**这是标准层面的空白** |
| **SI-2** | "无 facilitator 注册表"——无法区分合法 facilitator 与攻击者地址；建议用 **ERC-8004** 解决 | ✅ 印证 Ledgeroot 应接 ERC-8004；`Mandate.agentId` 字段已埋好 |
| SI-3 | 双重扣款：同一 `paymentId` 可有两笔不同 `txHash` 的有效签名 | 参考，非直接相关 |
| 攻击 A7 | `BatchAnchored` 事件泄露 `receiptCount` → 泄露活动量；建议移除 | ⚠️ Ledgeroot 的 `Anchored(epoch, root, previousRoot)` 事件泄露 epoch 序号，同类隐私问题 |

**其他值得注意的设计**

- `DeliveryReceipt.responseHash = keccak256(raw HTTP response body)` —— 这正是 Ledgeroot 六段收据第 6 段现在**假做**的东西
- 明确声明："A Delivery Receipt is a **proof of emission, not a proof of validity**"
- 依赖变更：**需要 x402 规范在 `SettlementResponse` 增加 `attestation` 字段**——尚未提交正式变更请求
- 与已合并的 `offer-receipt` 扩展（PR #935，@alftom）协调中

**结论：观察，并在合理处对齐格式。** 它不是标准，但是"标准会往哪走"的信号。特别是 A4——**它说明"permissionless 锚定不安全"正在成为共识，Ledgeroot 应主动修掉。**

---

### A3. IETF 草案（vauban 系列）—— 最值得警惕的信号

| 草案 | 内容 |
|---|---|
| `draft-vauban-x402-consolidated-00` | x402 合规化的整体缺口分析 |
| `draft-vauban-x402-stark-receipts-02` | STARK 收据格式扩展（2026-11-26 到期），Stwo Circle STARK M31 |
| `draft-vauban-x402-pqc-receipts-00/01` | 后量子纪律：混合 **ES256K + ML-DSA-65** 双签收据 |

**核心引文（几乎是 Ledgeroot 的招股书原话）：**

> "The x402 V2 protocol defines HTTP-native payment flows but leaves three gaps that block compliance use cases. First, the PAYMENT-RESPONSE carries a facilitator-issued reference rather than a **self-contained, offline-verifiable cryptographic receipt**; **an auditor cannot validate a retained receipt without contacting the facilitator.**"

**含义**：Ledgeroot 的核心卖点正在**从差异化变成合规刚需**，而且是在 IETF 层面被推进，还带 STARK 与后量子。这既是**验证**（方向对），也是**警报**（有人在抢定义权）。

**底层的加密现实**：x402 V2 的 `PAYMENT-RESPONSE` 默认签名方案是 **ES256K**（secp256k1），长期完整性依赖不存在量子计算机的假设。

---

## 三、B 类：分发垄断者

### B1. Coinbase

| 资产 | 内容 | 时间 |
|---|---|---|
| **Agentic.Market** | x402 服务公开目录，自称"任何人或机器发现 agentic 经济的**默认起点**" | **2026-04-20 上线** |
| **x402 Bazaar** | 由 CDP Facilitator 发现的目录，**收录 23,000+ x402 资源** | 已上线 |
| **CDP Facilitator** | 验证 + 结算 + 交易筛查 + 代付 gas 的托管服务；累计处理 1 亿+ 笔 x402 支付（Base + Solana） | 已上线 |
| **分发通道** | "被发现"即同时进入 CDP API、Bazaar MCP server、**Amazon Bedrock AgentCore**、agentic.market | — |

**威胁性质：分发，不是技术。**

Coinbase 结构上**不会**做本地优先、零外泄、不可见的证据层——它必须看见流量才能变现轨道。所以它的威胁是：**它成为默认发现层，而 Ledgeroot 不在里面 = 不存在。**

**应对：被索引。** 零成本的存活性动作。

---

### B2. 卡组织（Visa / Mastercard / Stripe）—— 与 Coinbase 同类，但更危险

> ⚠️ **这是上一版文档遗漏的一类威胁。** 它不属于 C 类（技术竞品），因为它不与我们比技术——它**直接握有企业客户关系**。

| 玩家 | 动作 | 关键点 |
|---|---|---|
| **Mastercard Agent Suite** | **2026-03 完成欧洲首笔现场 agent 支付** | 明确"targets enterprise use cases with **strong compliance and audit capabilities**" |
| **Visa TAP**（Trusted Agent Protocol） | RFC 9421 HTTP 消息签名；**强制 8 分钟最大时间窗** | 企业侧 agent 身份与签名标准 |
| **Stripe MPP** | Sessions 2026 一次性发布 288 项 | 直接面向已有的企业商户基础 |

#### 为什么这一类比 Coinbase 更危险

- **Coinbase** 拥有加密原生的轨道与发现层（Bazaar 23,000+ 资源）。
- **卡组织** 拥有轨道 + **真实的企业买方关系**——也就是 Ledgeroot 商业化路径（`commercialization.md` §三）里那个"付费方"。

它们**不需要发明证据层**。它们可以直接要求整个生态使用它们的格式。一旦发生，证据层的定义权就从 PEAC / x402 草案 / 我们手里转到它们手里。

#### 但这也是机会

卡组织**需要**一个证据层，而且它们通常**外购而非自建**这类能力。

→ 这正是 `commercialization.md` §十一 中 **OEM 嵌入路径**的现实买家画像。**卡组织既是最大的长期威胁，也是最合理的 OEM 客户。**

#### 观察信号

| 信号 | 含义 |
|---|---|
| 任一家发布公开的"agent 支付审计格式"规范 | 定义权转移，我们的格式必须兼容或让位 |
| 任一家开放第三方证据层接入 | OEM 窗口打开 |
| 它们把审计能力锁在自家闭环内 | 中立证据层的生存空间被挤压 |

> **置信度：中。** 以上信息来自二手信源（聚合报道与对比文章），**未查卡组织的一手规范**。需要在你方决策前核实。

---

## 四、C 类：直接技术竞品

### C1. BlueTier Operations（Black_Wall + Traceipt）—— 最同构的对手

> ⚠️ **本条目曾只覆盖 `traceipt-verify` 一个仓库。深入调研后确认：那只是一个两分钟的一次性 dump**（2026-08-05 17:37:59 创建 → 17:39:21 最后提交 → 此后再未改动；0 star / 0 fork / 0 watcher；npm 周下载 3）。**真实主体是同账号下的双产品公司 BlueTier Operations。**

#### 公司侧写

| 项 | 内容 | 置信度 |
|---|---|---|
| 主体 | BlueTier Operations（GitHub `bluetieroperations-create`，账号 id 270213615；`-create` 后缀为自动生成用户名） | 高 |
| 产品一 | **Black_Wall** —— 预行动风险闸门，**v1.0 已上线且有完整定价** | 高 |
| 产品二 | **Traceipt** —— x402 支付收据，**已在 Base 上写锚定**（`traceipt-verify` 示例为真实 Base 区块 33412876），但公司自述仍在 onboarding 首批团队 | 高 |
| 产品线形状 | **"gate before, prove after"** —— 与 Ledgeroot（策略引擎）+ MandateKey（仪表盘）**完全同构** | 高 |
| 真实牵引 | `blackwall-mcp` **111 次/周下载**（v1.4.3）；`traceipt-verify` 3 次/周（v0.1.0） | 高 |
| 活跃度 | `agent-egress-proxy` 于 **2026-09-16** 仍有提交；26 个公开仓库中 **`traceipt` 主代码库不公开**，仅放出 npm 移植的 `traceipt-verify` | 高 |

> ⚠️ **第四次修订更正**：此处原写"**BlueTier 是这一批项目里唯一有真实牵引的**"——**该判断错误**。同期数据：
>
> | 项目 | 周下载 |
> |---|---|
> | **Vaara** | **≈2,164**（PyPI 1,495 + npm 669） |
> | **APort / OAP** | **614** |
> | BlueTier `blackwall-mcp` | **111** |
> | TrustBench `verify-receipt` | **4** |
>
> **Vaara 是 BlueTier 的 20 倍。** BlueTier 只是"这一批早期小项目里唯一有牵引的"，不是整个赛道。**Vaara 已单列 §C7。**

#### 产品一：Black_Wall（真正的主体）

- `POST /api/v1/forecast` → 风险分 0–100、可逆性等级、**28 个命名失效模式**、`GO / CAUTION / STOP`、闸门 `AUTO / CONFIRM / HUMAN_REQUIRED`
- **延迟 4–8 秒** —— 因为它是 **LLM 推理层**，不是确定性规则引擎
- 定价：免费 ~100 次/月 / $29 / **$199（含"决策收据审计轨迹"）** / 企业版
- 集成面：LangChain、CrewAI、Pydantic AI、AutoGen、LlamaIndex、Vercel AI SDK、OpenAI、Stripe、PayPal、Coinbase；ElizaOS / Hermes / OpenClaw 插件；GitHub Action 拦 CI/CD
- **发布可复现公开基准**（InjecAgent + AgentDojo 改编、raw-Haiku 基线、结论带签名收据可验证）—— **Ledgeroot 目前没有对标物**
- 决策收据：Ed25519 签 `(request, response)` 的规范哈希；`/.well-known/blackwall-signing-keys.json` + 无状态验证端点；**只存哈希，从不存原始请求/响应体**

**两个值得学的地方**

1. **`gate()` 默认 fail-closed**，原文：*"If no verdict can be obtained (network / auth / timeout), the action does not run unless you explicitly pass failOpen: true. **A risk gate that fails open is not a risk gate.**"* —— 与 Ledgeroot 同一哲学，但表述锋利得多。
2. **`observe` 闭环**：回传真实结果（`matched / over_scope / diverged / aborted`）以追踪预测准确率。

**关键：Black_Wall 主动声明不做 Ledgeroot 做的事。**

其营销页专设一节 "Rules vs. reasoning"，明确写道：*"策略和鉴权引擎是快的、确定性的、不可或缺的 —— 它们抓住你能预想到的；Black_Wall 抓你没预想到的"*，并主张 **"Run it alongside your policy or auth layer"**。

→ **它是"未知的未知"的推理层；Ledgeroot 是"已知约束"的确定性强制层。两者可互补，不必然冲突。**

#### 产品二：Traceipt

流程：402 → 结算 → **上链确认转账确实发生，然后由 Traceipt 签名** → 进链、折进 Merkle 根 → 任何人日后离线验证。USDC on Base，可自托管，"one dependency"。收据可渲染为**带扫码验证的 VAT 合规 PDF**。

**它的合规表述是本赛道最诚实的**：*"no rule today names a receipt like this. We are ahead of the mandate, not compelled by it."* 并正确指出 FATF/MiCA 针对**受监管中介且有金额门槛**，不是美分级 agent 支付。**§六 警告的过度承诺，它主动避开了。**

#### 状态修正：密码学实现已打平（2026-09-17 复核）

> ✅ **本节原标题为"它的密码学实现比 Ledgeroot 严谨"。对照当前源码逐条复核后，该结论有 4 项已失效——Ledgeroot 已经追平。**下表为复核结果，旧表以文末"已修记录"保留。

`traceipt-verify` README 自述的四项检查（verdict binding / RFC 6962 inclusion proof / on-chain anchor / signature）对应的实现，现在逐一对照：

| 项 | Traceipt | Ledgeroot（当前源码） |
|---|---|---|
| **Merkle 构造** | RFC 6962：`leaf = SHA256(0x00 ‖ data)`、`node = SHA256(0x01 ‖ L ‖ R)`，字节操作 | ✅ **已对齐**。`anchor/merkle.ts` 实现完整 RFC 6962 MTH，含 `0x00` / `0x01` 域分隔、按**字节**运算、以 2 的幂切分（不再复制奇数末节点） |
| **签名** | JWS 式 `protected` header，签名覆盖 `canonicalJson({payload, protected})` → `alg` / `kid` 落在被签字节内 | ✅ **已对齐**。`verifyAttribution()` 校验 `protected.alg` 与 kid，签名覆盖含 `protected` 的规范字节，算法与密钥 id 不可替换 |
| **三态纪律** | `ok: true \| false \| null`，`null` = SKIP，*"never silently passed"* | ✅ **已对齐**。`IssueKind = "tampered" \| "incomplete"`，`classify()` 中 `tampered` 优先于 `incomplete`，缺证据与被篡改真正分开 |
| **链上锚定** | 根写入 Base 交易 calldata（`TRACEIPT-ANCHOR` 标记），验证时要求 calldata 精确等于标记+根 | ⚠️ **打平，各有弱点**。Ledgeroot 走 `LedgerootAnchor.anchor(bytes32)`（有事件日志，但**仍无权限控制**）；Traceipt 只比对 calldata 内容、**不校验交易的 `from`** —— 两边都无法证明"谁锚的" |
| **后量子** | 支持混合 **ML-DSA-65** 双签（npm 验证器只验 Ed25519 层，如实报告 PQ 层"存在但未验证"） | ❌ **仍落后**。Ledgeroot 无 PQ 方案 |
| **跨语言规范化** | 拒绝浮点；键按 **Unicode 码点**排序（非 JS 默认 UTF-16 码元）；同时支持 Python `ensure_ascii` 两变体 | ⚠️ **仍落后**。Ledgeroot 用 `canonicalize` 包（RFC 8785），未处理跨语言变体 |
| **独立验证器形态** | 独立 npm 包，退出码 0/1/2，`--offline` 可跳过 RPC 检查 | ⚠️ **仍落后**。验证器与本地库/SQLite schema 耦合，第三方难以独立引用 |

<details>
<summary>已修记录（旧表，保留以便追溯）</summary>

| 项 | 旧表当时的结论 | 现状 |
|---|---|---|
| Merkle 构造 | ⚠️ `sha256Hex(level[i] + right)`，无域分隔，十六进制拼接，奇数层复制末节点 | ✅ 已修 |
| 签名 | ❌ 完全无签名 | ✅ 已修 |
| 三态纪律 | ⚠️ `classify()` 永远返回不到 `incomplete` | ✅ 已修 |
| 链上结算内容校验 | ❌ 只信任 facilitator 返回的 txHash | ✅ 已修（`src/verify/onchain.ts` 拉 tx、解 ERC-3009、比对 from/to/value） |
| 六段收据第 6 段 | ❌ `segments.delivery = { payloadHash: payment.txHash }` —— 把 txHash 抄进交付凭证 | ✅ 已修（`pay.ts` 对 `responseBody` 做 `contentHash` + `payloadSize`） |
| 锚定后误报篡改 | ⚠️ 每次用**全量**收据算根，epoch 1 之后再支付一笔即报 `tampered` | ✅ 已修（`verifyAnchor` 按 `receiptCount` 切片） |

</details>

> ⚠️ **剩下的真实落差只有三项**：**后量子签名**、**跨语言规范化变体**、**独立验证器包**。前两项是追赶工作，第三项是"第三方能否不装 Ledgeroot 就完成验证"——它直接关系到 §八 支柱 2 能否变成可卖的东西，优先级高于前两项。

#### 它的弱点（可攻击面）

1. **锚定不可归属**：验证器只比对 calldata 内容，**不校验交易的 `from` 地址** → 任何人都能用该标记锚任意根。*（注：Ledgeroot 的 permissionless `anchor()` 有同类问题，但至少有合约地址可加 owner；两边都缺，谁先修谁得分。）*
2. **无用户签名授权**：由 **Traceipt 自己**签名，没有 EIP-712 mandate 约束"允许付给谁、付多少"。**它证明发生了什么，不证明那件事被授权过。**
3. **无非省略证明**：包含证明只证"收据 X 在批次 B 内"，**不能证明 B 含全部收据，也不能证明批次之间无跳号**。它的四步检查里没有一项对应"没有任何收据被省略"。
4. **主代码库不公开**：`traceipt` 仓库不在 26 个公开仓库之列，只放出 npm 移植的 `traceipt-verify`；README 提到的 Python 参考实现（`tools/verify.py`）无法核查。
5. **仍处早期**，`traceipt-verify` 3 次周下载。

**它比 Ledgeroot 强的地方（要认）**

1. **已在 Base 上跑锚定**（验证器示例为真实区块），Ledgeroot 仍在 Monad **测试网**——⚠️ **但测试网是刻意选择**（Monad 黑客松，且与该链的高吞吐定位对齐），见 [architecture-gaps.md](./architecture-gaps.md) §D1
2. **VAT 合规 PDF + 扫码验证**——直接进了会计的流程。Ledgeroot 没有任何人类可读的交付物。
3. **混合 ML-DSA-65 后量子双签**，且验证器如实标注"PQ 层存在但未验证"，不吹牛。
4. **独立验证器包**（零依赖 npm，退出码约定，`--offline` 开关）。
5. **Black_Wall 的可复现公开基准**——用数据建公信，Ledgeroot 无对标物。

#### 对照总结

| | BlueTier | Ledgeroot |
|---|---|---|
| 策略层 | 托管 API + **LLM 推理，4–8 秒** | **本地 + 确定性规则，毫秒级** |
| 授权来源 | 无用户签名授权 | **EIP-712 用户签名 mandate** |
| 证据签发 | 厂商 Ed25519 签名 | Ed25519 签名 + **哈希链回指（用户可验）** |
| 密码学严谨度 | RFC 6962 / JWS / 三态 | **已对齐**（仍在 PQ 与跨语言规范化上落后） |
| 数据出境 | 哈希出、原文不出 | **零出境** |
| 完整性（防漏发） | ❌ 无 | ✅ **哈希链可证无缺口** |
| 拒绝留痕 | ❌ 无 | ✅ 拒付同样出收据 |
| 人类可读交付物 | ✅ **VAT 合规 PDF + 扫码验证** | ❌ 无 |
| 独立验证器 | ✅ 独立 npm 包 | ⚠️ 与主库耦合 |
| 网络状态 | **Base 主网** | Monad **测试网**（⚠️ **刻意选择**，见 [architecture-gaps.md](./architecture-gaps.md) §D1） |
| 公开基准 | ✅ **有（可复现 + 带签名收据）** | ❌ 无 |

**威胁等级：高**（架构最同构、唯一有真实牵引、密码学已打平、多出 VAT PDF 与公开基准）。**但三根支柱——用户签名授权、非省略证明、证据主权——仍未被覆盖。**


### C2. EVIDIQ Notary

`evidiq.dev/docs/notary` · 远程 MCP server（`https://mcp.evidiq.dev/notary/mcp`）· 已上架 **OKX.AI**（Agent #6278）

| 项 | 内容 | 置信度 |
|---|---|---|
| 存证对象 | **AI 推理输出**（prompt + response + modelId），**不是支付** | 高（文档原文） |
| 密码学 | `keccak256(prompt ‖ response)` 内容哈希 + **EIP-191** 签名（EVM 密钥，非 Ed25519）+ Merkle proof | 高 |
| 锚定 | **0G Storage**（Aristotle 主网，chain 16661），经 0G turbo indexer 上传，返回 `storageRoot` + `storageTx` | 高 |
| 支付 | x402 v2，USDT0 on **X Layer（196）**，EIP-3009 gasless | 高 |
| 工具面 | 6 个 MCP 工具：2 付费（`notarize_inference` $0.001 / `notarize_batch` $0.005）+ 4 免费（`verify_attestation` / `get_receipt` / `notary_stats` / `notary_pubkey`） | 高 |
| 离线验证 | ✅ 拿 notary 地址 → 重算内容哈希 → 恢复 EIP-191 签名者 → 验 Merkle proof，全程不联系 notary | 高 |
| 发现面 | ✅ MCP endpoint + `/skill.md` + `/x402` 定价发现端点（Claude Code 一行 `claude mcp add` 即接入） | 高 |
| 自我定位 | 原文：*"EVIDIQ Notary produces **evidence, not permission**. A receipt proves the output existed — it does not vouch for the output's correctness."* | 高 |

**它的结构性弱点（Ledgeroot 的叙事靶子）**：**prompt 与 response 全文上传到它的服务器**。它证明"这个 AI 说过这句话"，代价是你把这句话交给了第三方。在"不能外发数据"的企业面前直接出局——而这正是 `commercialization.md` §一 里那个"付费方"的硬约束。

> ⚠️ 注意其免责声明与全行业一致："produces evidence, not permission"。**这句话反过来就是 Ledgeroot 的定位**——它是唯一同时产出 evidence 和 permission 的。

**威胁等级：中高**（锚定 + 离线验证 + MCP-native 发现面都齐全，但**存证对象不同**：它记"AI 说了什么"，Ledgeroot 记"agent 付了什么、被授权付什么"）。

---

### C3. TrustBench —— ⚠️ 这是一个同名撞车，至少四个产品

> ⚠️ **本仓库的 [trustbench-competitive-analysis.md](./trustbench-competitive-analysis.md) 只覆盖了其中第一个，而且是四个里最弱的一个。**检索"TrustBench"会同时命中四家，对外沟通时必须带域名限定。

| # | 实体 | 定位 | 关键事实 | 对 Ledgeroot 的威胁 |
|---|---|---|---|---|
| 1 | **`trustbench.io`**（lithvall，旧金山/单人） | x402 **注册表 + 无托管路由器 + 签名收据** | 1592 个已登记端点；**近 30 天签发收据 0**；GitHub 0 star；`@trustbench/verify-receipt` 周下载 4；**明确不做上链锚定**（"Phase 5 if real demand surfaces"） | **中**（技术弱，但发现面强，且与你正面撞在"收据"这一层） |
| 2 | **`trustbench.net`** | **AI 输出质量评估 SaaS**：准确率 / 引用 / 幻觉 / 数据泄露 四维打分 | 定价 Free / **$249/mo** / Enterprise；"TrustBench Verified" 徽章可嵌入官网 | **低**（不同产品，但在搜索结果里抢名字） |
| 3 | **`trustmodel.ai/trustbench`** | 企业 AI 评估引擎，10 个信任维度，700 万+ 测试提示 | 面向采购/部署/合规决策，宣称 230+ 系统自动检测 | **低**（同上，抢名字） |
| 4 | **arXiv 2603.09157**（ASU + UCLA） | **学术框架：执行前实时信任验证** | *"operates at the critical decision point: **after an agent formulates an action but before execution**"*；<200ms；宣称有害动作降 87%；医疗/金融领域插件 | **中高（概念层面）** |

**第 4 条最值得警惕。** 它是学术论文而非产品，但它**把"预行动验证"这件事正式学术化了**，还给出了量化结果和领域插件架构。两个后果：

1. Ledgeroot 若用"预行动闸门"这个词做定位，现在要同时面对 **Black_Wall（有定价有牵引）** 和 **这篇论文（有方法论有数据）**。
2. 它的弱点是决定性的：**它是 LLM-as-a-Judge + 等渗回归校准，不是确定性规则引擎**，而且**没有任何用户签名授权、没有锚定、没有完整性证明**。它是"猜这个动作安不安全"，Ledgeroot 是"证明这个动作被授权过"。**这个区分必须写进定位话术。**

> 对 #1 的完整拆解见 [trustbench-competitive-analysis.md](./trustbench-competitive-analysis.md)；注意该文档 §四"Ledgeroot 落后之处"列的 8 条中有 6 条**已在当前源码中修复**，阅读时请以该文档顶部的修正说明为准。

---

### C4. agentstamp —— 身份 / 声誉，不是支付

`agentstamp.org` · GitHub `vinaybhosle/agentstamp`（单人 Vinay Bhosle，2026-03-11 创建，1 star）

| 项 | 内容 |
|---|---|
| 定位 | **去中心化 agent 身份注册表 + 信任评分**；自称 "Trust Intelligence Platform" |
| 规模 | 55 个 API 端点 / 19 个 MCP 工具 / 4 档戳记 / 2 条链（Base + Solana）/ 3 个 SDK（npm、PyPI、MCP） |
| 密码学 | **Ed25519 签名戳记**（Free / Bronze / Silver / Gold 四档）；信任分 0–100 带时间衰减与动量；HMAC-SHA256 盲令牌做隐私验证 |
| "审计"能力 | **SHA-256 哈希链事件日志**——但记的是**平台事件**（戳记、背书、信任变更），**不是支付收据** |
| 支付 | x402，USDC on Base + Solana，PayAI 做 facilitator；按次 $0.001–$0.01 |
| 其他 | 信任委派（背书形成信任网）、跨链钱包绑定、Webhook 告警、愿望井（悬赏）机制 |

**判定：互补大于竞争。** 它做的是 **ERC-8004 声誉领域**——`commercialization.md` §四 已明确划出"不是卖方市场"。反过来，`Mandate.agentId` 字段正是为接 ERC-8004 留的：**它可以是 Ledgeroot 的身份来源，而不是对手。**

**威胁等级：低**（层级不同；但它有哈希链，容易被外行误读成"和我们一样"）。

---

### C5. Vaultra —— 非加密路线的合规收据

`vaultra.io` · GitHub `Jerryto10/vaultra` · PyPI `vaultra`（2026-03-06 创建，2026-08-03 最后提交，0 star）

| 项 | 内容 |
|---|---|
| 定位 | **"AI Agent Compliance Layer"**——7 层框架，包裹任意 AI agent，为**每个决策**产出 Compliance Receipt |
| 七层 | ① Ed25519 身份 ② 输入清洗（prompt injection 检测）③ 不可变哈希链账本 ④ 异常检测 ⑤ **人工闸门** ⑥ **RFC 3161 时间戳** ⑦ API key |
| 交付物 | 签名 PDF + 可验证 JSON；每张收据有**公开验证 URL**，审计方无需登录、无需访问你的系统 |
| 时间戳 | **RFC 3161，由 Sectigo eIDAS QTSP 签发**（eIDAS Art. 41），"Not even Vaultra can alter it" |
| 合规叙事 | 主打 **EU AI Act**：Art. 13 映射、Art. 14 人工监督；官网打 €35M / 7% 营收罚则 |
| 定价 | **$299/mo**，30 天免费，目标"首批 10 家 fintech"；自称对标 Zenity（€100K+/yr）与 Vanta |
| 状态 | Early access，**无牵引证据**；公司实体未披露 |

**它拿的是 Ledgeroot 没有的东西：RFC 3161 合格时间戳。** Merkle 锚定证明"这个根在这个区块之前存在"，但**不等于法定时间戳**——在 EU 监管语境下，eIDAS QTSP 签的 RFC 3161 戳具有它自己的法律地位。这是 Ledgeroot 需要正视的一条合规落差。

**它的弱点**：全文上传到 Vaultra（非本地）；**层 ⑤ 的人工闸门是托管的产品功能，不是用户签名授权**；无 Merkle 锚定、无非省略证明；无牵引、无公开技术细节；"3 行代码"意味着它必然在请求路径里。

**威胁等级：中**（不同买方与不同叙事入口，但**在同一条 EU AI Act 战线上抢位**，且它有一条 Ledgeroot 缺的合规凭据）。

> 📌 **NovaFabric（arXiv 2609.12582，2026-09-11）** 与 Vaultra 是同一思路的学术版且更完整——见 §五 D 类。

---

### C6. 其他签名收据实现

| 项目 | 内容 | 威胁 |
|---|---|---|
| **anchor-x402-mcp** | 签名决策证明 + OFAC 端点 | 中 |
| **certifieddata.io** | Agent Commerce 收据 | 低 |
| **Loomal** | Ed25519 签名收据（glossary/产品） | 低 |
| **minia2a.uk** | 收据绑定 / 过期 / 重放拒绝的研究与实现 | 低（但观点值得读） |

### C7. Vaara —— ⚠️ 目前最接近的对手（第四次修订新增）

> 📄 **完整拆解见 [vaara-competitive-analysis.md](./vaara-competitive-analysis.md)。** 本节只给定性。

| 项 | 内容 |
|---|---|
| 主体 | Henri Sirkkavaara，**唯一版权持有人**，单人；付费 pilot 由作者本人承接 |
| 许可 | **AGPL-3.0-or-later**（v0.70.0 及以前为 Apache-2.0）；闭源嵌入需商业许可；**不接受第三方代码贡献**（为保留再许可能力） |
| 版本 / 活跃度 | **v1.50.0**；2026-04-20 建仓，**5 个月**；最后提交 2026-09-17 |
| 牵引 | **≈2,164 次/周**（PyPI 1,495 + npm 669）；GitHub 仅 12 star（CLI 分发形态，star 低估它） |
| 定位 | **自托管证据与门控层**——"**Open source. No SaaS. No telemetry. No signup.**" |
| 占据的支柱 | ⚠️ **三根全占**：v1.1.0 强制执行（credential broker + attestation-bound grant + gateway + typed capability scopes）；v1.4.0 gap-evident completeness（逐条签名 seq + running count，`vaara verify-contiguity`）；**且自托管零出境** |
| 它独有的工程 | **Vaara Resin**（单 HTML 断网验证，"verification is not a service and Vaara is not a party to it"）、**v1.14.0 独立重铸逐字节重现**、**50 套一致性套件公开且无黑名单**、TPM 2.0 + IMA 硬件根植、eIDAS 合格时间戳、逐条 EU AI Act 证据 + Notified-Body PDF、SLSA L3 + Sigstore + fuzzing、**自家营销站点跑在自己的门控下** |
| 它没有的 | ❌ 支付语义（x402 只是下游 profile）、❌ 用户自签凭据（grant 由**它自己的 broker 铸造**）、❌ 报价漂移 / payTo / 累计限额、❌ 链上锚定（用 RFC 3161，**合规上这是优势**） |
| 弱点 | 巴士系数 = 1、不收外部贡献、**强制执行与完整性默认关闭**、12 star 无社区表面、AGPL 对企业法务的摩擦 |

**威胁等级：最高。** 它是唯一一家在**能力面、牵引、合规包装、可验证性工程**四个维度同时压过 Ledgeroot 的对手。**Ledgeroot 仅剩的差异是"支付语义 + 凭据由用户自签"两条。**

> 📌 **注意它不属于"载波"。** 它的格式开放接入，但它有定价、有牵引、在与我们抢同一位置——**"格式开放"不等于"不是对手"**。见 [standards-landscape.md](./standards-landscape.md) §7.2。

---

## 五、D 类：相邻与间接

| 项目 | 定位 | 与 Ledgeroot 的关系 |
|---|---|---|
| **SpendGate.ai** | 代理/治理层，按 agent 的策略 | 功能重叠（策略），但托管在请求路径里；TrustBench 视其为对手 |
| **Infopunks** | 信任层 / 智能评分 | 潜在互补（它要证据，Ledgeroot 产证据） |
| **Dexter / x402gle** | 全栈：支付 + 发现 + 数据 + 广告；代币融资，2500 万+ 结算 | 间接，但规模与资金碾压 |
| **x402b（Pieverse）** | x402 扩展，BNB Chain；pieUSD 免 gas，**收据存 BNB Greenfield**，主打 "audit-ready"；**融资 $7M，Animoca Brands + UOB Ventures 背书** | ⚠️ 本赛道**首个有机构资金**的收据竞品；但收据与 BNB 生态强耦合、不可自托管 |
| **PayAI / pay.sh** | Solana 侧，Google Cloud + Solana Foundation 背景，50+ facilitator | 间接；多链维度 |
| **x402scan**（Merit Systems） | 开源发现仪表盘，Coinbase Dev 背书 | 发现层 |
| **x402atlas** | 实时分析，已发 PEAC-Receipt 头 | 发现层 + 已是 PEAC 采纳者 |
| **402index.io** | 协议无关（L402 + x402 + MPP），15,000+ API | 发现层；多协议覆盖更广 |
| **Pylon / agentsvc.io / httpay.xyz** | 商户型：17+ / 20+ / 186 端点 | 供给侧；httpay 一个周末 186 个端点 |
| **OpenRegistry**（Sophymarine） | 26 个司法辖区的注册数据，免费 MCP | 可能的合作对象 |
| **AWS Bedrock AgentCore** | 审计轨迹打包 + 作为 Bazaar 分发通道 | 平台级；既是渠道也是威胁 |
| **AgentlyHQ / use-agently / aixyz** | 框架 + 市场 | 框架层，正交 |

### D1. ⚠️ 学术与标准层 —— 已单独成文，且结论比想象的严重

> 📄 **完整调研见 [standards-landscape.md](./standards-landscape.md)。** 本节只保留摘要与指向。

2026 年 3–9 月间，这一层从"零散论文"变成了**带一致性测试向量的正式规范**。原分类法（载波 / 垄断者 / 直接竞品 / 相邻 / 监管）**没有覆盖"学术与标准的定义权"这一层**，而它现在是威胁最大的那一层。

| 工作 | 性质 | 占据了什么 |
|---|---|---|
| **OAP**（arXiv 2603.20953，2026-03-21，APort） | Apache-2.0 规范 + 参考实现 + 线上 CTF + 标准提案 | ⚠️ **支柱 1**：签名 passport、21 个策略包、fail-closed、签名拒绝 + reason code、Claude Code 等 6 框架钩子、p50 53ms |
| **Vaara Receipt**（`draft-sirkkavaara-vaara-receipt-10`，2026-09-04，28 页） | IETF 草案 + 公开一致性向量 + 独立 checker | ⚠️ **支柱 2**：`seq` + 签名 `runningCount` + 封存记录 + RFC 3161 锚——**比 Ledgeroot 更完整** |
| **PCAS**（2602.16708）/ **AgentSpec**（2503.18666）/ **AgentGuardian** / **Safiron** / **Proof-of-Guardrail**（2603.05786）/ **L-DREA** | 论文 | 支柱 1 的其他路线（Datalog 参考监视器、TEE 证明、学习型策略） |
| **NovaFabric**（2609.12582） | 预印本 | 会话级执行证据；self-contained tier 最接近"证据主权" |
| **TRACE**（IEEE BigDataSecurity 2026）/ **Salfeld-Nebgen**（2606.26298）/ **He & Yu**（2606.20520、2606.11632） | 论文 | 逐动作证明 + 机构证明模型 |
| **IETF 六草案**：ACTA、**ASQAV**（映射 EU AI Act + DORA）、AgentROA、sahu 动作收据、**kuehlewind 审计架构**、VCP | 草案 | 收据信封、强制代理、审计架构——**定义权正在被分配** |
| **SoK**（2604.15367） | 系统化综述 | agentic commerce 的 5×12 威胁分类；**D2「transaction authorization」已映射 AP2/ACP/MPP/x402** |

**两条必须记住的判断**：

1. **支柱 1 与支柱 2 都已被占据**，后者由 Vaara 做得更完整（逐条粒度、缺口最坏情况界定、独立可验证性、eIDAS 时间戳）。`commercialization.md` §四 把"唯一能证明没有遗漏"当作唯一可变现之物——**该结论已不成立**。
2. **"transaction authorization" 已是学术通用术语**（SoK 的 D2 维度），不再是可占位的概念。

> 📌 剩余真空只有三条，且都不是"技术做不到"：**本地优先/零外泄作为一等承诺**、**用户 EIP-712 签名 mandate 作为授权凭据**、**三者的合并**。详见 [standards-landscape.md](./standards-landscape.md) §六 §七。

---

## 六、E 类：监管时钟

### EU AI Act 第 12 条（记录保存）

| 项 | 内容 |
|---|---|
| 生效 | 《AI 法案》2024-08-01 生效，分阶段适用 |
| 关键日期 | **2026-08-02** —— 大多数**高风险** AI 系统的完整合规截止日 |
| 第 12 条要求 | 高风险系统须具备自动记录（logging）能力，覆盖系统生命周期 |

> ⚠️ **重要限定：第 12 条只覆盖"高风险 AI 系统"**——即作为受监管产品安全组件的系统，或附件 III 列举的用途（就业、关键服务、信贷、教育等）。**不是所有 agent。**

**对 Ledgeroot 的含义**：这是一个真实但**窄**的顺风。可以用它做叙事入口，但**不要宣称"所有 agent 都必须合规收据"**——过度承诺会被技术读者当场拆穿，而 TrustBench 的战略文档里正好记录了他们自己犯过这个错（"benchmark" 框架被拆穿后不得不重写定位）。

---

## 七、半衰期分析：什么正在商品化

| 能力 | 当前状态 | 商品化压力 | 估计半衰期 | **Ledgeroot 现状** |
|---|---|---|---|---|
| 签名收据（Ed25519/JWS） | 已商品化 | PEAC、TrustBench、agentstamp、Vaultra、BlueTier、EVIDIQ、NovaFabric… | **已过** | ✅ 已有 |
| Merkle + 链上锚定 | 快速商品化 | Traceipt 已上线、x402 草案写成标准、EVIDIQ、IETF | **6–12 个月** | ✅ 已有（RFC 6962 已对齐） |
| 离线验证 | 快速商品化 | PEAC、Traceipt、TrustBench、EVIDIQ 都声称支持 | **6–12 个月** | ✅ 已有，且**零网络**（对手多需抓 JWKS / RPC） |
| 交付证明（response hash） | 已有标准提案 | x402 草案的 DeliveryReceipt；**Black_Wall 已在签 (request, response)** | **6–12 个月** | ✅ 已有（第 6 段已修）；**且拒付也出收据——无人对标** |
| 预行动闸门（一般意义） | **已被占据** | **Black_Wall v1.0 有定价、111 次/周下载**；**arXiv TrustBench 已学术化** | **已过** | ⚠️ 有，但**不要用这个词**（见下） |
| 会话级执行证据（非支付） | 学术已占位 | NovaFabric 的 Run Capsule / Evidence Bundle | — | ❌ 不在范围内（但要知道它的存在） |
| 人类可读交付物（VAT PDF / 审计报告） | 已被占据 | **Traceipt（VAT 合规 PDF）、Vaultra（auditor-ready PDF）** | **已过** | ❌ **无** ← 这是进会计流程的门票 |
| **用户签名授权的确定性强制** | ❌ **已到期**（2026-09-17 修正） | **OAP（arXiv 2603.20953）已规格化并实测**：签名 passport + 21 策略包 + fail-closed + 签名拒绝 + 6 框架集成；PCAS 用 Datalog 参考监视器走另一条路 | **已过** | ⚠️ **仅剩"用户自己签"+"零出境"两点差异** |
| **非省略证明（完整性）** | ❌ **已到期**（2026-09-17 修正） | **Vaara Receipt §6.4 已规格化且更完整**：`seq` + 签名 `runningCount` + 封存记录 + RFC 3161 锚 + `maxClass`；带公开一致性向量 | **已过** | ❌ **落后**（无逐条计数、无缺口最坏情况、无独立 checker） |
| **证据主权（本地 + 零外泄 + 有强制力）** | ❌ **已到期**（第四次修订更正） | **Vaara 已占据**："No SaaS. No telemetry. No signup." + 断网单文件验证 + "证据不依赖厂商"；OAP 走云端注册表、EVIDIQ / Vaultra 全文上传、Traceipt 哈希出境 | **已过** | ⚠️ **仅剩平价，且我们这一侧还差一截** |
| 合格时间戳（RFC 3161 / eIDAS） | **已商品化** | **Vaara（含 eIDAS 合格 TSA）、Vaultra、NovaFabric** 都已有；RFC 3161 本身还有**自托管**形态（OpenSSL ts） | **已过** | ❌ **无** |
| 公开一致性向量 + 独立 checker | **已商品化** | **Vaara（`_check_independent.py`）、Traceipt（`traceipt-verify`）、TrustBench（`verify-receipt`）** 都有 | **已过** | ❌ **无** |
| **用户签名的授权凭据本身** | **无人在做** | OAP 的 passport 由**注册表签发**；Vaara 的 grant 来自 **credential broker**；两者都不是"用户自己签、私钥不出本机" | **低** | ✅ **独有 ← 但这只是凭据形式，不是完整能力** |

**读法（2026-09-17 修正后）**：

- **只有最后一行"低"是真正剩下**——而且它只是**凭据形式**上的独有，不是完整能力。
- **前两行从"低"变成"已过"**：支柱 1 与支柱 2 都被正式规格化了。**不要再拿它们做定位。**
- 上面已商品化的能力应**接入标准或停止自研竞争**。其中已被对手拉开、需要补的是：**后量子签名、跨语言规范化、独立验证器包**（见 §C1 状态修正）、**RFC 3161 合格时间戳、公开一致性向量**（见 [standards-landscape.md](./standards-landscape.md)）。

> ⚠️ **新增两条被低估的商品化压力**：**RFC 3161 合格时间戳**与**人类可读交付物**。前者 Vaultra 与 NovaFabric 都已用上，且它在 EU 有独立法律地位；后者 Traceipt 与 Vaultra 都已交付 PDF。Ledgeroot 目前两者皆无，而这两样恰好是"把证据卖进企业"时最先被问到的。


> ⚠️ **用词警告（压力已加倍）**：**"预行动闸门 / pre-action gate" 这个概念已经被两方占据**——**Black_Wall**（v1.0、有定价、111 次/周下载）与 **arXiv TrustBench**（2026-03，ASU+UCLA，"after an agent formulates an action but before execution"，<200ms，有害动作降 87%）。Ledgeroot 若用同一词汇做定位，会被当作它们的劣化版（4–8 秒 → 毫秒级会被读成"想得更少"）。
>
> **应改用"用户签名的确定性强制"**——把差异点（谁签的、确定性、本地）放进词本身。并且必须能一句话说清与这两者的区别：
>
> - vs **Black_Wall**：它是**托管 LLM 推理**（猜"这个动作危险吗"），我们是**本地确定性规则**（证"这个动作被授权过吗"）。
> - vs **arXiv TrustBench**：它是 **LLM-as-a-Judge + 等渗回归校准**（估计可信度），我们是 **EIP-712 用户签名 mandate 的 fail-closed 执行**（证明授权边界）。
> - **它们给的是概率判断；我们给的是可离线验证的授权证明。**

---

## 八、Ledgeroot 的防御位置（三根支柱）

> ⚠️ **2026-09-17 重大修正**：本节原写"三根支柱均未被覆盖"。经 [standards-landscape.md](./standards-landscape.md) 的学术与标准层调研，**支柱 1 与支柱 2 均已被正式规格化**，其中支柱 2 由 Vaara Receipt 做得比 Ledgeroot 更完整。**支柱 3 是唯一形态未变的。**

| 支柱 | 原状态 | 现状态 | 占据者 |
|---|---|---|---|
| 1. 用户签名授权 + 执行前确定性强制 | "无人完整实现" | ❌ **已被占据**（规范 + 参考实现 + 线上实测 + 6 框架集成） | **OAP**、PCAS 等 |
| 2. 完整性（非省略） | "无人在做" | ❌ **已被占据且更完整** | **Vaara Receipt §6.4** |
| 3. 证据主权（本地 + 零外泄） | "无人在做" | ❌ **已被占据**（第四次修订更正） | **Vaara**：自托管、无 SaaS、无遥测、断网可验 |

### 支柱 1：授权，不是存证 —— ⚠️ 已被 OAP 占据

Ledgeroot 的做法本身没错：

```
用户 EIP-712 签名 mandate（白名单 / payTo 绑定 / 报价漂移 / 限速 / 累计上限）
    → 执行前 fail-closed 校验
    → 拒绝也生成收据（留痕）
    → 授权与执行的一致性可被事后审计
```

**但 OAP 已经把这套做成了规范、参考实现、和一个跑着数据的线上对抗测试场**（详见 [standards-landscape.md](./standards-landscape.md) §1.1）：

- 它有 **Ed25519 签名 passport**（含 `currency_limits{max_per_tx, daily_cap}`）、**21 个策略包**、fail-closed、**带 reason code 的签名拒绝记录**
- 它有 **6 个框架的生产集成**，包括 **Claude Code `PreToolUse`**
- 它有实测数据：4,437 次判定 / 1,151 会话，宽松策略下社科工程成功率 **74.6% → 严格策略下 0%**
- 它把五条性质（确定性 / 完备性 / fail-closed / 非绕过 / 可审计）做了形式化，并提出标准控制类 **PAA-1…PAA-5**
- 许可 **Apache 2.0**，规范带 DOI

原表的三条论据现在两条失效：

- ~~PEAC 明言不做 policy engine~~ → **OAP 做了，而且做全了**
- ~~TrustBench 的限额是厂商按 API key 发的，用户无法验证~~ → **仍成立**，但这不再是独特卖点
- ❌ ~~"用户签名的意图 → 机器强制执行 → 拒绝也有据"这条链，目前无人完整实现~~ → **不成立**

**仅存的差异只有两条**（详见 standards-landscape.md §1.3）：**凭据由用户自己签（而非注册表签发）**，以及**零出境**。其余被覆盖或反超——OAP 还在两处比 Ledgeroot 强：**框架钩子面**与**组合攻击的诚实披露**。

### 支柱 2：完整性（非省略）—— ⚠️ 已被 Vaara Receipt 占据，且更完整

> ❌ **本节原标题下的结论"无人在做"已不成立，`commercialization.md` §四 据此得出的"唯一可以拿去卖的东西"同样不成立。**

Vaara Receipt（`draft-sirkkavaara-vaara-receipt-10`，2026-09-04，28 页）§6.4 规格化了完整的 held-set 完整性机制：

| 层 | Vaara | Ledgeroot |
|---|---|---|
| 顺序 | 单调 `seq` | `prevHash` + `seq` |
| 漏发检测 | **签名进记录的 `runningCount`**，逐条 | epoch Merkle 根 + `receiptCount`，逐 epoch |
| 尾部截断 | 显式**封存记录** `total: N` | 隐含（按 `receiptCount` 切片） |
| 残余情形 | **对 `runningCount` 打 RFC 3161 锚** | 靠下一 epoch 的链上锚（等效） |
| 缺口最坏情况 | **`maxClass`**，可在执行期消费 | ❌ 无 |
| 独立可验证 | ✅ 公开向量 + 不 import 签发方代码的 checker | ❌ 与主库耦合 |

它的原文明确宣称：*"None defines the held-set completeness mechanism ... **This document specifies both.**"*

**保留仍然成立的部分**：x402 草案测试 3.2.4 确实显示"遗漏不影响单张签名有效性"，因此"**能证明没漏**比每张都签名更硬"这个判断依然正确——**只是它不是我们独有的洞察，也不再有独家的实现**。

### 支柱 3：证据主权 —— ❌ **也被占了，是 Vaara 占的**

> ⚠️ **第四次修订更正**：本节原写"部分占据，仍是唯一形态未变的支柱"，并判断"没有对手在技术上做不到，只是他们的商业模式不允许"。**该判断错误。** **Vaara 已经转身进来了。**

- 本地 SQLite、无服务器、零网络、零外泄 —— Ledgeroot 的做法本身没错
- Coinbase 与 TrustBench **结构上无法提供**（必须看见流量才能变现）
- **Vaara 的做法**：官网首行 *"Open source. **No SaaS. No telemetry. No signup.**"*；**单 HTML 文件断网验证**且"收据不出标签页"；原文 *"The evidence does not depend on the vendor; that is the point of the design."*
- 其余对手仍然出局：OAP 走 `aport.io` 云端注册表、EVIDIQ 与 Vaultra 全文上传、Traceipt 哈希出境

**Vaara 在这条支柱上比 Ledgeroot 更彻底**：Ledgeroot 是"本地 SQLite + CLI"，Vaara 是"断网单文件可验 + 明确宣称验证不是一项服务"。**支柱 3 不再是差异，只是平价——而且我们这一侧还差一截。**

> 📌 **准确表述（第六次修订）**：Ledgeroot 剩下的不是三根支柱，而是**"链上稳定币 × agent 小额 402 支付"这个生态位里的用户签名授权 + 零出境**。生态位定义见 [commercialization.md](./commercialization.md) §零，剩余空间分析见 [standards-landscape.md](./standards-landscape.md) §六。
>
> ⚠️ **关键区别**：Vaara 与 OAP 占据的是**能力**，Ledgeroot 剩下的是**生态位**。能力可以被对手用半年抹平；**生态位要对手放弃自己的商业模型才能进来**（Vaara 卖高风险系统合规，OAP 按席位托管收费，两者都装不下 $0.005 的粒度）。**这是两种不同性质的防守。**

---

## 九、行动清单

> 状态标记：`[x]` 已在当前源码中完成；`[ ]` 未完成。

### 防御（堵住即将被标准化的缺口）—— 大部分已清

- [x] ✅ **`anchor/merkle.ts` 改为 RFC 6962 构造**：`leaf = SHA256(0x00 ‖ data)`、`node = SHA256(0x01 ‖ L ‖ R)`，按字节运算，2 的幂切分。**已完成**
- [x] ✅ **收据补签名**：`verifyAttribution()`，算法与 kid 落在被签字节内。**已完成**
- [x] ✅ **修 `classify()`**：`IssueKind = "tampered" | "incomplete"`，`tampered` 优先。**已完成**
- [x] ✅ **链上结算内容校验**：`src/verify/onchain.ts` 拉 tx、解 ERC-3009、比对 from/to/value。**已完成**
- [x] ✅ **修六段收据第 6 段**：`pay.ts` 对 `responseBody` 做 `contentHash` + `payloadSize`。**已完成**
- [x] ✅ **修锚定后误报篡改**：`verifyAnchor` 按 `receiptCount` 切片。**已完成**
- [ ] ⚠️ **`LedgerootAnchor` 加 owner 或 issuer 记录** —— **唯一未修的 P0。** x402 草案攻击 A4 已把 permissionless 标为可伪造；Traceipt 的 calldata 方案有同类问题但不校验 `from`，**谁先修谁得分**
- [ ] 移除 `Anchored` 事件中的 `epoch` 序号或评估其隐私风险（对照草案攻击 A7）
- [ ] 接入 **ERC-8004**（草案 SI-2 指出无注册表则无法验证签名者身份）；`Mandate.agentId` 已埋好字段
- [ ] 加密：评估长期档案的签名方案升级（对照 IETF 后量子草案 + **Traceipt 已支持混合 ML-DSA-65**）
- [ ] **跨语言规范化**：拒绝浮点 + 键按 Unicode 码点排序 + 支持 Python `ensure_ascii` 变体（对照 Traceipt，其跨语言互通比 `canonicalize` 包更严谨）
- [ ] **独立验证器包**：第三方不装 Ledgeroot 即可验证（对标 `traceipt-verify`、`@trustbench/verify-receipt`）—— 这是"卖报告"的前置条件

### 接入（借壳，低成本高收益）

- [ ] 签发时输出 `PEAC-Receipt` 响应头（JWS）
- [ ] 发布 `/.well-known/peac.txt` 策略面
- [ ] 冲击 PEAC **L3 Commerce** 一致性等级
- [ ] mandate 写入 PEAC 的 **`commerce-mandate`** 扩展组
- [ ] 用锚定 + 哈希链补上 PEAC 的"5 分钟过期即不能验"缺陷
- [ ] 提交 x402 Bazaar / Agentic.Market / 官方 MCP Registry
- [ ] **上 `skill.md` / `llms.txt` / `/.well-known/` 发现面**（对照 TrustBench 与 EVIDIQ：两者都有，EVIDIQ 已上架 OKX.AI，`claude mcp add` 一行接入）—— Ledgeroot 本身就是 MCP server，成本极低

### ❗ 接入学术与标准层（2026-09-17 新增，优先级高于自研收据格式）

> 依据：[standards-landscape.md](./standards-landscape.md) §七。**继续自研收据格式的边际价值已很低，成为对方规范里空着的那一环的边际价值很高。**

- [ ] **按 Vaara §6.4 实现 held-set completeness**：`seq` + 签名 `runningCount` + 封存记录 `{boundaryId, sealed, total}` + 对计数打 **RFC 3161 锚**，替换或包住现有的"哈希链 + epoch Merkle 根"
- [ ] **发布一致性向量 + 不 import 主库的独立 checker**（对标 Vaara `_check_independent.py`、`traceipt-verify`）
- [ ] **发布一个 Vaara profile**——Vaara 明确欢迎下游只定义 evidence schema 而不重定义信封；Ledgeroot 的形状天然就是一个 profile
- [ ] **发布一个 OAP policy pack**，并接入 OAP 的框架钩子面（Claude Code `PreToolUse` 等），而不是自建同等物
- [ ] **加 RFC 3161 合格时间戳**（至少技术锚可自建，目标 eIDAS 合格 TSA）
- [ ] **重新评估链上锚定的定位**：Vaara 与 NovaFabric 都用 RFC 3161；链上锚定在合规接受度上不优于合格时间戳，成本与依赖却更重。建议保留为**可选技术锚**，把 eIDAS 升为硬需求
- [ ] **跟进 `draft-kuehlewind-audit-architecture`**——IETF 的 agent 委派审计架构，**刻意不定义线格式**，是形式规格化的入口
- [ ] **跟进 ASQAV**（`draft-marques-asqav-compliance-receipts`，直接映射 EU AI Act + DORA）
- [ ] **采纳学术通用术语 "transaction authorization"** 做对外对齐（SoK 2604.15367 的 D2 维度），不要另造词
- [ ] ❗ **跑一遍 Vaara 的公开向量与 `_check_independent.py`**（零成本拿到外部验证基线，同时实测它的诚实度）
- [ ] ❗ **读 Vaara 的 `docs/PRIOR_ART.md` 与 `docs/eu-ai-act-article-12.md`**——后者公开写了"第 12 条要求什么、不要求什么、该向工具要求什么"，**这正是我们打算自己去问审计师的那份功课**
- [ ] ❗ **实现单文件断网验证器**（对标 Vaara Resin：浏览器直接验、收据不出本机）——**见 `roadmap.md` N10**
- [ ] ❗ **实现独立重铸／逐字节复现**（对标 Vaara v1.14.0 independent re-mint）——**见 `roadmap.md` N11**
- [ ] ❗ **重排发布优先级**：对手 **5 个月做到 v1.50.0**，我们的可见性与可验证性工程不能继续排在最后

### 进攻（护城河）

- [ ] 叙事从"我们有锚定收据"改为 **"我们证明授权被执行，且证明没有遗漏"**
- [ ] **用词改用"用户签名的确定性强制"**，并准备好与 Black_Wall / arXiv TrustBench 的一句话切割（见 §七 用词警告）
- [ ] 把"完整性证明"从一行提升为产品核心
- [ ] **发布可复现公开基准**（对标 Black_Wall 的 InjecAgent + AgentDojo 基准）—— 这是目前唯一有牵引的对手用来建立公信的手段，Ledgeroot 无对标物
- [ ] 对齐 EU AI Act 第 12 条**高风险**场景（不要泛化到所有 agent；Traceipt 的诚实表述可作范本）
- [ ] ❗ **新增：RFC 3161 合格时间戳**（Vaultra 用 Sectigo eIDAS QTSP，NovaFabric 亦已实现）—— Merkle 锚定不等于法定时间戳，这是 EU 合规场景的独立法律凭据
- [ ] ❗ **新增：人类可读交付物**（VAT 合规 PDF / 审计报告）—— Traceipt 与 Vaultra 都已交付；这是进会计与审计流程的门票，也是 `commercialization.md` §三"合规交付物"那一层的最先被问到的东西
- [ ] ❗ **新增：主网**（对手 Traceipt/Black_Wall 在 Base 主网、EVIDIQ 在 0G + X Layer 主网）—— ⚠️ **2026-09-17 修订：当前在 Monad 测试网是刻意选择**（Monad 黑客松），且与该链的高吞吐定位对齐；**黑客松后再做**。真正的技术债是"链硬编码、换不了"，见 [architecture-gaps.md](./architecture-gaps.md) §D1

---

## 十、监控指标

| 观察对象 | 触发条件 | 含义 |
|---|---|---|
| **PEAC** | 规范出现 anchoring / 完整性机制 | 支柱被吸收 → 重新定位 |
| **PEAC** | 移除或放宽 `iat` 5 分钟窗口 | 其离线审计能力增强 → 压力上升 |
| **x402 官方** | 采纳 `SettlementResponse.attestation` 字段 | 收据层进入官方规范 → 载体化 |
| **Coinbase** | 发布跨 facilitator 路由 或 官方证据层 | 分发层向下挤压 → 评估止损 |
| **卡组织** | 发布公开的"agent 支付审计格式" | 证据层定义权转移 → 必须兼容或让位 |
| **卡组织** | 开放第三方证据层接入 | **OEM 窗口打开** → 主动接触 |
| **卡组织** | 把审计能力锁进自家闭环 | 中立证据层空间被挤压 |
| **BlueTier** | Black_Wall 引入**用户签名授权**，或 Traceipt 增加**策略强制 / 非省略证明** | 最同构对手补全支柱 → 直接威胁 |
| **BlueTier** | Traceipt 从 onboarding 转为**公开 GA / 公布定价** | 证据层进入正面竞争阶段 |
| **BlueTier** | Black_Wall 提供**本地 / 可自托管**部署模式 | 证据主权支柱受威胁 |
| **BlueTier** | Traceipt 把 **ML-DSA-65 从"存在"变成"已验证"** | 后量子领先扩大 |
| **EVIDIQ** | 推出**本地 / 自托管**模式，或不再上传 prompt/response 全文 | 其最大结构性弱点被消除 → 正面竞争 |
| **EVIDIQ** | 从"AI 输出存证"扩展到**支付收据** | 进入 Ledgeroot 的主战场 |
| **Vaultra** | 获得首个具名客户 / 融资，或加入 Merkle 锚定 | 从纸面进入实装 |
| **Vaultra / 任何玩家** | 把 **RFC 3161 合格时间戳**作为卖点大规模宣传 | 该能力加速商品化 → Ledgeroot 必须补 |
| **TrustBench（lithvall）** | 近 30 天签发收据从 **0** 变为非零 | 该对手从纸面进入实装 |
| **arXiv TrustBench（ASU/UCLA）** | 出现开源实现或商业化产品 | "预行动验证"学术成果落地 → 用词必须彻底切割 |
| **NovaFabric** | 从预印本转为产品，或把**支付/授权**纳入 schema | 会话级证据层向下挤压支付证据层 |
| **任何玩家** | 实现**非省略证明 / 完整性证明** | ⚠️ **已发生（2026-09-04，Vaara Receipt §6.4）** → 见 [standards-landscape.md](./standards-landscape.md) §二 |
| **任何玩家** | 实现**用户签名 mandate + 执行前确定性强制** | ⚠️ **已发生（2026-03-21，OAP arXiv 2603.20953）** → 见 [standards-landscape.md](./standards-landscape.md) §一 |
| **Vaara Receipt** | 草案进入 WG、获得多地实现，或 `-11+` 出现 held-set 完整性以外的机制扩展 | 形式标准成形 → 必须兼容或让位 |
| **Vaara Receipt** | 出现"用户签名凭据"类的 profile（当前 grant 来自 credential broker） | ⚠️ **我们最后的凭据差异被覆盖 → 支柱全数失效** |
| **OAP** | v1.1 落地（委派链形式化 + 滑动窗口防 structuring） | 其两处已知缺口被补齐 → 组合攻击优势消失 |
| **OAP / APort** | 推出**本地优先 / 零外泄**模式，或 passport 改由用户自签 | ⚠️ **支柱 1 与支柱 3 同时被覆盖** |
| **OAP** | 被 AAIF（Linux Foundation）或 A2A 正式采纳 | 定义权落定 → 只能跟随 |
| **`draft-kuehlewind-audit-architecture`** | 从"不定义线格式"转向指定具体格式 | IETF 层面的定义权落定 |
| **ASQAV** | 获得采纳（映射 EU AI Act + DORA） | 合规叙事入口被占 |
| **NovaFabric** | 从预印本转为产品，或把支付/授权纳入 schema | 会话级证据层向下挤压 |
| **PCAS / AgentSpec / AgentGuardian 等** | 出现生产级开源实现或商业化 | 支柱 1 的学术路线落地 |
| **ERC-8004** | 正式采纳并出现注册表实现 | 身份层收口（对我们是机会，见 P1-4） |
| **x402b（Pieverse）** | 收据脱离 BNB 生态、支持自托管或迁至 Base | 有资金的对手进入 Ledgeroot 的差异面 |
| **IETF vauban** | 草案进入 WG 或获得多地实现 | 离线可验证成为正式标准 |
| **EU AI Act** | 第 12 条出现针对 agent 支付的具体指引 | 需求窗口打开 |

---

## 附录：置信度说明

| 结论 | 置信度 | 依据 |
|---|---|---|
| PEAC 无锚定、有 5 分钟新鲜度限制 | **高** | 规范原文逐条核对 |
| PEAC 主动让出 policy engine / 路由 | **高** | 规范 + 宣言原文 |
| Coinbase 资产与规模 | **高** | 官方文档 + 新闻 |
| x402 Receipt 草案的三条关键发现 | **高** | 草案全文 + 测试报告 |
| IETF vauban 草案存在且含该引文 | **高** | IETF 数据追踪器 + 草案原文 |
| BlueTier 的产品线与牵引 | **高** | 官网 + npm 下载量（`blackwall-mcp` 111/周、`traceipt-verify` 3/周）+ GitHub API 全量 26 仓库列表 |
| Traceipt 的密码学实现 | **高** | `traceipt-verify` README 逐项自述（RFC 6962 域分隔、JWS protected header、`ok: null` = SKIP、退出码 0/1/2、`--offline`） |
| Traceipt 已在 Base 上写锚定 | **中高** | 其验证器 README 示例为真实 Base 区块 33412876；但公司自述仍在 "onboarding first teams on testnet"，二者不完全吻合 |
| Black_Wall 的能力与定价 | **高** | 官网 + npm README + 定价页 |
| Black_Wall 的实际拦截效果 | **低** | 仅有其**自发布**基准（InjecAgent / AgentDojo 改编），**未独立复现** |
| **Ledgeroot 当前代码状态**（6 项已修、1 项未修） | **高** | **本次逐文件复核 `merkle.ts` / `builder.ts` / `verifier.ts` / `pay.ts` / `LedgerootAnchor.sol`** |
| EVIDIQ 的能力组合与定价 | **高** | 官方文档页一手读取（0G Storage、X Layer、6 工具、$0.001/$0.005） |
| EVIDIQ 全文上传 prompt/response | **中高** | 从其 `notarize_inference` 入参（`prompt` / `response` 为必填）推断；未见其声明端到端加密 |
| TrustBench 同名撞车（4 个实体） | **高** | 逐一访问 `trustbench.io` / `trustbench.net` / `trustmodel.ai/trustbench` / arXiv 2603.09157 |
| arXiv TrustBench 的方法与结论（87%、<200ms） | **中** | 摘要与正文一手读取，但**未独立复现**其 87% 数字 |
| agentstamp 的能力面 | **高** | 官网 About 页一手读取（55 端点 / 19 MCP 工具 / 4 档 / SHA-256 哈希链） |
| Vaultra 的能力与定价 | **中高** | 官网一手读取；但**无牵引证据、公司实体未披露**，RFC 3161 的 QTSP 关系（Sectigo）未独立核实 |
| NovaFabric 的设计与自述局限 | **中高** | 预印本全文读取；**实验数据未经同行评审**，且其自述多处"未经验证" |
| x402b（Pieverse）的融资与能力 | **中** | 二手信源（Traceipt 对比页 + 新闻稿），未查一手披露 |
| PEAC 的资金状况 | **低** | 仅见其寻求资助的页面，无公开财务信息 |
| **卡组织进场的动作与能力** | **中** | 二手信源（聚合报道 / 对比文章），**未查 Visa/Mastercard 一手规范** |
| EU AI Act 第 12 条适用范围的窄化 | **中** | 多源一致，但未查法条原文 |

---

## 来源

- [PEAC Protocol 规范](https://www.peacprotocol.org/spec) · [为什么 PEAC 存在（宣言）](https://www.peacprotocol.org/manifesto) · [GitHub](https://github.com/peacprotocol/peac)
- [PEAC x402 集成](https://www.peacprotocol.org/integrations/x402) · [x402 + PEAC](https://x402.peacprotocol.org/)
- [x402 Receipt Attestation Standard 草案 v0.2 + 测试报告](https://gist.github.com/javierpmateos/389c28e6cb752ee4999a229ac7ca835f)
- [IETF draft-vauban-x402-consolidated-00](https://www.ietf.org/archive/id/draft-vauban-x402-consolidated-00.html) · [STARK receipts](https://datatracker.ietf.org/doc/draft-vauban-x402-stark-receipts/) · [PQC receipts](https://datatracker.ietf.org/doc/draft-vauban-x402-pqc-receipts/)
- [Coinbase：Agentic.Market 发布](https://www.coinbase.com/developer-platform/discover/launches/agentic-market) · [x402 Bazaar 发布](https://www.coinbase.com/developer-platform/discover/launches/x402-bazaar) · [被 Bazaar 发现](https://docs.cdp.coinbase.com/x402/seller/get-discovered)
- **卡组织（B2）**：[Agent Payments: The 2026 Infrastructure Guide](https://o-mega.ai/articles/agent-payments-the-2026-infrastructure-guide) · [AI Agent Payment Protocols Compared (2026)](https://settlegrid.ai/learn/blog/ai-agent-payment-protocols) · [Compliance and Audit Trails for AI Agent Payments](https://www.agentwallex.com/en/blog/compliance-and-audit-trails-for-agent-payments) · [Agentic Payments Explained (DashDevs)](https://dashdevs.com/blog/agentic-payments-explained-how-ai-agents-make-autonomous-transactions/)
- **BlueTier / Traceipt / Black_Wall**：[Traceipt](https://traceipt.xyz/) · [Traceipt vs x402b 对比页](https://traceipt.xyz/vs-x402b) · [traceipt-verify README](https://github.com/bluetieroperations-create/traceipt-verify/blob/main/README.md) · [traceipt-verify 源码 `src/index.mjs`](https://github.com/bluetieroperations-create/traceipt-verify/blob/main/src/index.mjs) · [BlueTier Operations 官网](https://bluetieroperations.com/) · [Black_Wall](https://blackwalltier.com/) · [blackwalltier.com/llms.txt](https://blackwalltier.com/llms.txt) · [blackwall-mcp (npm)](https://www.npmjs.com/package/blackwall-mcp) · [traceipt-verify (npm)](https://www.npmjs.com/package/traceipt-verify) · [blackwall-benchmarks](https://github.com/bluetieroperations-create/blackwall-benchmarks) · GitHub API `users/bluetieroperations-create/repos`（26 个公开仓库，**无 `traceipt` 主库**）
- **EVIDIQ**：[EVIDIQ Notary 文档](https://evidiq.dev/docs/notary) · [EVIDIQ Notary MCP（GitHub）](https://github.com/evidiq/evidiq-notary-mcp/blob/main/README.md) · [博客：Cryptographic Receipts for AI Outputs](https://evidiq.dev/blog/evidiq-notary-cryptographic-receipts-for-ai-outputs-e66a9d)
- **TrustBench 同名撞车四家**：[trustbench.io（lithvall，x402 注册表/路由器）](https://trustbench.io/) · [trustbench.net（输出质量评估 SaaS）](https://www.trustbench.net/) · [trustmodel.ai/trustbench（企业评估引擎）](https://trustmodel.ai/trustbench) · [arXiv 2603.09157 — Real-Time Trust Verification for Safe Agentic Actions using TrustBench（ASU + UCLA）](https://arxiv.org/abs/2603.09157)
- **agentstamp**：[官网 About](https://agentstamp.org/about) · [vinaybhosle/agentstamp](https://github.com/vinaybhosle/agentstamp)
- **Vaultra**：[vaultra.io](https://vaultra.io/) · [Jerryto10/vaultra](https://github.com/Jerryto10/vaultra) · [vaultra (PyPI)](https://pypi.org/project/vaultra/)
- **NovaFabric 及 2026 学术相邻工作**：[arXiv 2609.12582 — NovaFabric: Tamper-Evident, Replayable Evidence for Autonomous AI Agent Runs](https://arxiv.org/abs/2609.12582)（其 §2 综述含 Notarized Agents / HANSARD / Auditable Agents / Verifiability-First Agents / BlockA2A）
- ⚠️ **Vaara（第四次修订新增，完整拆解见 [vaara-competitive-analysis.md](./vaara-competitive-analysis.md)）**：[官网](https://vaara.io/) · [GitHub](https://github.com/vaaraio/vaara) · [README](https://raw.githubusercontent.com/vaaraio/vaara/main/README.md) · [LICENSING.md](https://raw.githubusercontent.com/vaaraio/vaara/main/LICENSING.md) · [SPEC.md](https://github.com/vaaraio/vaara/blob/main/SPEC.md) · [Vaara Resin 验证器](https://vaara.io/verify.html) · [一致性结果页](https://vaara.io/conformance.html) · [PyPI](https://pypi.org/project/vaara/) · [npm @vaara/client](https://www.npmjs.com/package/@vaara/client)
- ⚠️ **APort / OAP（第四次修订新增，在售产品，$499/$4,990 月费）**：[aport.io](https://aport.io/) · [arXiv 2603.20953](https://arxiv.org/abs/2603.20953) · [aport-spec](https://github.com/aporthq/aport-spec)
- ⚠️ **学术与标准层（完整版见 [standards-landscape.md](./standards-landscape.md)）**：[OAP — Before the Tool Call（arXiv 2603.20953）](https://arxiv.org/abs/2603.20953) · [Vaara Receipt `draft-sirkkavaara-vaara-receipt-10`](https://datatracker.ietf.org/doc/html/draft-sirkkavaara-vaara-receipt-10) · [SoK: Agentic Commerce Security（arXiv 2604.15367）](https://arxiv.org/abs/2604.15367) · [Governing Actions, Not Agents（arXiv 2606.26298）](https://arxiv.org/abs/2606.26298) · [draft-kuehlewind-audit-architecture](https://datatracker.ietf.org/doc/draft-kuehlewind-audit-architecture/) · [draft-marques-asqav-compliance-receipts](https://datatracker.ietf.org/doc/draft-marques-asqav-compliance-receipts/) · [IMDA Agentic AI 框架 v1.5](https://www.imda.gov.sg/-/media/imda/files/about/emerging-tech-and-research/artificial-intelligence/mgf-for-agentic-ai.pdf)
- [TrustBench 竞品分析（本仓库）](./trustbench-competitive-analysis.md) —— ⚠️ 该文档 §四 的 8 条代码缺陷中 6 条已修，阅读前先看其顶部修正说明
- [EU AI Act 合规与 2026-08 截止日](https://atlan.com/know/eu-ai-act-compliance/) · [API 网关视角](https://zuplo.com/learning-center/eu-ai-act-api-gateway-compliance-guide)
- [awesome-agentic-commerce](https://github.com/MikeyPetrillo/awesome-agentic-commerce)（生态索引，调研入口）

### 本次复核（2026-09-17）核对过的本地源码

`src/anchor/merkle.ts` · `src/receipt/builder.ts` · `src/verify/verifier.ts` · `src/tools/pay.ts` · `contracts/src/LedgerootAnchor.sol` · `src/verify/onchain.ts` · `src/types.ts`
