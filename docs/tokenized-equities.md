# 代币化股票：第二个垂直与监管机会

> 定位：以 UNI permissioned pools × 代币化 NMS 股票为第二个垂直的评估，以及两条 SEC 提案线的机会地图
> 状态：2026-09-22（监管文本与架构事实已核实；**全部法律判断未经律师确认**，见 §十一 风险 1）
> 关联：[commercialization.md](./commercialization.md) · [roadmap.md](./roadmap.md) · [standards.md](./standards.md) · [landscape.md](./landscape.md) · [sec-comment-s7-2026-30.md](./sec-comment-s7-2026-30.md)
> 依据：SEC Release 2026-81 / **34-106246**（File **S7-2026-30**，2026-09-01）· SEC Release 2026-90 / **34-106402**（File **4-927**，2026-09-17）· Uniswap Permissioned Pools 架构文档
> 一句话结论：**同一套引擎，换一个"买方有法定截止日期"的垂直。但真正的第一动作不是开发，是 2026-11-03 前那份公开评论——成本约等于写一篇文档，却同时是分析、分发与标准位入口。**

---

## 一、坐标：这是两个提案，不是一件事

2026 年 9 月，SEC 在两周内推了两件方向一致但**法律对象完全不同**的事：

| | **9/01 Transfer Agent 提案** | **9/17 Innovation Exemption** |
|---|---|---|
| 文号 | Release 2026-81 / **34-106246**（File **S7-2026-30**） | Release 2026-90 / **34-106402**（File **4-927**） |
| 法律对象 | **股东名册本身**（master securityholder file）与注册 transfer agent 的义务 | **交易场所**（TSV）的注册豁免 |
| 管辖的问题 | 谁拥有、记录是否完整可信、能否被监管查看 | 谁可以交易、在什么条件下可以交易 |
| 性质 | 规则**提案**（征求意见中） | 有条件的**豁免令**（5 年落日） |
| 评论截止 | **2026-11-03** | 持续征求意见中 |
| 规模 | ⭐ 自 1970 年代末以来对 transfer agent 规则的首次实质性重写 | 较窄，带 5 年落日 |

> 📌 **两者是上下游**：名册是"谁拥有"，TSV 是"谁能交易"。**名册层是基础，交易层是应用。**
>
> ⚠️ **提案明确不解决**：不判定某加密资产是不是证券，不判定何时代币化证券需注册 transfer agent，也不解决州公司法与 UCC 问题。

**核心判断**：`commercialization.md` 的原分析瞄准 9/17 的 TSV 豁免，但 **9/1 的 transfer agent 提案更大、且与既有引擎的对应更紧**；它的公开评论截止日是 2026-11-03，应当无条件先做。同时：**执行层可能不在 Uniswap，产品不应绑死单一场所。**

---

## 二、为什么名册层与我们的引擎对应更紧

提案的核心被律所概括为一句话：

> **官方所有权记录必须保持 legally attributable, controlled, complete, correctable and examinable.**

**这五个词几乎逐词落在 Ledgeroot 既有的抽象上**：

| SEC 要求 | 提案中的具体点 | Ledgeroot 既有能力 |
|---|---|---|
| **attributable** | 记录变更可归因于特定主体 | 签名密钥与付款密钥**刻意不互相回退**；`kid` 为公钥 RFC 7638 指纹 |
| **controlled** | TA 须 "at all times exclusive control"；拟议 **17ad-9(h)**：一个发行只能有一个 recordkeeping TA | mandate 提供授权语义；控制面 / 数据面分离（MandateKey 已独立成仓库） |
| **complete** | 记录须完整、可复现、可重建 | ⭐ **非省略证明**：RFC 8785 哈希链回指 + RFC 6962 Merkle epoch 根 |
| **correctable** | 更正机制、差异处理、分叉与恢复 | ⚠️ **与 append-only 直接冲突**——见 §三 |
| **examinable** | 第三方代管时须有独立访问且无需第三方介入；"能查看即为独立访问" | ⭐ 离线三方验证 + JWKS 随证据包分发 + 不接受遥测 |

**其他"已实现但从未识别"的对应**：完整性/可访问性/可复现性/冗余性/连续性（哈希链 + Merkle 根 + 证据包）；审计轨迹与人类可读即时出具（六段收据 + 离线三态验证）；至少 6 年留存（schema 版本化 + 自描述）；一个营业日内过账（收据在动钱前写入，`requestId` 在动作时占用）；新 **Form TA-2** 报告义务（对应未来的聚合与对账层）。

> ⭐ **最重要的判断**：`complete`（完整）**第一次有了法定买主**。此前非省略证明的论证是"让聚合数字可信"（内部可信度理由）；现在它是 SEC 明文要求的记录属性——**同一份工程，理由从"可选的可信度"升级为"法定的完整性"。**

---

## 三、SEC 自己提出的那个矛盾：不可篡改 vs 法定删除

提案主动征询的一个问题：

> 当 master securityholder file **完全保存在不可篡改的区块链上**时，"**删除持仓明细**"的留存要求应如何适用？

**这是 append-only 日志的经典困境，目前没有公开答案**：法定记录保存制度假设记录**可以被删除或更正**；不可篡改账本在结构上**拒绝删除**；而提案同时要求**至少 6 年留存**与**可在更正中保持正确性**——两者在纯不可篡改设计下互斥。

**我们恰好站在这个问题的正中央**：

| 我们的架构事实 | 对这个问题的意义 |
|---|---|
| 收据 `id` **就是其内容的规范哈希** | 更正**必然表现为"新增一条更正值"**，而非修改原记录——天然给出"保留 + 更正并存"的路径 |
| 链上只锚定 Merkle 根，**不锚定内容** | 明细可留在链下受控系统，链上只证明"未遗漏"——使**删除明细而不破坏完整性证明**在架构上可行 |
| tri-state 刻意区分 `tampered` 与 `incomplete` | "无法获取 ≠ 不存在"正是审计与监管查看所需的语义 |

> 📌 **这是一篇可以写、且成本约等于写一篇文档的答案。** 它同时是：评论提交内容、可发表的研究笔记、以及整个名册层产品的架构依据。
>
> ⚠️ 但**先别假设结论是"我们能满足"**。我们的更正机制、明细与锚点的分层，**能不能同时满足 6 年留存 + 更正 + 可删除 + 可复现**，需要正式论证——**结论不重要，论证过程才是标准位的入口。**

---

## 四、Rule 17ad-31：白名单在法律上不够

提案中的 **Rule 17ad-31** 规定，注册 transfer agent 须维护发行人有权就限制性 legend 发出指令的员工名单，并有**合理理由相信**某笔未注册交易不违反 Section 5(a)。提案明确写道：

> **智能合约限制与钱包白名单本身不足以满足该规则所列的安全港方法**，且可能**不能单独**构成所需的合理理由。

**这直接佐证了那条架构切分**：

> **hook = 公开的执行内核 ‖ mandate = 被签名的策略参数 ‖ receipt = 可独立验证的证据**

Uniswap permissioned pool 的 allowlist 解决"**谁可以交易**"，**不解决**"**这笔转账本身合规**"。这正是 hook 之上必须有授权与证据层的原因——**现在有了法条级依据，不再只是架构偏好。**

---

## 五、新的受监管角色类别正在出现

新 **Form TA-2** 报告要求中有三项与代币化直接相关：① 使用 DLT（全部或部分）维护 master securityholder file 的 issue 数量；② 识别直接支持 TA 职能的服务商，明文包括 **"Tokenization Agent(s)"** 与 **"Distributed Ledger Technology Platform(s)"**；③ 按证券类型与 **"Issuer-Sponsored" / "Third Party-Sponsored"** 模型报告代币化 issue。

**要点**：

- **服务商名称不在 EDGAR 公开** → 无法做公开线索挖掘，但建立了**正式的供应商类别**。
- 这两个模型来自 2026-01 的 SEC staff statement，**该声明无法律效力**，且提案**未定义**这两个类别 → 律所建议对不完全落在这两类里的结构主动寻求澄清。
- 提案还征询：**钱包地址能否作为代币化证券的主要标识**（目前**不可以**替代持有人全名与最低限度的实体邮寄地址）。

> 📌 **战略含义**：**"Tokenization Agent" 是一个刚被命名、尚无定义的受监管角色。** 参与定义它（通过评论、通过参考实现）是标准位里性价比最高的一种。
>
> ⚠️ **"钱包地址不能替代实体地址"意味着名册层必然包含链下身份数据。任何"纯链上名册"的产品叙事都不成立。**

---

## 六、Uniswap Permissioned Pools 与豁免六项条件

### 6.1 Uniswap 实际提供了什么

四个合约：`PermissionsAdapter`（持有底层 permissioned token、铸造可在池内交易的虚拟版本）+ hook + `PermissionedPositionManager` + Universal Router 路由。关键机制：adapter 作为底层资产的获批持有人，把原始资产挡在共享的 `PoolManager` 之外；可插拔白名单委托给发行人自部署的 allowlist checker；hook 回调校验 `SWAP_ALLOWED` / `LIQUIDITY_ALLOWED` 并响应发行人 `updateSwappingEnabled` 暂停；仓位 NFT **不可转让**；**`unwindPosition` 发行人召回权**（持有人失去权限时，adapter owner 可烧 NFT、撤流动性、把资产路由回持有人，**绝不会落到另一个发行人手里**）。

> 📌 **一句话**：Uniswap 提供**准入控制（谁可以交易）+ 发行人暂停/召回权**。它**不提供**授权语义、额度会计、执行前风险检查、以及可被第三方独立验证的证据。

### 6.2 豁免六项条件逐条映射

> ⚠️ **本节是架构—法条对照分析，不是法律意见。**

| # | 指令条件（摘要） | Uniswap 现有能力 | 缺口 |
|---|---|---|---|
| ① | 交易 **symbol 数量与成交量**受上限限制 | hook 可按 symbol 计数并 revert；发行人可暂停 | ⚠️ **无累计额度原语**；"上限"由委员会设定；**无"额度被遵守"的证据** |
| ② | 须**验证**代币化股票提供与正股同等的**权利与特权** | 合约层无关 | ⚠️ 这是 wrapper/TA 的法律结构问题；但"**验证并留证**"是可证明的 attestation 问题 → 落在我们能力面 |
| ③ | 上架第三方代币化股票前，须向**发行人书面通知并给予异议机会** | 召回权 + 暂停权 | ❌ **上架前的通知与异议流程完全缺失** |
| ④ | 智能合约须**可审计、公开**，部署于公开无许可账本 | Uniswap 合约与 hook 均开源 | ✅ 基本满足 |
| ⑤ | 标的在主板**停牌时须同步停牌** | 无 | ❌ **完全缺失**。"同步"是实时性问题 |
| ⑥ | 须**公开披露**运营、交易活动**及关联方的交易活动** | 无 | ❌ 无任何原语，**而这正是收据账本能生产的东西** |
| — | LP 的 "dealer" 豁免（自有资金、无不当自营） | 无 | ⚠️ 需身份识别 + 资金性质证明 |

### 6.3 缺口归纳：③⑤⑥ 正是我们的三根支柱

- **③ 授权与撤销** → `mandate` + `revoke` + 拒绝也出收据
- **⑤ 执行前强制** → fail-closed 策略引擎（**但需要一个停牌状态源**，这是唯一真正没有公开答案的部分，见 §十）
- **⑥ 公开披露** → 六段收据 + RFC 6962 哈希链 + epoch Merkle 锚定 + 离线三方验证

**五个默认策略的复用度**：① 对手方白名单 → permissioned 参与者范围；② payTo 绑定 → 结算地址绑定；③ 报价漂移 → 滑点/报价偏离；④ endpoint 频率限制 → 条件①的时间维度量控；⑤ 金额上限（单笔 + 累计）→ 条件①的累计额度。**条件①与③已有可复用实现；⑤与⑥需新建；②是证明工具而非合约工作。**

### 6.4 一个已存在但未被识别的对应：Q7 就是条件⑥的答案

`commercialization.md` 记录的未决决策 **Q7** 推荐「**每 agent 自算 rollup + 锚定链接**」：每个 agent 锚定 `(receiptCount, root)`，控制面**不必看到任何收据**就能验证"这个 agent 报的聚合数字没有漏"。它同时满足两件此前被认为互斥的事：

| 要求 | 来源 | 由什么满足 |
|---|---|---|
| **公开披露**交易活动（含关联方） | 豁免条件⑥（法定） | 公开的锚点 + rollup |
| **零外泄**（原始证据不出本机） | 生态位的商业情报保护（自设） | 原始收据留在本地 SQLite |

> 📌 **这是正反馈信号**：我们在为一个**假想需求**做架构决策时，独立得到了一个**真实监管条件**的解。**Q7 不再只是排序问题，它在代币化股票垂直里是承重墙。**

---

## 七、机会地图

评分说明：⭐ 多 = 更强。「与你匹配」综合 Solidity 能力、AI 讲师身份、无直销能力、以及所在地约束。

| # | 机会 | 真需求 | 护城河 | 谁付钱 | 匹配 |
|---|---|---|---|---|---|
| **1** | **股东名册完整性 / 证据层**（MSF） | ⭐⭐⭐ 法定 + 6 年留存 + Form TA-2 | ⭐⭐ 若成标准 | Transfer agent、**Tokenization Agent** | ⭐⭐ 引擎逐词对应 SEC 五词 |
| **2** | **公司行动感知的池子**（拆股 / 分红 / 合并 / 换代码） | ⭐⭐⭐ AMM 无法原生表达拆股，无法按比例向 LP 派息 | ⭐⭐ 无公开解 | 池运营方、发行人 | ⭐⭐ 纯合约 + 研究 |
| **3** | **市场状态感知的 AMM**（24/7 vs 6.5h、停牌同步 = 条件⑤） | ⭐⭐⭐ 法定 | ⭐⭐ 无公开解 | TSV | ⭐⭐ |
| **4** | **补齐 Uniswap AI skills 的空白域** | ⚪ 生态价值 > 直接需求 | ⚪ 低 | UF grant | ⭐⭐ 官方 15 个 skill **无一**覆盖 permissioned / compliance |
| **5** | **TSV 条件③⑤⑥ 合规层** | ⭐⭐ 法定 | ⚪ 弱（大玩家可自建） | TSV、发行人 | ⭐⭐ 已有大半实现 |
| **6** | **从监管文本生成带出处的可执行策略** | ⭐⭐ 合规人员写不出策略配置 | ⭐ 中（难在**溯源**） | 同上 | ⭐⭐ AI 的真实用处 |
| **7** | **TSV 市场滥用监控** | ⭐⭐ | ⚪ 成熟对手在售 | TSV | ⭐ |
| **8** | **发行人同意 / 异议登记处** | ⭐⭐ 但**无人拥有**这个问题 | ⭐⭐ 可成基础设施 | 无直接买方 | ⭐ 标准位 |
| **9** | **UniswapX / RFQ 的 agent solver** | ⭐⭐ | ⚪ | 自营 | ❌ 需资本、库存、prime broker |
| **10** | **LP 风险归因** | ⚪ | ⚪ 数据产品薄 | LP | ⚪ |

**补注**：

- **机会 2 与 3 是同一研究纲领**：都缺一个**权威状态源**（谁权威地宣告"某股今天停牌"/"某股 2:1 拆股"），且都涉及"**沉默无法被证明**"（停牌期间不产生交易，"我确实停了"难以自证）。
- **机会 2 有一个被低估的难度**：即便解决拆股，**分红如何按比例分给 LP** 在 AMM 里没有原生表达（LP 仓位近似同质）。可能需在 wrapper / token 层解决——若结论如此，那本身就是一个有价值的公开判断。
- **机会 10 不要做**（数据产品，护城河薄，需直销）。
- **机会 4 摩擦最低**：`uniswap-ai` 仓库有开放贡献路径，15 个 skills 无一覆盖 permissioned / 合规 / 公司行动 / 代币化股票。

---

## 八、AI 在这个领域的真实边界

> ⚠️ **"AI + X + Y"这种命名会骗人——它会诱使你在真正的瓶颈上强行贴 AI 标签。** 代币化股票的瓶颈是**法律、托管、市场结构**，不是 AI。

**AI 真正有用的四处**：异常检测（监控/操纵识别）；报价与做市（被资本与库存门槛锁住）；**把监管文本翻译成带出处的可执行策略**（被低估，难在**溯源**而非模型）；在 mandate 边界内操作（我们已实现）。

**AI 明确不该碰的：任何合规判定。** 对证券类买方，把 "AI" 写在首页会**削弱**我们——提案要求记录具备**可复现性**与**可被监管查看**，而 LLM 输出天然不满足可复现性。**确定性不是修辞，是合规属性。**

因此定位必须拧过来：

| 层面 | 定位 |
|---|---|
| **构建方式** | AI 是**我们造它的工具**（加速开发、生成策略、辅助审计） |
| **运行时** | AI 可以是**跑在 mandate 边界内的操作者**（永不成为判定者） |
| **产品本体** | **必须是确定性的。对证券类买方，首页不出现 "AI"** |

---

## 九、竞争态势：执行层可能不在 Uniswap

| 事件 | 日期 | 含义 |
|---|---|---|
| Uniswap 发布 Permissioned Pools | 2026-07-23 | Uniswap 拿到**准入与合规**层 |
| Anchored 通过 **UniswapX** 在 Arbitrum 上线代币化股票 | 2026-08 | UniswapX 拿到部分执行流 |
| **Silhouette + xStocks 在 Hyperliquid 上线 RFQ** | **2026-09-01** | ⚠️ **大额执行跑到了 Hyperliquid** |

**结构原因**：**AMM 在结构上不适合 $100k+ 的股票订单**——滑点与 MEV 暴露使 RFQ / intent 路径占优。

> 📌 **推论**：**不要押"Uniswap 会成为股票交易的主要场所"。** 更可能的格局是 **Uniswap 成为合规准入层，执行分散到多个场所**（RFQ、UniswapX、订单簿）。
>
> → **产品应设计为跨场所，而不是绑死 Uniswap。** 这与机会 1（名册层）天然一致——**名册本来就不属于任何交易场所。**

---

## 十、优先级与时间表

### 无条件先做：2026-11-03 前提交公开评论

| 项 | 内容 |
|---|---|
| **截止** | **2026-11-03** |
| **写什么** | §三 那个矛盾——**不可篡改账本下的"删除持仓明细"留存要求如何适用**。SEC **主动征询**、**无公开答案**、且**恰好落在我们架构正中央** |
| **为什么必须做** | ① 成本 ≈ 写一篇文档；② 逼自己做完分析；③ 署名；④ 进入那个文件；⑤ **它免费决定我们该造哪个产品** |
| **顺带可评论** | 钱包地址能否作为主要标识（§五）→ 直接影响名册层的身份数据设计 |

### 之后的顺序

| 顺序 | 动作 | 理由 |
|---|---|---|
| 1 | **机会 4**：向 `uniswap-ai` 贡献 permissioned / 合规 / 公司行动相关 skills | 摩擦最低；建立与 Uniswap Labs 的关系；可申请 UF grant |
| 2 | **机会 6**：从监管文本生成带出处策略的原型 | 复用 `src/policy/` + `src/mandate.ts`；服务机会 1 与 5 |
| 3 | **机会 1**：名册层证据层 | 最大最贴合；**前置条件是律师意见 + 一家真实 transfer agent 对话** |
| 4 | **机会 2 / 3**：公司行动与市场状态的研究笔记 | 支撑 1 与 5 的申请，且是唯一无公开答案的纯技术题 |

### 第一个交付物（spike，不是产品）

**目标**：证明「条件③⑤⑥可以被机器执行并留下证据」，拿到 grant 与标准位所需的公开 artifact。

**优先做条件⑤的设计文档 + 接口，而不是先写代码**：③⑥已有大半实现可复用；**⑤是唯一没有公开答案的部分**——它同时是整份 grant 申请里最不可替代的内容、一份可被引用的 research note、以及标准位的技术入口。

**核心研究问题**（目前无人公开回答）：

> **在不可信链下操作者的前提下，如何满足"与主板停牌同步"？** 可能的分解：谁是 NMS 停牌的**权威状态源**？同步的**可接受延迟**是多少（指令未定义）？停牌漏报的责任如何归属？链上如何证明"我在停牌时确实停了"（停牌本身不产生交易，因此**沉默无法被证明**——这是最深的一层）？

**次项**：最小闭环实现 —— `MandateGateHook`（`beforeSwap` 校验 EIP-712 mandate，携带 `{symbol 白名单, 累计额度, 到期, 发行人撤销 nonce}`，超限 revert，**并把拒绝落成收据**；复用 `src/mandate.ts` · `src/policy/` · `src/receipt/`）+ `IHaltOracle` + 设计文档（新建，核心）+ mandate issuer 字段支持"证券发行人持有撤销权"（直接映射条件③的异议权）+ 锚定与 rollup（条件⑥与零外泄并存）。

> 📌 **issuer 字段这一条同时解决竞争定位**：我们从不用"broker 铸造凭据"，而是"**由发行人/持有人自己签**"——在证券场景里，"发行人持有撤销权"是**法条要求的形态**，而非架构偏好。

**明确不做**：不做交易 agent（会从工具方变成市场参与方）；不碰托管；不对大额按比例抽成；不整体转向（同一引擎加第二个垂直）。

---

## 十一、诚实的风险

**1. 法律定性未经确认，且可能致命。** 提案**明确不**判定何时代币化证券需要注册 transfer agent。我们"卖工具给 TA"与"提供名册基础设施"两种定位，法律后果完全不同。**必须找证券律师确认。** 确认前本文全部商业推论均为条件性。

**2. 名册层可能不允许软件供应商进入。** 提案要求 TA 对名册保持 "at all times exclusive control"，且一个发行只有一个 recordkeeping TA → **买方数量天然有限**（等于注册 TA 的数量），且现有 TA 多为根深蒂固的机构。**这是一个买方少但单个价值高的市场，与"无直销能力"的冲突比 TSV 更严重。**

**3. 提案只是提案。** 它是规则提案，不是生效规则，可能被修改、延迟或撤回。**不要当既成事实来设计产品。**（对比：TSV 豁免是已生效的豁免令，但带 5 年落日。）

**4. 市场可能太早。** 铁轨是硬的（指令条文已发布），量是软的（代币化股票交易量近期下跌约 51%；持有地址创新高 ≈367 万但**持有 ≠ 交易**；5 年试验期本身说明 SEC 也不确定）。**判据**：如果找不到一个正在准备成为 TSV、且明确需要向 SEC 证明合规的实体，第 2/3 层收入就不该启动。

**5. 护城河薄弱。** 大玩家可自建、GRC 厂商已在靠拢。我们的资产是**时间差 + 标准位**，不是独占能力——**不能假设独占定价。**

**6. 司法辖区与任职约束。** 跨境向美国受监管实体提供服务、收取报酬、以及高校任职带来的声誉与合规约束，需与风险 1 一并取得专业意见。

---

## 十二、待决决策

> 承接 `roadmap.md` 既有 Q1–Q9；以下为新增，编号待并入。

| # | 待定决策 | 影响 | 状态 |
|---|---|---|---|
| **Q10** | 条件⑤的停牌状态源取哪一类（官方 feed / 交易所 API / 多源共识 / 乐观挑战）？ | 决定 `IHaltOracle` 设计与 grant 申请的技术分量 | 待定（建议先出研究文档） |
| **Q11** | 本垂直第一份收费交付物的**目标格式**？ | 需与**真实 transfer agent / TSV 合规人员**对话后才能定 | 待定 |
| **Q12** | mandate 的 issuer 是否支持"证券发行人持有撤销权"这一形态？ | 决定核心设计，影响条件③的满足方式 | 待定 |
| **Q13** | 是否设独立仓库承载本垂直的参考实现（如 `ledgeroot-tsv`）？ | 影响是否污染主仓库的标准位叙事 | 待定 |
| **Q14** | 评论文件（11-03）是否**单独署名**，还是与 grant 申请捆绑？ | 决定这条线索的归属与可引用性 | 待定（**有时限**） |
| **Q15** | 产品主线取**名册层（TA）**还是**交易层（TSV）**，还是**跨场所的名册 + 证据层**？ | 决定架构、买方、以及是否绑死 Uniswap | 待定 |
| **Q16** | 是否承认"纯链上名册不成立"，把链下受控副本纳入架构？ | 直接决定机会 1 的架构 | 待定 |
| **Q17** | 是否愿意承担"**Tokenization Agent**"这一尚未定义的角色？ | 决定成为被点名的服务商类别，还是退到工具供应商 | 待定 |

**与 roadmap 非目标的对齐**，新增两条：

- **不做绑死单一交易场所的产品**（理由：§九，执行层正在分散）
- **不做按交易金额比例抽成**（理由：会改变监管主体身份）

---

## 十三、结论

1. **9/1 提案可能比 9/17 豁免更重要，且与既有引擎的对应更紧**：SEC 用五个词描述了名册必须满足的性质，几乎逐词落在我们已有的抽象上。
2. **`complete` 第一次有了法定买主**：非省略证明的理由从"内部可信度"升级为"SEC 明文要求的记录属性"。
3. **SEC 自己提出的矛盾（不可篡改 vs 法定删除）就在我们架构正中央**，目前无公开答案。**评论截止 2026-11-03。**
4. **17ad-31 给了法条佐证**：白名单本身不够，hook 之上必须有授权与证据层。
5. **新的受监管角色类别正在形成**（Tokenization Agent / DLT Platform），且**钱包地址不能替代实体地址**——纯链上名册叙事不成立。
6. **执行层可能不在 Uniswap**——产品应跨场所设计。
7. **AI 的用处是具体的四处**；合规判定不在此列——**可复现性是合规属性，不是修辞。**
8. **两个提案都是条件性的**：一个是提案，一个带 5 年落日。**本文档不改变"当前不启动商业化动作"的结论。**

> **先写那份 11-03 的评论。** 它同时是分析、分发、标准位入口，而且**它免费告诉我们该造哪个产品。**

---

## 附录：来源

**监管文本**：[SEC Proposes to Modernize Rules for Registered Transfer Agents（Release 2026-81）](https://www.sec.gov/newsroom/press-releases/2026-81-sec-proposes-modernize-rules-registered-transfer-agents) · [提案全文 PDF：Release No. 34-106246](https://www.sec.gov/files/rules/proposed/2026/34-106246.pdf) · [File S7-2026-30 提案页](https://www.sec.gov/rules-regulations/2026/09/s7-2026-30) · [SEC Issues "Innovation Exemption"（Release 2026-90）](https://www.sec.gov/newsroom/press-releases/2026-90-sec-issues-innovation-exemption-facilitate-trading-tokenized-nms-stock-request-comment) · [指令全文 PDF：Release No. 34-106402（File 4-927）](https://www.sec.gov/files/rules/exorders/2026/34-106402.pdf) · [File 4-927 指令页](https://www.sec.gov/rules-regulations/2026/09/4-927)

**法律分析**：[Skadden](https://www.skadden.com/insights/publications/2026/09/sec-proposes-modernization-of-transfer-agent-rules) · [Jones Day](https://www.jonesday.com/en/insights/2026/09/recordkeeping-in-the-blockchain-era-sec-proposes-overhaul-to-the-transfer-agent-rules) · [Greenberg Traurig](https://www.gtlaw.com/en/insights/2026/9/a-new-regulatory-framework-for-transfer-agents-an-analysis-of-the-secs-modernization-proposal-and-industry-implications) · [Morgan Lewis](https://www.morganlewis.com/pubs/2026/09/sec-proposes-comprehensive-modernization-of-transfer-agent-rules-signals-further-progress-on-framework-for-tokenized-securities)

**Uniswap / AI**：[Permissioned Pools Architecture](https://developers.uniswap.org/docs/protocols/uniswap-labs-hooks/permissioned-pools/architecture) · [Introducing Permissioned Pools on Uniswap v4](https://blog.uniswap.org/introducing-permissioned-pools-on-uniswap-v4) · [Uniswap AI Overview](https://developers.uniswap.org/docs/uniswap-ai/overview) · [Uniswap Skills](https://developers.uniswap.org/docs/uniswap-ai/skills) · [Uniswap/uniswap-ai](https://github.com/Uniswap/uniswap-ai) · [Uniswap Foundation Grants](https://www.uniswapfoundation.org/grants)

**资金规模**：[Uniswap Foundation $148M war chest](https://moneycheck.com/uniswap-foundation-sits-on-148-million-war-chest-after-major-funding-round/) · [runway through Jan 2027](https://www.theblock.co/news/ecosystems/2026-04-01-uniswap-foundation-projects-funding-runway-through-january-2027-as-treasury-reaches-85-8-million-396027) · [Monad Ecosystem Aug 2026](https://www.monad.xyz/blog/monad-ecosystem-highlights-august-2026)

**执行层竞争**：[Silhouette + xStocks RFQ on Hyperliquid](https://chainwire.org/2026/09/01/silhouette-and-xstocks-launch-rfq-trading-for-tokenized-equities-on-hyperliquid/) · [RWA Trails](https://www.rwatrails.com/news/silhouette-rfq-xstocks-hyperliquid-2026-09-01) · [Anchored via UniswapX on Arbitrum](https://tradetecheye.com/news/anchored-to-launch-tokenized-stocks-on-arbitrum-via-uniswapx-for-onchain-capital-markets)

**公司行动**：[Handling Corporate Actions Onchain（Flo Finance）](https://blog.flo.finance/handling-corporate-actions-onchain-a-technical-guide-to-splits-dividends-and-m-a/) · [Corporate Actions in Tokenized Stocks（Bitrue）](https://www.bitrue.com/blog/corporate-actions-tokenized-stocks) · [Corporate Actions on the Blockchain（Chainlink）](https://chain.link/article/corporate-actions-blockchain)

**市场参照（不作论据）**：[Tokenized Stocks holders record（BeInCrypto）](https://beincrypto.com/tokenized-asset-holders-record-high/) · [SEC Gave Tokenized Stocks Five Years（Forbes）](https://www.forbes.com/sites/boazsobrado/2026/09/17/the-sec-just-gave-tokenized-stocks-five-years-to-prove-themselves/)
