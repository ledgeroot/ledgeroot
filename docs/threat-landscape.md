# Agent 支付证据层 —— 威胁全景

> 建立日期：2026-09-17
> 最近修订：2026-09-17（第二次）—— 新增 §三 B2 **卡组织威胁**（Visa TAP / Mastercard Agent Suite / Stripe MPP，与 Coinbase 同类但握有企业客户关系）
> 前次修订：§四 C1 重写（Traceipt → BlueTier Operations 双产品线）；新增 x402b / Pieverse 情报；半衰期表新增"预行动闸门已被占据"；行动清单新增 RFC 6962 等四项
> 适用范围：Ledgeroot / MandateKey
> 关联文档：[roadmap.md](./roadmap.md) · [commercialization.md](./commercialization.md) · [trustbench-competitive-analysis.md](./trustbench-competitive-analysis.md)
> 调研方法：官网 / 规范原文 / **源码逐行通读** / npm 下载量 / GitHub API / IETF 草案 / 二手信源交叉核对

---

## 摘要

**不要把这个赛道的对手平铺成一张清单——它们是三种性质完全不同的威胁，应对方式相反。**

| 类别 | 代表 | 性质 | 应对 |
|---|---|---|---|
| **A. 载波** | PEAC Protocol、x402 Receipt Attestation 草案 | 证据层的**外壳标准**，不碰支付/策略/路由 | **接入，不对抗** |
| **B. 分发垄断者** | Coinbase（Bazaar / Agentic.Market / CDP）、**卡组织（Visa TAP / Mastercard Agent Suite / Stripe MPP）** | 拥有发现层、轨道层，**且卡组织直接握有企业客户关系** | **被索引，不对抗** |
| **C. 直接技术竞品** | **BlueTier（Black_Wall + Traceipt）**、EVIDIQ、TrustBench、agentstamp、Vaultra | 与 Ledgeroot 在同一能力面竞争 | **正面竞争，靠差异化** |
| **D. 相邻/间接** | SpendGate、Infopunks、Dexter、PayAI、x402scan… | 不同层面，可能互补或挤压 | **监控，按需合作** |
| **E. 监管时钟** | EU AI Act 第 12 条 | 定义需求的时间表 | **对齐，但别过度承诺** |

**最重要的判断**：Ledgeroot 当前的差异化能力（收据签名、Merkle 锚定、离线验证）**正在被标准化**，半衰期约 6–12 个月。真正未被占据的是**授权强制（不是存证）**、**完整性证明（非省略）**与**证据主权（本地零外泄）**。

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
| 产品二 | **Traceipt** —— x402 支付收据，**预发布**（"onboarding first teams on testnet"） | 高 |
| 产品线形状 | **"gate before, prove after"** —— 与 Ledgeroot（策略引擎）+ MandateKey（仪表盘）**完全同构** | 高 |
| 真实牵引 | `blackwall-mcp` **104 次/周下载**（v1.4.3）；`traceipt-verify` 3 次/周（v0.1.0） | 高 |
| 活跃度 | `agent-egress-proxy` 于 **2026-09-16（调研前一天）** 仍有提交 | 高 |

> **参照**：TrustBench 验证器周下载 4。**BlueTier 是这一批项目里唯一有真实牵引的。**

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

#### 源码核验：它的密码学实现比 Ledgeroot 严谨

通读 `src/index.mjs`（11.7 KB，零依赖）后逐项对照：

| 项 | Traceipt | Ledgeroot |
|---|---|---|
| **Merkle 构造** | **RFC 6962 标准**：`leaf = SHA256(0x00 ‖ data)`、`node = SHA256(0x01 ‖ L ‖ R)`，**有域分隔**，字节操作 | ⚠️ `anchor/merkle.ts`：`sha256Hex(level[i] + right)` —— **无域分隔**，十六进制字符串拼接，奇数层复制末节点 |
| **签名** | JWS 式 `protected` header，签名覆盖 `canonicalJson({payload, protected})` → **`alg` / `kid` 落在被签字节内，无法替换** | ❌ **完全无签名** |
| **规范化** | 拒绝浮点；键按 **Unicode 码点**排序（非 JS 默认 UTF-16 码元）；同时支持 Python `ensure_ascii` 两变体以跨语言互通 | 使用 `canonicalize` 包（RFC 8785），**未处理跨语言变体** |
| **三态纪律** | `ok: true \| false \| null`，`null` = SKIP，*"never silently passed"* | ⚠️ `verify/verifier.ts` 的 `classify()` **永远返回不到 `incomplete`**，缺 txHash 被误归为 `tampered` |
| **链上锚定** | 根写入 Base 交易 **calldata**（`TRACEIPT-ANCHOR\x01` 标记），验证时**要求 calldata 精确等于 标记+根** | 调用 `LedgerootAnchor.anchor(bytes32)`（有事件日志，但无权限控制） |
| **后量子** | 支持混合 **ML-DSA-65** 双签，验证器如实报告 PQ 层存在（不谎称已验证） | ❌ 无 |

> ⚠️ **最重要的一条**：`leafHash` / `nodeHash` 的**域分隔是 RFC 6962 的核心安全属性**。Ledgeroot 缺这一步，叶哈希与内部节点哈希用同一构造，存在**结构性第二原像问题**。**对手已经做对，而这是一个具体、可修、改动量很小的缺陷。**

#### 它的弱点（可攻击面）

1. **锚定不可归属**：验证器只比对 calldata 内容，**不校验交易的 `from` 地址** → 任何人都能用该标记锚任意根。*（注：Ledgeroot 的 permissionless `anchor()` 有同类问题，但至少有合约地址可加 owner。）*
2. **无用户签名授权**：由 **Traceipt 自己**签名，没有 EIP-712 mandate 约束"允许付给谁、付多少"。**它证明发生了什么，不证明那件事被授权过。**
3. **无非省略证明**：包含证明只证"收据 X 在批次 B 内"，**不能证明 B 含全部收据，也不能证明批次之间无跳号**。
4. **参考实现不开源**：主代码库（`tools/verify.py`、`traceipt/merkle.py`、`traceipt/signing.py`）未公开，只放出了 npm 移植版。
5. **预发布状态**，3 次周下载。

#### 对照总结

| | BlueTier | Ledgeroot |
|---|---|---|
| 策略层 | 托管 API + **LLM 推理，4–8 秒** | **本地 + 确定性规则，毫秒级** |
| 授权来源 | 无用户签名授权 | **EIP-712 用户签名 mandate** |
| 证据签发 | 厂商签名 | 哈希链（用户可验） |
| 数据出境 | 哈希出、原文不出 | **零出境** |
| 完整性 | 无 | **哈希链可证无缺口** |
| 公开基准 | **有（可复现 + 带签名收据）** | 无 |

**威胁等级：高**（架构最同构、唯一有真实牵引、密码学实现更严谨）。**但三根支柱均未被覆盖。**

### C2. EVIDIQ Notary

- `evidiq.dev/docs/notary`
- EIP-191 签名收据，**锚定在 0G Storage**，六工具，x402 USDT0 支付，Merkle proofs，离线验证
- **威胁等级：中高**（锚定 + 离线验证，但链不同、且是"AI 输出存证"定位）

### C3. TrustBench

详见 [trustbench-competitive-analysis.md](./trustbench-competitive-analysis.md)。

- 单人 Johan Lithvall，自筹，~$50/月基础设施
- Ed25519 + JCS 签名收据；**明确不做上链锚定**（推到 "Phase 5 if real demand surfaces"）
- **威胁等级：中**（技术弱于 Ledgeroot，但生态可见度与发现面远强）

### C4. 其他签名收据实现

| 项目 | 内容 | 威胁 |
|---|---|---|
| **agentstamp** | Ed25519 戳记 + 信任评分 + x402 | 中 |
| **Vaultra** | RFC-3161 合规收据（PyPI） | 中 |
| **anchor-x402-mcp** | 签名决策证明 + OFAC 端点 | 中 |
| **certifieddata.io** | Agent Commerce 收据 | 低 |
| **Loomal** | Ed25519 签名收据（glossary/产品） | 低 |
| **minia2a.uk** | 收据绑定 / 过期 / 重放拒绝的研究与实现 | 低（但观点值得读） |

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

| 能力 | 当前状态 | 商品化压力 | 估计半衰期 |
|---|---|---|---|
| 签名收据（Ed25519/JWS） | 已商品化 | PEAC、TrustBench、agentstamp、Vaultra、BlueTier… | **已过** |
| Merkle + 链上锚定 | 快速商品化，且**对手实现更严谨**（RFC 6962 域分隔） | Traceipt 已上线、x402 草案写成标准、EVIDIQ、IETF | **6–12 个月** |
| 离线验证 | 快速商品化 | PEAC、Traceipt、TrustBench 都声称支持 | **6–12 个月** |
| 交付证明（response hash） | 已有标准提案 | x402 草案的 DeliveryReceipt；**Black_Wall 已在签 (request, response)** | **6–12 个月** |
| 预行动闸门（一般意义） | **已被占据** | **Black_Wall v1.0 有定价、104 次/周下载** | **已过** |
| **用户签名授权的确定性强制** | **无人在做** | Black_Wall 是托管 LLM 推理（4–8 秒、无用户签名）；PEAC 明说不做 policy engine；TrustBench 是服务端厂商限额 | **低** |
| **非省略证明（完整性）** | **无人在做** | x402 草案测试 3.2.4 明确承认遗漏不可检测；BlueTier 亦无 | **低** |
| **证据主权（本地 + 零外泄 + 有强制力）** | **无人在做** | Coinbase / TrustBench / Black_Wall 结构上做不到 | **低** |

**读法**：最后三行"低"是 Ledgeroot 应该把全部火力集中过去的地方。前五行应**接入标准或停止自研竞争**。

> ⚠️ **用词警告**：**"预行动闸门 / pre-action gate" 这个概念已经被 Black_Wall 占据**，且它已有定价与牵引。Ledgeroot 若用同一词汇做定位，会被当作是它的劣化版（4–8 秒 → 毫秒级会被读成"想得更少"）。**应改用"用户签名的确定性强制"**——把差异点（谁签的、确定性、本地）放进词本身。

---

## 八、Ledgeroot 的防御位置（三根支柱）

### 支柱 1：授权，不是存证

全行业在做**事后**存证。Ledgeroot 做**事前**强制：

```
用户 EIP-712 签名 mandate（白名单 / payTo 绑定 / 报价漂移 / 限速 / 累计上限）
    → 执行前 fail-closed 校验
    → 拒绝也生成收据（留痕）
    → 授权与执行的一致性可被事后审计
```

- PEAC 明言不做 policy engine
- TrustBench 的限额是**厂商按 API key 发的**，用户无法验证
- **"用户签名的意图 → 机器强制执行 → 拒绝也有据"这条链，目前无人完整实现**

### 支柱 2：完整性（非省略）

- Ledgeroot 的哈希链回指 + epoch Merkle 根可证明**序列无缺口**
- x402 草案测试 3.2.4 明确显示：**遗漏不影响单张签名有效性** → 省略不可检测
- 审计场景里"**能证明没漏**"比"每张都签了名"更硬

> 当前 README 把这一点写成了一行。**应提升为核心卖点。**

### 支柱 3：证据主权

- 本地 SQLite、无服务器、零网络、零外泄
- Coinbase 与 TrustBench **结构上无法提供**（必须看见流量才能变现）
- PEAC 是库，做得到但**没有强制力**

---

## 九、行动清单

### 接入（借壳，低成本高收益）

- [ ] 签发时输出 `PEAC-Receipt` 响应头（JWS）
- [ ] 发布 `/.well-known/peac.txt` 策略面
- [ ] 冲击 PEAC **L3 Commerce** 一致性等级
- [ ] mandate 写入 PEAC 的 **`commerce-mandate`** 扩展组
- [ ] 用锚定 + 哈希链补上 PEAC 的"5 分钟过期即不能验"缺陷
- [ ] **签名封装对齐业界既有做法**：JWKS 发布公钥（Ed25519 OKP）+ 拒绝浮点 + 键按 Unicode 码点排序 + 支持 Python `ensure_ascii` 变体（对照 Traceipt，其跨语言互通做得比 `canonicalize` 包更严谨）
- [ ] 提交 x402 Bazaar / Agentic.Market / 官方 MCP Registry

### 防御（堵住即将被标准化的缺口）

- [ ] ⚠️ **`anchor/merkle.ts` 改为 RFC 6962 构造**：`leaf = SHA256(0x00 ‖ data)`、`node = SHA256(0x01 ‖ L ‖ R)`，按**字节**而非十六进制字符串运算 —— **对手（Traceipt）已做对，这是当前最具体、改动最小的密码学缺陷**
- [ ] **收据补签名**：JWS 式 `protected` header，签名覆盖 `canonicalJson({payload, protected})`，使 `alg` / `kid` 落在被签字节内不可替换（对照 Traceipt `verifyEnvelope`）
- [ ] **修 `classify()`**：让 `incomplete` 真正可达，把"缺证据"与"被篡改"分开（对照 Traceipt 的 `ok: null` = SKIP 纪律）
- [ ] **`LedgerootAnchor` 加 owner 或 issuer 记录**（x402 草案攻击 A4 已把 permissionless 标为可伪造）
- [ ] 移除 `Anchored` 事件中的 `epoch` 序号或评估其隐私风险（对照草案攻击 A7）
- [ ] 接入 **ERC-8004**（草案 SI-2 指出无注册表则无法验证签名者身份）
- [ ] 为锚定引入 `periodStart/periodEnd` + 批次边界，使 epoch 可独立验证
- [ ] 加密：评估是否需要在长期档案中升级签名方案（对照 IETF 后量子草案 + Traceipt 已支持 ML-DSA-65）

### 进攻（护城河）

- [ ] 叙事从"我们有锚定收据"改为 **"我们证明授权被执行，且证明没有遗漏"**
- [ ] **用词改用"用户签名的确定性强制"**，避开已被 Black_Wall 占据的"预行动闸门"（见 §七 用词警告）
- [ ] 把"完整性证明"从一行提升为产品核心
- [ ] **发布可复现公开基准**（对标 Black_Wall 的 InjecAgent + AgentDojo 基准）—— 这是目前唯一有牵引的对手用来建立公信的手段，Ledgeroot 无对标物
- [ ] 对齐 EU AI Act 第 12 条**高风险**场景（不要泛化到所有 agent；Traceipt 的诚实表述可作范本）

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
| **BlueTier** | Traceipt 从 testnet 转为**正式发布** | 证据层进入正面竞争阶段 |
| **BlueTier** | Black_Wall 提供**本地 / 可自托管**部署模式 | 证据主权支柱受威胁 |
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
| BlueTier 的产品线与牵引 | **高** | 官网 + npm 下载量 + GitHub API |
| Traceipt 的密码学实现 | **高** | **逐行通读 `src/index.mjs`**（RFC 6962 域分隔、JWS protected header、三态纪律均已核实） |
| Black_Wall 的能力与定价 | **高** | 官网 + npm README + 定价页 |
| Black_Wall 的实际拦截效果 | **低** | 仅有其**自发布**基准（InjecAgent / AgentDojo 改编），**未独立复现** |
| EVIDIQ 的能力组合 | **中** | 仅见其文档页 |
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
- **BlueTier / Traceipt / Black_Wall**：[Traceipt](https://traceipt.xyz/) · [Traceipt vs x402b 对比页](https://traceipt.xyz/vs-x402b) · [traceipt-verify 源码 `src/index.mjs`](https://github.com/bluetieroperations-create/traceipt-verify/blob/main/src/index.mjs) · [Black_Wall](https://blackwalltier.com/) · [blackwall-mcp (npm)](https://www.npmjs.com/package/blackwall-mcp) · [traceipt-verify (npm)](https://www.npmjs.com/package/traceipt-verify) · [blackwall-benchmarks](https://github.com/bluetieroperations-create/blackwall-benchmarks)
- [EVIDIQ Notary](https://evidiq.dev/docs/notary)
- [TrustBench 竞品分析（本仓库）](./trustbench-competitive-analysis.md)
- [EU AI Act 合规与 2026-08 截止日](https://atlan.com/know/eu-ai-act-compliance/) · [API 网关视角](https://zuplo.com/learning-center/eu-ai-act-api-gateway-compliance-guide)
- [awesome-agentic-commerce](https://github.com/MikeyPetrillo/awesome-agentic-commerce)（生态索引，调研入口）
