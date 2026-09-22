# Uniswap Permissioned Pools × 代币化股票：Ledgeroot 的第二个垂直

> 制定日期：2026-09-18
> 状态：**机会评估**（架构判断已核实；法律判断**未经律师确认**，见 §九 风险 1）
> 依据：SEC Release 2026-90 / Release No. 34-106402（File No. 4-927）· Uniswap Permissioned Pools 架构文档
> 相关文档：**[tokenized-equities-opportunity-map.md](./tokenized-equities-opportunity-map.md)**（机会地图，本文档的坐标修正与配套）· [commercialization.md](./commercialization.md) · [roadmap.md](./roadmap.md) · [standards-landscape.md](./standards-landscape.md) · [threat-landscape.md](./threat-landscape.md) · [vaara-competitive-analysis.md](./vaara-competitive-analysis.md)
> 一句话结论：**同一套引擎，换一个"买方有法定截止日期"的垂直。引擎继续免费；收入在控制面与证据报告层，经 OEM 嵌入交付（符合 §C4 无直销约束）。本年度实际收入只有 grant。**

---

## 零、触发事件（2026-09-17）

SEC 发布 "Innovation Exemption"（Release 2026-90，指令 Release No. **34-106402**，File No. **4-927**），对 **TSV（Tokenized Securities Venue）** 给予**临时、有条件**的豁免：

| 豁免对象 | 内容 |
|---|---|
| Exchange Act §3(a)(1) "exchange" | TSV 通过 **permissioned AMM 与流动性池**（指令原文：*"permissioned automated market makers and liquidity pools"*）交易代币化 NMS 股票 |
| Exchange Act §3(a)(5) "dealer" | 以**自有资金**在这些池中提供代币化 NMS 股票流动性的做市商 |
| 期限 | 公布后 **5 年**失效；期间持续公开征求意见 |

**为什么这件事对 Ledgeroot 重要**：指令把"permissioned AMM"这个架构**写进了监管文本**。这不是"股票上链"的泛泛利好，而是**一个特定技术架构获得了法定通道**——而该架构的合规缺口，恰好落在我们既有的抽象上。

**市场反应（仅作事件热度参照，不作论据）**：UNI 由 $6.63 涨至 $8.49（约 +26%）；Uniswap Permissioned Pools 于 2026-07-23 发布。

> ⚠️ **不要把市场反应当论据。** UNI 涨的是叙事，不是现金流。真正可验证的是指令条文与 Uniswap 的合约行为，本文件只基于这两者。

---

## 一、Uniswap Permissioned Pools 实际提供了什么

（依据官方架构文档，非推测）

**四个合约**：`PermissionsAdapter`（持有底层 permissioned token、铸造可在池内交易的虚拟版本）+ hook + `PermissionedPositionManager` + Universal Router 路由。

| 组件 | 关键机制 |
|---|---|
| `PermissionsAdapter` | `PoolManager` 是共享合约，无法被加入每一家发行人的白名单，所以由 adapter 作为底层资产的获批持有人，把原始资产挡在 `PoolManager` 之外；出池时在同一笔调用里烧掉虚拟 token 并释放底层资产 |
| 可插拔白名单 | adapter 把权限检查委托给**发行人自己实现并部署**的 allowlist checker（`updateAllowListChecker`） |
| permissioned hook 回调 | `beforeInitialize`（要求池币种之一是工厂验证过的 adapter）、`beforeSwap`（校验 `SWAP_ALLOWED` 0x0001，并响应发行人 `updateSwappingEnabled` 暂停）、`afterSwap`（发事件供索引）、`beforeAddLiquidity`（校验 `LIQUIDITY_ALLOWED` 0x0002） |
| 发行人管理权 | `updateAllowListChecker` / `updateAllowedWrapper` / `updateSwappingEnabled` / `updateAllowedHook` |
| 仓位 NFT | **不可转让**（防止被允许的持有人把仓位转给不被允许的地址） |
| `unwindPosition` | **发行人召回权**：持有人失去权限时，adapter owner 可烧掉仓位 NFT、撤出流动性、把资产路由回持有人；持有人无法再接收的资产**回落到该资产自己的发行人**，绝不会落到另一个发行人手里 |
| 双 permissioned 池 | 两个不同发行人的 token 同池，任一 adapter owner 可 unwind，每种资产优先回持有人 |

**有明确边界的一条**：adapter owner **不能**转移仓位、不能通过虚拟 token 直接抽走资金；unwrap 永远优先路由给持有人。

> 📌 **一句话**：Uniswap 提供的是**准入控制（谁可以交易）+ 发行人暂停/召回权**。它**不提供**授权语义、额度会计、执行前风险检查、以及可被第三方独立验证的证据。

---

## 二、豁免六项条件的逐条映射

> ⚠️ **本节是架构—法条对照分析，不是法律意见。** 条件措辞以指令原文 PDF 为准（见附录），不要以新闻稿或本文转述为依据。

| # | 指令条件（摘要） | Uniswap 现有能力 | 缺口 |
|---|---|---|---|
| ① | 交易的 **symbol 数量与成交量**受上限限制 | hook 可按 symbol 计数并 revert；发行人可暂停 | ⚠️ **无累计额度原语**（按时间窗的预算）；"上限"由委员会设定，非发行人自定；**无"额度被遵守"的证据** |
| ② | TSV 必须**验证**代币化股票提供与正股同等的**权利与特权** | 合约层无关 | ⚠️ 这不是合约问题，是 wrapper / transfer agent 的法律结构问题。但"**验证并留证**"是一个**可证明的证明（attestation）**问题 → 落在我们的能力面内 |
| ③ | 上架第三方代币化的股票前，须向**发行人书面通知并给予异议机会** | `unwindPosition` = 召回权；`updateSwappingEnabled` = 暂停权 | ❌ **上架前的通知与异议流程完全缺失**——这是治理流程，不是池子原语 |
| ④ | 智能合约须**可审计、公开**，部署于公开无许可账本 | Uniswap 共享合约与 hook 均公开开源 | ✅ 基本满足（我们仍需完成公开披露这一个"沟通动作"） |
| ⑤ | 标的在主板**停牌时须同步停牌** | 无 | ❌ **完全缺失**。hook 不知道 NYSE/Nasdaq 停牌；`updateSwappingEnabled` 是人工动作。**"同步"是实时性问题** |
| ⑥ | 须**公开披露**运营、交易活动、**及关联方的交易活动** | 无 | ❌ 无任何原语。**而这正是收据账本能生产的东西** |
| — | LP 的 "dealer" 豁免（须为自有资金、无不当自营） | 无 | ⚠️ 需身份识别 + 资金性质证明 |

### 缺口归纳：③⑤⑥，正是我们的三根支柱

- **③ 授权与撤销** → `mandate`（EIP-712 用户自签）+ `mandate_revoke` + 「拒绝也出收据」
- **⑤ 执行前强制** → fail-closed 策略引擎（**但需要一个停牌状态源**，这是唯一真正没有公开答案的部分，见 §十）
- **⑥ 公开披露** → 六段收据 + RFC 6962 哈希链 + epoch Merkle 锚定 + 离线三方验证

> 📌 **架构上的一句关键话**：指令要求智能合约"公开、可审计"，所以**链上 hook 必须是可公开检查的执行内核**；但**策略参数**可以放在离链签名里。于是形成一条合法且干净的切分——
>
> **hook = 公开的执行内核 ‖ mandate = 被签名的策略参数 ‖ receipt = 可独立验证的证据**
>
> 我们不需要把策略写死在合约里，也不需要在链下做一个不被信任的网关。

### 附：五个默认策略与条件的对应（既有资产复用度）

| 既有默认策略 | 对应到 |
|---|---|
| ① 对手方白名单 | permissioned 参与者范围 / 机构对手方限制 |
| ② payTo 绑定 | 结算地址绑定 |
| ③ 报价漂移 | AMM 场景下的滑点/报价偏离保护 |
| ④ endpoint 频率限制 | 条件① 的**时间维度量控** |
| ⑤ 金额上限（单笔 + **累计**） | 条件① 的**累计额度**；单笔上限防个别人超限 |

> **结论**：条件①与③我们**已经有可复用的实现**；条件⑤与⑥需要新建；条件②是证明工具而非合约工作。

---

## 三、一个已存在但未被识别的对应关系：Q7 就是条件⑥的答案

[commercialization.md](./commercialization.md) §三 记录的未决决策 **Q7**，三个候补方案中推荐的是「**每 agent 自算 rollup + 锚定链接**」：

> 每个 agent 锚定 `(receiptCount, root)`；控制面**不必看到任何收据**，就能验证"这个 agent 报的聚合数字没有漏"。

**这个设计同时满足两件此前被认为互斥的事**：

| 要求 | 来源 | 由什么满足 |
|---|---|---|
| **公开披露**交易活动（含关联方） | 豁免条件⑥（法定） | 公开的锚点 + rollup |
| **零外泄**（原始证据不出本机） | §零 生态位的商业情报保护（自设） | 原始收据留在本地 SQLite |

> 📌 **这是一个正反馈信号。** 我们在为一个**假想需求**做架构决策时，独立得到了一个**真实监管条件**的解。这说明抽象层级抽对了——这种巧合通常不能靠运气解释。

**推论**：Q7 不再只是一个"为了避免返工的排序问题"，它在代币化股票垂直里**是承重墙**。它必须按原计划在 P1-6 之前定，但现在多了一条外部理由。

---

## 四、为什么这个垂直优于 §零 的 x402 生态位

用 [commercialization.md](./commercialization.md) **自己的逻辑**推演，而不是引入新论据。

### 4.1 买方翻转：合规从"不在场"变成"在场"

[commercialization.md](./commercialization.md) §二 取舍 B 的论证是：

> 在 $0.005 的小额场景里，合规/法务**暂时不在场**——FATF 与 MiCA 针对**有金额门槛的受监管中介**，EU AI Act 第 12 条只覆盖**高风险系统**。所以买方是**财务 / AP 对账**。

**这个论证是对的，但它依赖生态位。** 换到 TSV：

| 维度 | x402 小额生态位 | 代币化股票 / TSV |
|---|---|---|
| 单笔金额 | $0.001–$0.05 | 数百至数万美元 |
| 合规买方 | ❌ 不在场（有金额门槛） | ✅ **在场，且有法定截止日期** |
| 需求性质 | 推测的（"车会来"） | **法定的**（不过条件就不能运营） |
| 监管时钟 | 无 | ✅ 5 年试验期 + 公开征求意见中 |
| 计价摩擦 | 抽成型对手被费率结构排除 | — |

> **结论**：同一套引擎，换一个生态位，[commercialization.md](./commercialization.md) §二 的结论**自己就翻转了**。这不是推翻那份文档，是把它写明的**前提**换掉。

### 4.2 与 §C4（无直销能力）的相容性反而更好

§C4 已答：**不具备企业直销能力**，因此确立硬约束——**商业层不得设计成需要直销的形态**。§十一 排定的优先级是 **OEM 嵌入 > 伙伴代销 > PLG 自助**。

**这个垂直是唯一一个今天就能指名 OEM 买方的垂直**：

| OEM 潜在买方 | 为什么它能替你卖 |
|---|---|
| **Transfer agent** | SEC 于 2026-09 同时提出 transfer agent 规则现代化（Release 2026-81），为代币化证券引入新的合规与记录保存要求；律所分析直接描述现代 transfer agent 为 *"operating as enterprise software providers"* |
| **TSV 运营方** | 它自己要向 SEC 证明合规，需要可被第三方验证的证据 |
| **GRC / 合规平台** | 已有买方关系，缺链上执行与可验证证据这一层 |
| **Permissioned pool 工具方**（Superstate / Securitize / Dowgo） | 已在上架这些资产，缺的是授权与证据层 |

### 4.3 结构性权衡（必须同时承认）

| | x402 小额生态位 | 代币化股票 / TSV |
|---|---|---|
| 单位经济 | 薄（需百万笔才成形） | **厚（单客价值高）** |
| 护城河来源 | **费率结构**（对手做了不划算） | ❌ **无**——大玩家可自建，且 GRC 厂商已在靠拢 |
| 买方预算 | 需被说服 | 已有合规预算 |

> ⚠️ **必须写清楚**：**这是用"可防守性"换"单位经济"。** §零 那个生态位的保护来自"别人做了不划算"；这个垂直没有这层保护。**我们在这里赚的不是"只有我们能做"的钱，而是"我们最早在场、且成为标准"的钱。**
>
> 这直接决定了收入形态：**不能指望独占定价，只能指望标准位的复利。**

---

## 五、收入模型（四层）

> 原则不变（§取舍 A / 取舍 D）：**引擎永久免费；收费只发生在证据被"消费"的地方。**

### 第 0 层：引擎（Ledgeroot 核心）——永久免费 MIT

不变。生产端收费会杀死采用率，而采用率是护城河的唯一来源。

### 第 1 层：Grant —— 本年度唯一真实收入

| 来源 | 已核实的事实 | 备注 |
|---|---|---|
| **Uniswap Foundation** | 2025 年末总资产 $85.8M；新一轮后战备金约 $148M；**超过 $1 亿专门划给 grant 与激励**；runway 至 2027-01；2026 Q1 单季承诺 $12.4M（其中 $9.9M 为跨 2026–2029 多年度项目）；grant 公开口径 $7,500–$1M+，**research + tooling 为明文类别** | 申请前置要求：**先部署到 Unichain 和/或 v4**、有文档、有可量化指标 → 正好由 §十 的 spike 满足 |
| **Monad Foundation** | 生态月报明列 payments、**real-world assets**、protocol research 为重点；我们**已在 Monad testnet 部署**（chainId 10143） | **同一份 artifact 可两头申请**，纯增量 |
| ETHGlobal / 生态奖金 | Uniswap Foundation 为 ETHGlobal 提供赛道 | 门槛低于正式 grant，可先练手 |

**现实预期**：五至六位数、一次性。**它买的是时间，不是一门生意。** 不要把 grant 当收入模型。

### 第 2 层：OEM / 嵌入式授权 —— 中长期主收入

- **买方**：§4.2 表中的四类，首推 **transfer agent**（有法定记录保存义务 + 软件形态 + 有预算）
- **形态**：**按 venue / 按资产类别年度授权，或按报告计费**
- **明确不做**：按笔抽成（§取舍 D）
- **与我们既有分层的对应**：等价于 §三 的"控制面"——多 venue / 多资产 / 多 mandate 舰队管理、组织策略库、审批流、告警 → 各自托管或客户自托管

### 第 3 层：报告与证据层

两个由指令**直接创造**的收费点：

| 收费点 | 对应条件 | 形态 |
|---|---|---|
| **TSV 的公开披露**生成 + 可独立验证 | 条件⑥ | 按份 / 按期；**按期续费而非永久授权**（见 §七 陷阱 2） |
| **LP / 做市商的 dealer 豁免证明** | §3(a)(5) 豁免 | 逐家、按份、按年。做市商已有合规支出习惯 |

**收费原则**（与 §五 留缝 1 一致）：**验证方永远免费，出具证据的一方付费。** 与审计业同构——被审公司付钱，读报告的人不付。

### 第 4 层：标准位 → 被收编 / OEM 买断

[commercialization.md](./commercialization.md) §十二 已承认这是可接受结果。**这个垂直的收购方名单比 x402 那边好得多**：transfer agent、交易所侧基础设施、GRC 厂商、各家 L1/L2。

**关键策略推论**：P3-1（发布收据规范）争取标准位，**而标准最容易被采纳的地方是监管强制互操作的地方**。代币化股票有一个 5 年试验期和一份公开征求意见的指令——参与方**必须**向 SEC 证明合规。这种环境会**被迫**产生格式共识。

> → **这个垂直不是偏离"成为标准"的路线，而是那条路线最快的实现方式。** §十二 那三条结局（标准位 / 声望资产 / 被收购标的）在此处获得加速器。

---

## 六、GTM：File No. 4-927 评论文件

指令**明确邀请**对豁免的所有方面公开征求意见。因此：

> **每一个提交评论的主体，只可能是：潜在 TSV、证券发行方、律所、GRC 厂商、或竞争对手。**

这是一份**免费的、当前的、预先筛过的买方名单**——正好匹配 §C4 的"无直销能力"约束。

**动作**：
1. 通读评论文件，按主体类型建档
2. **自己提交一份有技术含量的评论**（例如针对条件⑤的停牌同步问题）。它同时是：lead gen、署名、标准位铺垫、以及那个文件里的一行
3. 把评论内容转成中文内容分发（频道）+ 英文摘要（触达）

**为什么这条比做内容涨粉好**：精准度高一到两个数量级，成本接近零，且**沉淀为标准位的一部分**。

---

## 七、两个陷阱

### 陷阱 1：按比例抽成的诱惑

大额交易让 **% 抽成第一次在数学上变得可行**——这正是陷阱。§零 那个生态位之所以做不了，是因为费率结构排斥抽成型对手；**在这里这层保护不存在**。

但**在 TSV 场景里碰比例，意味着从"工具供应商"变成"市场参与方"**：触发牌照问题、推翻 §取舍 C（不碰托管/代币/平台）、并让 OEM 买方无法把我们当模块采购。

> **守住 §取舍 C，不因为"这次金额大了"而重开。**

### 陷阱 2：五年落日条款

豁免自公布起 **5 年**失效。因此：

| 不要做 | 要做 |
|---|---|
| 卖"五年平台"式永久授权 | 卖**按期续费的报告 / 证明** |
| 把 5 年当产品生命周期来设计 | 把 5 年当**试用期**来设计 |

五年后若有效，续约是自然的；若无效，我们也不欠一个无法交付的承诺。

---

## 八、与"AI × Uniswap 产品"定位的冲突

**必须指出的一处张力。**

在代币化股票垂直里，买方是**受监管金融机构**。他们要的是**确定性、可审计、可复现**。

而 [commercialization.md](./commercialization.md) 已经写明：

> ❌ **不做 LLM inference gate** —— 确定性正是我们的优势

**这句话在这个垂直里是最强卖点，而不是需要藏起来的取舍。**

因此定位必须拧过来：

| 层面 | 定位 |
|---|---|
| **构建方式** | AI 是**我们造它的工具**（加速开发、生成策略、辅助审计） |
| **运行时** | AI 可以是**跑在 mandate 边界内的操作者**（永不成为判定者） |
| **产品本体** | **必须是确定性的。对证券类买方，首页不出现 "AI"** |

> ⚠️ **对证券买方把"AI"写在首页会削弱我们。** 这是本次机会评估中唯一建议推翻的既有选择。

---

## 九、诚实的风险

四条不好听的。

**1. 法律定性未经确认，且可能致命。**
豁免覆盖的是 **TSV**，不是**软件供应商**。我们卖工具给 TSV 的定位，与"我们提供交易场所"的定位，法律后果完全不同。**这一条不能自行判断，必须找证券律师确认。** 在确认之前，本文档全部商业推论都是条件性的。

**2. 市场可能太早——而且这条在本垂直里同样尖锐。**
[commercialization.md](./commercialization.md) §七 风险 3 那条"**铁轨是真实的，需求还是推测的**"依然成立：

- 铁轨是硬的：指令条文已发布，通道已开
- 量是软的：代币化股票交易量近期**下跌约 51%**；持有地址创新高（约 367 万）但**持有 ≠ 交易**；5 年试验期本身就说明 SEC 也不确定

**判据**（承接 §八 启动信号）：**如果找不到一个正在准备成为 TSV、且明确需要向 SEC 证明合规的实体，第 2/3 层收入就不该启动。**

**3. 护城河薄弱（见 §4.3）。**
大玩家可自建、GRC 厂商已在靠拢。我们的资产是**时间差 + 标准位**，不是独占能力。**不能在定价上假设独占。**

**4. 团队与司法辖区约束。**
§C4 已答"无直销能力"。此外，本项目主体与主要人员所在司法辖区对加密货币及相关经营活动的限制，会同时影响：能否跨境向美国受监管实体提供服务、能否收取相关报酬、以及高校任职带来的声誉与合规约束。**这需要与 §九 风险 1 一并获得专业意见。**

> 📌 **与 §十二 对齐**：本文档不改变"当前不启动商业化动作"的结论。它改变的是**准备什么**、**对谁准备**、以及 **P3-1 的理由变强了**。

---

## 十、第一个交付物（spike，不是产品）

**目标**：证明「条件③⑤⑥可以被机器执行并留下证据」。**不是**做产品，是拿到 grant 与标准位所需的公开 artifact。

### 优先建议：先做条件⑤的设计文档 + 接口，而不是先写代码

**理由**：③⑥我们已有大半实现可复用；**⑤是唯一没有公开答案的部分**，因此它同时是：
- 整份 grant 申请里**最不可替代**的内容
- 一份可发表、可被引用的 research note
- 标准位的技术入口

**核心研究问题**（目前无人公开回答）：

> **在不可信链下操作者的前提下，如何满足"与主板停牌同步"？**
>
> 可能的分解：谁是 NMS 停牌的**权威状态源**？同步的**可接受延迟**是多少（指令未定义）？停牌漏报的责任如何归属？链上如何证明"我在停牌时确实停了"（停牌本身不产生交易，因此**沉默无法被证明**——这是最深的一层）？

### 次项：最小闭环实现

| 组件 | 内容 | 可复用 |
|---|---|---|
| `MandateGateHook`（`beforeSwap`） | 校验一张 EIP-712 mandate，携带 `{symbol 白名单, 累计额度, 到期, 发行人撤销 nonce}`，超限 revert，**并把拒绝落成收据** | `src/mandate.ts` · `src/policy/` · `src/receipt/` |
| `IHaltOracle` + 设计文档 | 条件⑤ | **新建**（这是核心） |
| mandate 的 issuer 字段 | 允许**证券发行人自己签 / 持有撤销权** → 直接映射条件③的异议权 | `src/mandate.ts` |
| 锚定 + rollup | 公开披露（条件⑥）与零外泄并存 | `src/anchor/` + **Q7 决策** |

> 📌 **issuer 字段这一条同时解决了竞争定位**：我们从不用"broker 铸造凭据"，而是"**由发行人/持有人自己签**"。在证券场景里，"发行人持有撤销权"是**法条要求的形态**，不再只是一个架构偏好——这是我们在 [vaara-competitive-analysis.md](./vaara-competitive-analysis.md) §四 那条差异（用户自签 vs broker 铸造）的最强应用场景。

### 明确不做

- ❌ 不做交易 agent（会从工具方变成市场参与方）
- ❌ 不碰托管（§取舍 C 已论证）
- ❌ 不对大额按比例抽成（§七 陷阱 1）
- ❌ **不整体转向**——同一引擎加第二个垂直，做一个旗舰参考实现

---

## 十一、待决决策（需登记入 roadmap.md）

> 承接 [roadmap.md](./roadmap.md) 既有 Q1–Q9；以下为新增候选项，编号待并入。

| # | 待定决策 | 影响 | 状态 |
|---|---|---|---|
| **Q10** | 条件⑤的停牌状态源取哪一类（官方 feed / 交易所 API / 多源共识 / 乐观挑战）？ | 决定 `IHaltOracle` 设计与 grant 申请的技术分量 | **待定（建议先出研究文档）** |
| **Q11** | 本垂直的第一份收费交付物的**目标格式**是什么？（等价的 C3 问题） | 需与**真实 transfer agent / TSV 合规人员**对话后才能定 | 待定 |
| **Q12** | mandate 的 issuer 是否支持"证券发行人持有撤销权"这一形态？ | 决定 §十 的核心设计，影响条件③的满足方式 | 待定 |
| **Q13** | 是否设独立仓库承载本垂直的参考实现（如 `ledgeroot-tsv`）？ | 影响是否污染主仓库的标准位叙事 | 待定 |

### 与 roadmap §八（非目标）的对齐

新增一条：

- **不做按交易金额比例抽成**（理由：§取舍 C，且会改变监管主体身份）

---

## 十二、结论

1. **这不改变 [commercialization.md](./commercialization.md) 的模型，只改变它的买方与切入点。** 引擎免费、收入在控制面与证据层、经 OEM 交付——四条全部不变。
2. **它改变了生态位的前提。** §二 取舍 B 的"合规不在场"是**生态位的推论**，不是普遍结论；在 TSV 场景中**合规正是在场的买方**。
3. **它让 Q7 从排序问题变成承重墙**，也让 P3-1（收据规范）的理由从"对标对手"变成"**标准位的最快实现路径**"。
4. **它在单位经济上更好，在可防守性上更差。** 我们在这里赚的是时间差与标准位，不是独占能力——定价策略不能建立在后者之上。
5. **本年度收入只有 grant。** 这不是现金流生意，是**用 grant 的钱买一个标准位期权，兑现方式是 OEM 授权或被收编**。
6. **一切以法律定性为前提。** 在律师确认"工具供应商 vs 交易场所"的定性之前，本文件全部商业推论均为条件性。

> **先做掉 §十 的停牌同步研究文档。** 它是唯一没有公开答案的部分，也是整份申请里最不可替代的东西；其余部分我们已有实现可以复用。

---

## 附录：外部来源

**监管文本**
- [SEC Issues "Innovation Exemption"（Release 2026-90）](https://www.sec.gov/newsroom/press-releases/2026-90-sec-issues-innovation-exemption-facilitate-trading-tokenized-nms-stock-request-comment)
- [指令全文 PDF：Release No. 34-106402, File No. 4-927](https://www.sec.gov/files/rules/exorders/2026/34-106402.pdf)
- [File No. 4-927 指令页（评论入口）](https://www.sec.gov/rules-regulations/2026/09/4-927)
- [SEC Proposes to Modernize Rules for Registered Transfer Agents（Release 2026-81）](https://www.sec.gov/newsroom/press-releases/2026-81-sec-proposes-modernize-rules-registered-transfer-agents)

**Uniswap**
- [Permissioned Pools Architecture | Uniswap Developers](https://developers.uniswap.org/docs/protocols/uniswap-labs-hooks/permissioned-pools/architecture)
- [Introducing Permissioned Pools on Uniswap v4](https://blog.uniswap.org/introducing-permissioned-pools-on-uniswap-v4)
- [Funding | Uniswap Developers](https://developers.uniswap.org/docs/ecosystem/builder-support/get-funded)
- [Uniswap Foundation Grants](https://www.uniswapfoundation.org/grants)

**资金规模**
- [Uniswap Foundation Sits on $148 Million War Chest](https://moneycheck.com/uniswap-foundation-sits-on-148-million-war-chest-after-major-funding-round/)
- [Uniswap Foundation projects funding runway through January 2027（The Block）](https://www.theblock.co/news/ecosystems/2026-04-01-uniswap-foundation-projects-funding-runway-through-january-2027-as-treasury-reaches-85-8-million-396027)
- [Uniswap Grants 区间 $7,500–$1M+](https://www.zhcinstitute.com/grants/uniswap-grants/)
- [Highlights from the Monad Ecosystem: August 2026](https://www.monad.xyz/blog/monad-ecosystem-highlights-august-2026)

**转移代理人 / 发行侧**
- [A New Regulatory Framework for Transfer Agents（Greenberg Traurig）](https://www.gtlaw.com/en/insights/2026/9/a-new-regulatory-framework-for-transfer-agents-an-analysis-of-the-secs-modernization-proposal-and-industry-implications)
- [SEC Proposes Sweeping Modernization of Transfer Agent Rules（Morgan Lewis）](https://www.morganlewis.com/pubs/2026/09/sec-proposes-comprehensive-modernization-of-transfer-agent-rules-signals-further-progress-on-framework-for-tokenized-securities)
- [Securitize Partners with World's Largest Transfer Agent to Bring Equities Onchain](https://blockchainacademics.com/research/securitize-partners-with-worlds-largest-transfer-agent-to-bring-equities-onchain)

**市场与事件（仅作参照，不作论据）**
- [The SEC Just Gave Tokenized Stocks Five Years to Prove Themselves（Forbes）](https://www.forbes.com/sites/boazsobrado/2026/09/17/the-sec-just-gave-tokenized-stocks-five-years-to-prove-themselves/)
- [Tokenized Stocks Now Have Nearly 3 Million Holders, But Trading Volume…（BeInCrypto）](https://beincrypto.com/tokenized-asset-holders-record-high/)
- [AMC CEO 赞赏 SEC 代币化新规（吴说）](https://wublock123.com/news/amc-ceo-praises-sec-tokenization-rules-calls-robinhood-overseas-compliance-68587)
