# AI × Uniswap × 代币化股票：机会地图

> 制定日期：2026-09-18
> 状态：**机会评估**（监管文本与架构事实已核实；**全部法律判断未经律师确认**，见 §九 风险 1）
> 依据：SEC Release 2026-81 / **Release No. 34-106246**（File No. **S7-2026-30**，2026-09-01）· SEC Release 2026-90 / Release No. 34-106402（File No. 4-927，2026-09-17）· Uniswap AI / Permissioned Pools 文档
> 配套文档：[tokenized-equities-vertical.md](./tokenized-equities-vertical.md)（垂直评估）· [commercialization.md](./commercialization.md) · [roadmap.md](./roadmap.md) · [vaara-competitive-analysis.md](./vaara-competitive-analysis.md)
> 一句话结论：**我上一份文档瞄准的 9/17 TSV 豁免，可能不是最优目标。9/1 的 transfer agent 提案更大、且与既有引擎的对应更紧；它的公开评论截止日是 2026-11-03，应当无条件先做。同时：执行层可能不在 Uniswap，产品不应绑死单一场所。**

---

## 零、坐标修正：这是两个提案，不是一件事

2026 年 9 月，SEC 在两周内推了两件方向一致但**法律对象完全不同**的事：

| | **9/01 Transfer Agent 提案** | **9/17 Innovation Exemption** |
|---|---|---|
| 文号 | Release 2026-81 / **34-106246**（File **S7-2026-30**） | Release 2026-90 / **34-106402**（File **4-927**） |
| 法律对象 | **股东名册本身**（master securityholder file）与注册 transfer agent 的义务 | **交易场所**（TSV）的注册豁免 |
| 管辖的问题 | 谁拥有、记录是否完整可信、能否被监管查看 | 谁可以交易、在什么条件下可以交易 |
| 性质 | 规则**提案**（征求意见中） | 有条件的**豁免令**（5 年） |
| 评论截止 | **2026-11-03** | 持续征求意见中 |
| 规模 | ⭐ **更大**——这是自 1970 年代末以来对 transfer agent 规则的首次实质性重写 | 较窄，且带 5 年落日条款 |

> 📌 **两者是上下游**：名册是"谁拥有"，TSV 是"谁能交易"。**名册层是基础，交易层是应用。**
>
> ⚠️ **注意提案明确不解决的问题**（Skadden 归纳）：它**不**判定某个加密资产是不是证券，**不**判定何时代币化证券需要注册 transfer agent，也**不**解决州公司法与 UCC 的问题。这些仍需个案法律分析。

---

## 一、为什么名册层与我们的引擎对应更紧

提案的核心信息被 Skadden 概括为一句话：

> **官方所有权记录必须保持 legally attributable, controlled, complete, correctable and examinable。**

**这五个词，几乎逐词落在 Ledgeroot 既有的抽象上：**

| SEC 要求 | 提案中的具体要求 | Ledgeroot 既有能力 |
|---|---|---|
| **attributable**（可归属） | 记录变更可归因于特定主体 | 签名密钥与付款密钥**刻意不互相回退**："一把钥匙动钱、一把钥匙作证"；`kid` 为公钥的 RFC 7638 指纹，标识由密钥自身派生 |
| **controlled**（受控） | TA 须 **"at all times exclusive control"**；提议规则 **17ad-9(h)**：*一个证券发行只能有一个 recordkeeping transfer agent* | **mandate** 提供授权语义；控制面 / 数据面分离（MandateKey 已独立成仓库） |
| **complete**（完整） | 记录须完整、可复现、可重建 | ⭐ **非省略证明**：RFC 8785 哈希链回指 + RFC 6962 Merkle epoch 根。"230 万条里少一条，聚合就不可信" |
| **correctable**（可更正） | 更正机制、差异处理、分叉与恢复 | ⚠️ **与 append-only 架构直接冲突**——见 §二 |
| **examinable**（可检查） | 第三方代管时须有**独立访问且无需第三方介入**；对链上记录而言"**能查看即为独立访问**" | ⭐ 离线三方验证 + JWKS 随证据包分发 + 不接受遥测 |

**其他同样是"已实现但从未识别"的对应**：

| 提案要求 | 我们的对应 |
|---|---|
| 保持**完整性、可访问性、可复现性、冗余性、连续性** | 哈希链 + Merkle 根 + 证据包导出 |
| 支持**审计轨迹**、恢复、以**人类可读**格式即时出具 | 六段收据（自描述、带 schema 版本）+ 离线 tri-state 验证 |
| 大多数记录**至少留存 6 年** | schema 版本化 + 自描述格式（§五 留缝 4 已列为约束） |
| 持仓明细须于**一个营业日**内（或 Rule 15c6-1(a) 期限，取短）过账 | 收据在支付前写入（`requestId` 在**动作时**而非成功时占用） |
| 新 **Form TA-2** 报告义务（见 §四） | 聚合与对账层（§三 第三层） |

> ⭐ **最重要的判断**：`complete`（完整）**第一次有了法定买主**。此前非省略证明的论证是"让聚合数字可信"（内部可信度理由）；现在它是 SEC 明文要求的记录属性。**同一份工程，理由从"可选的可信度"升级为"法定的完整性"。**

---

## 二、SEC 自己提出的那个矛盾：不可篡改 vs 法定删除

提案中 SEC **主动征询公众意见**的一个问题（Skadden 引述）：

> 当 master securityholder file **完全保存在不可篡改的区块链上**时，"**删除持仓明细**"的留存要求应如何适用？

**这是 append-only 日志的经典困境，且目前没有公开答案：**

- 法定记录保存制度假设记录**可以被删除或更正**（错误的过账、隐私要求、clearing 更正）
- 不可篡改账本在结构上**拒绝删除**
- 提案同时要求**至少 6 年留存**和**可在更正中保持正确性**——两者在纯不可篡改设计下互斥

**我们恰好站在这个问题的正中央**，因为：

| 我们的架构事实 | 对这个问题的意义 |
|---|---|
| 收据 `id` **就是其内容的规范哈希** → 改一个字节就是另一张收据 | 更正**必然表现为"新增一条更正值"**，而非修改原记录 —— 这天然给出了"**保留 + 更正并存**"的路径 |
| 链上只锚定 Merkle 根，**不锚定内容** | 明细可以留在链下受控系统，链上只证明"未遗漏" —— 使**删除明细而不破坏完整性证明**在架构上可行 |
| tri-state 验证刻意区分 `tampered` 与 `incomplete` | "无法获取 ≠ 不存在"这条纪律，正是审计与监管查看场景所需的语义 |

> 📌 **这是一篇可以写、而且成本等于写一篇文档的答案。** 它同时是：§八 的评论提交内容、可发表的研究笔记、以及整个名册层产品的架构依据。
>
> ⚠️ 但**先别假设结论是"我们能满足"**。我们的 `unwindPosition` 式更正、明细与锚点的分层，**能不能同时满足 6 年留存 + 更正 + 可删除 + 可复现**，需要正式论证，可能得出"需要链下受控副本"这类结论。**结论不重要，论证过程才是标准位的入口。**

---

## 三、17ad-31：白名单在法律上不够 —— 对配套文档的法条佐证

提案中的 **Rule 17ad-31** 规定，注册 transfer agent 须：

1. 维护**发行人有权就限制性legend 发出指令的员工名单**
2. 有**合理理由相信**某笔未注册交易"不违反、且不属于会违反 Section 5(a) 的交易链的一环"

**而提案明确写道**（Skadden 引述）：

> **智能合约限制与钱包白名单本身不足以满足该规则所列的安全港方法**，且可能**不能单独**构成所需的合理理由。

**这直接佐证了配套文档 §二 的那句架构切分：**

> **hook = 公开的执行内核 ‖ mandate = 被签名的策略参数 ‖ receipt = 可独立验证的证据**

Uniswap permissioned pool 的 allowlist 解决的是"**谁可以交易**"，**不解决**"**这笔转账本身合规**"。这正是 hook 层之上必须有授权与证据层的原因——**现在有了法条级依据，不再只是架构偏好。**

---

## 四、新的受监管角色类别正在出现

新 **Form TA-2** 报告要求中，有三项与代币化直接相关：

| 报告项 | 内容 |
|---|---|
| ① | 使用**分布式账本技术**（全部或部分）维护 master securityholder file 的 **issue 数量** |
| ② | 识别直接支持 transfer agent 职能的**服务商**，明文包括 **"Tokenization Agent(s)"** 与 **"Distributed Ledger Technology Platform(s)"** |
| ③ | 按证券类型、以及 **"Issuer-Sponsored" / "Third Party-Sponsored"** 模型报告代币化 issue |

**要点：**

- **服务商名称不在 EDGAR 公开** → 无法用它做公开线索挖掘，但它建立了一个**正式的供应商类别**
- 这两个模型来自 **2026-01 的 SEC staff statement**，而**该声明无法律效力**，且提案**未定义**这两个类别 → Skadden 建议对不完全落在这两类里的结构**主动寻求澄清**
- 提案还征询：**钱包地址能否作为代币化证券的主要标识**（目前**不可以**替代持有人全名与最低限度的实体邮寄地址）

> 📌 **战略含义**：**"Tokenization Agent" 是一个刚被命名、尚无定义的受监管角色。** 参与定义这个角色（通过评论、通过参考实现）是标准位里性价比最高的一种。
>
> ⚠️ 同时注意：**"钱包地址不能替代实体地址"意味着名册层必然包含链下身份数据。** 任何"纯链上名册"的产品叙事都不成立。

---

## 五、机会地图

评分说明：⭐ 多 = 更强。"与你匹配"综合 Solidity 能力、AI 讲师身份、无直销能力（§C4）、以及所在地约束。

| # | 机会 | 真需求 | 护城河 | 谁付钱 | 与你匹配 |
|---|---|---|---|---|---|
| **1** | **股东名册完整性 / 证据层**（MSF） | ⭐⭐⭐ 法定 + 6 年留存 + Form TA-2 报告 | ⭐⭐ 若成标准 | Transfer agent、**Tokenization Agent**（新设类别） | ⭐⭐ 引擎逐词对应 SEC 的五个词 |
| **2** | **公司行动感知的池子**（拆股 / 分红 / 合并 / 换代码） | ⭐⭐⭐ AMM 无法原生表达拆股，无法按比例向 LP 派息 | ⭐⭐ 无公开解 | 池运营方、发行人 | ⭐⭐ 纯合约 + 研究 |
| **3** | **市场状态感知的 AMM**（24/7 vs 6.5h、停牌同步 = 条件⑤） | ⭐⭐⭐ 法定 | ⭐⭐ 无公开解 | TSV | ⭐⭐ |
| **4** | **补齐 Uniswap AI skills 的空白域** | ⚪ 生态价值 > 直接需求 | ⚪ 低 | UF grant | ⭐⭐ AI 讲师身份 + 官方 15 个 skill **无一**覆盖 permissioned / compliance |
| **5** | **TSV 条件③⑤⑥ 合规层**（见配套文档） | ⭐⭐ 法定 | ⚪ 弱（大玩家可自建） | TSV、发行人 | ⭐⭐ 已有大半实现 |
| **6** | **从监管文本生成带出处的可执行策略** | ⭐⭐ 合规人员写不出策略配置 | ⭐ 中（难在**溯源**而非 LLM） | 同上 | ⭐⭐ AI 的真实用处 |
| **7** | **TSV 市场滥用监控**（薄池 + 24/7） | ⭐⭐ | ⚪ 成熟对手在售 | TSV | ⭐ |
| **8** | **发行人同意 / 异议登记处**（条件③的协调问题） | ⭐⭐ 但**无人拥有**这个问题 | ⭐⭐ 可成基础设施 | 无直接买方 | ⭐ 标准位 |
| **9** | **UniswapX / RFQ 的 agent solver** | ⭐⭐ | ⚪ | 自营 | ❌ 需资本、库存、prime broker |
| **10** | **LP 风险归因**（公司行动、休市期暴露） | ⚪ | ⚪ 数据产品薄 | LP | ⚪ |

### 补注

- **机会 2 与 3 是同一个研究纲领**：两者都缺少一个**权威状态源**（谁权威地宣告"某股今天停牌"／"某股 2:1 拆股"），且都涉及"**沉默无法被证明**"这一深层问题（停牌期间不产生交易，因此"我确实停了"难以自证）。
- **机会 2 有一个被低估的难度**：即便解决了拆股，**分红如何按比例分给 LP** 在 AMM 里没有原生表达——LP 仓位是近似同质的。这可能需要**在 wrapper / token 层解决，而非池层**。若结论如此，那本身就是一个有价值的公开判断。
- **机会 10 不要做**：它是数据产品，护城河薄，且需要直销。
- **机会 4 是所有条目里摩擦最低的**：Uniswap 的 `uniswap-ai` 仓库有开放的贡献路径，15 个 skills 已存在（2026-02 首发 7 个，2026-08 更新），但**没有一个覆盖 permissioned pools、合规、公司行动、代币化股票**。

---

## 六、AI 在这个领域的真实边界

> ⚠️ **"AI + X + Y"这种命名方式会骗人——它会诱使你在真正的瓶颈上强行贴 AI 标签。** 代币化股票的高价值环节里，瓶颈是**法律、托管、市场结构**，不是 AI。

**AI 在这里真正有用的四处：**

| 用处 | 强度 | 备注 |
|---|---|---|
| 异常检测（监控 / 操纵识别） | ⭐⭐ | 真强项；但买方已有成熟供应商 |
| 报价与做市 | ⭐⭐ | 真强项；被资本与库存门槛锁住 |
| **把监管文本翻译成带出处的可执行策略** | ⭐⭐ | **被低估**，且正好匹配 AI 讲师身份；难在**溯源**而非模型 |
| 在 mandate 边界内操作 | ⭐⭐ | 我们已实现 |

**AI 明确不该碰的：任何合规判定。**

配套文档 §八 已论证：对证券类买方，把 "AI" 写在首页会**削弱**我们。此处再加一条法条级理由——提案要求记录具备**可复现性**与**可被监管查看**，而 LLM 输出天然不满足可复现性要求。**确定性不是修辞，是合规属性。**

---

## 七、竞争态势：执行层可能不在 Uniswap

**这是一个会影响架构的判断，必须写清楚。**

| 事件 | 日期 | 含义 |
|---|---|---|
| Uniswap 发布 Permissioned Pools | 2026-07-23 | Uniswap 拿到**准入与合规**层 |
| Anchored 通过 **UniswapX** 在 Arbitrum 上线代币化股票 | 2026-08 | UniswapX 拿到部分执行流 |
| **Silhouette + xStocks 在 Hyperliquid 上线代币化股票 RFQ** | **2026-09-01** | ⚠️ **大额执行跑到了 Hyperliquid** |

**结构原因**：**AMM 在结构上不适合 $100k+ 的股票订单**——滑点与 MEV 暴露使得 RFQ / intent 路径占优。Silhouette 由 Polychain 与 RockawayX 支持。

> 📌 **推论**：**不要押"Uniswap 会成为股票交易的主要场所"。** 更可能的格局是 **Uniswap 成为合规准入层，而执行分散到多个场所**（RFQ、UniswapX、订单簿）。
>
> → **产品应设计为跨场所，而不是绑死 Uniswap。** 这与机会 1（名册层）天然一致——**名册本来就不属于任何交易场所。**

---

## 八、优先级与时间表

### 无条件先做：2026-11-03 前提交公开评论

| 项 | 内容 |
|---|---|
| **截止** | **2026-11-03**（提案于 Federal Register 公布后 60 天；Skadden 明确写"Comments are due November 3, 2026"） |
| **写什么** | §二 那个矛盾——**不可篡改账本下的"删除持仓明细"留存要求如何适用**。理由：SEC **主动征询**、**目前无公开答案**、且**恰好落在我们架构的正中央** |
| **为什么必须做** | ① 成本 ≈ 写一篇文档；② 逼自己做完这份分析；③ 署名；④ 进入那个文件；⑤ **它免费决定我们该造哪个产品** |
| **顺带可评论** | 钱包地址能否作为主要标识（§四）→ 直接影响名册层的身份数据设计 |

### 之后的顺序

| 顺序 | 动作 | 理由 |
|---|---|---|
| 1 | **机会 4**：向 `uniswap-ai` 贡献 permissioned / 合规 / 公司行动相关 skills | 摩擦最低；建立与 Uniswap Labs 的直接关系；可申请 UF grant；是"AI × Uniswap"里**今天真实存在**的那条路 |
| 2 | **机会 6**：从监管文本生成带出处策略的原型 | 复用 `src/policy/` + `src/mandate.ts`；直接服务机会 1 与 5 |
| 3 | **机会 1**：名册层证据层 | 最大且最贴合；但**前置条件是律师意见 + 一家真实 transfer agent 对话** |
| 4 | **机会 2 / 3**：公司行动与市场状态的研究笔记 | 支撑 1 与 5 的申请，且是唯一无公开答案的纯技术题目 |

---

## 九、诚实的风险

**1. 法律定性未经确认，且可能致命。**
提案**明确不**判定何时代币化证券需要注册 transfer agent。我们卖工具给 TA 的定位、与"我们提供名册基础设施"的定位，法律后果完全不同。**必须找证券律师确认。** 在确认前，本文档全部商业推论均为条件性。

**2. 名册层可能不允许软件供应商进入。**
提案要求 TA 对名册保持 **"at all times exclusive control"**，且**一个发行只有一个 recordkeeping TA**。这意味着**买方的数量天然有限**（等于注册 TA 的数量），且现有 TA 多为根深蒂固的机构。**这是一个买方数量少、但单个价值高的市场——与 §C4"无直销能力"的冲突比 TSV 更严重。**

**3. 提案只是提案。**
它是**规则提案**，不是生效规则。可能被修改、延迟或撤回。**不要把它当既成事实来设计产品。** 与之对比，TSV 豁免是**已生效的豁免令**（但带 5 年落日）。

**4. 时间与精力分散。**
同时推进名册层与 TSV 层会摊薄。配套文档已结论"不启动商业化动作"；本文档进一步建议**用一个评论文件同时服务两条线**，而不是两条线并行开发。

**5. 司法辖区与任职约束。**
与配套文档 §九 风险 4 同：跨境向美国受监管实体提供服务、收取报酬、以及高校任职带来的声誉与合规约束，需与风险 1 一并取得专业意见。

---

## 十、待决决策（需登记入 roadmap.md）

> 承接配套文档新增的 Q10–Q13；以下为本文档新增。

| # | 待定决策 | 影响 | 状态 |
|---|---|---|---|
| **Q14** | 评论文件（11-03）是否**单独署名**，还是与配套文档的 grant 申请捆绑？ | 决定这条线索的归属与可引用性 | 待定（**有时限**） |
| **Q15** | 产品主线取**名册层（TA）**还是**交易层（TSV）**，还是做**跨场所的名册+证据层**？ | 决定架构、买方、以及是否绑死 Uniswap（见 §七） | 待定 |
| **Q16** | 是否承认"纯链上名册不成立"，把链下受控副本纳入架构？ | 直接决定机会 1 的架构（见 §四 钱包地址与实体地址问题） | 待定 |
| **Q17** | 我们是否愿意承担"**Tokenization Agent**"这一尚未定义的角色？ | 决定是成为被点名的服务商类别，还是退到工具供应商 | 待定 |

### 与 roadmap §八（非目标）的对齐

增补一条：

- **不做绑死单一交易场所的产品**（理由：§七，执行层正在分散）

---

## 十一、结论

1. **9/1 提案可能比 9/17 豁免更重要，且与既有引擎的对应更紧。** SEC 自己用五个词（attributable / controlled / complete / correctable / examinable）描述了名册必须满足的性质，而这五个词几乎逐词落在我们已有的抽象上。
2. **`complete` 第一次有了法定买主。** 非省略证明的理由从"内部可信度"升级为"SEC 明文要求的记录属性"。
3. **SEC 自己提出的矛盾（不可篡改 vs 法定删除）就在我们架构的正中央**，而目前没有公开答案。**评论截止 2026-11-03。**
4. **17ad-31 给了配套文档的法条佐证**：白名单本身不够，hook 之上必须有授权与证据层。
5. **新的受监管角色类别正在形成**（Tokenization Agent / DLT Platform），且**钱包地址不能替代实体地址**——纯链上名册的叙事不成立。
6. **执行层可能不在 Uniswap。** 产品应跨场所设计。
7. **AI 在这里的用处是具体的四处，不是全部。** 合规判定不在此列——可复现性是合规属性，不是修辞。
8. **两个提案都是条件性的**：一个是提案，一个是带 5 年落日的豁免令。**本文档不改变"当前不启动商业化动作"的结论。**

> **先写那份 11-03 的评论。** 它同时是分析、分发、标准位入口，而且**它免费告诉我们该造哪个产品**。

---

## 附录：外部来源

**监管文本**
- [SEC Proposes to Modernize Rules for Registered Transfer Agents（Release 2026-81）](https://www.sec.gov/newsroom/press-releases/2026-81-sec-proposes-modernize-rules-registered-transfer-agents)
- [提案全文 PDF：Release No. 34-106246](https://www.sec.gov/files/rules/proposed/2026/34-106246.pdf)
- [Transfer Agent Rules 提案页（File S7-2026-30）](https://www.sec.gov/rules-regulations/2026/09/s7-2026-30)
- [SEC Issues "Innovation Exemption"（Release 2026-90）](https://www.sec.gov/newsroom/press-releases/2026-90-sec-issues-innovation-exemption-facilitate-trading-tokenized-nms-stock-request-comment)
- [指令全文 PDF：Release No. 34-106402（File 4-927）](https://www.sec.gov/files/rules/exorders/2026/34-106402.pdf)

**法律分析**
- [SEC Proposes Modernization of Transfer Agent Rules, With Significant Implications for Tokenized Securities（Skadden）](https://www.skadden.com/insights/publications/2026/09/sec-proposes-modernization-of-transfer-agent-rules)
- [Recordkeeping in the Blockchain Era（Jones Day）](https://www.jonesday.com/en/insights/2026/09/recordkeeping-in-the-blockchain-era-sec-proposes-overhaul-to-the-transfer-agent-rules)
- [A New Regulatory Framework for Transfer Agents（Greenberg Traurig）](https://www.gtlaw.com/en/insights/2026/9/a-new-regulatory-framework-for-transfer-agents-an-analysis-of-the-secs-modernization-proposal-and-industry-implications)
- [SEC Proposes Blockchain-Based Official Share Registers](https://www.onebullex.com/news/articles/sec-proposes-blockchain-based-official-share-registers-on-september-1-2026)

**Uniswap / AI**
- [Uniswap AI Overview | Uniswap Developers](https://developers.uniswap.org/docs/uniswap-ai/overview)
- [Uniswap Skills | Uniswap Developers](https://developers.uniswap.org/docs/uniswap-ai/skills)
- [GitHub — Uniswap/uniswap-ai](https://github.com/Uniswap/uniswap-ai)
- [Permissioned Pools Architecture | Uniswap Developers](https://developers.uniswap.org/docs/protocols/uniswap-labs-hooks/permissioned-pools/architecture)
- [Uniswap 7 AI Agent Skills（第三方综述）](https://gist.github.com/afrexai-cto/725951fd9b60a7058575c0d716672159)

**执行层竞争**
- [Silhouette and xStocks Launch RFQ Trading for Tokenized Equities on Hyperliquid](https://chainwire.org/2026/09/01/silhouette-and-xstocks-launch-rfq-trading-for-tokenized-equities-on-hyperliquid/)
- [Silhouette Opens an RFQ Lane for xStocks on Hyperliquid（RWA Trails）](https://www.rwatrails.com/news/silhouette-rfq-xstocks-hyperliquid-2026-09-01)
- [Anchored to Launch Tokenized Stocks on Arbitrum via UniswapX](https://tradetecheye.com/news/anchored-to-launch-tokenized-stocks-on-arbitrum-via-uniswapx-for-onchain-capital-markets)

**公司行动**
- [Handling Corporate Actions Onchain（Flo Finance）](https://blog.flo.finance/handling-corporate-actions-onchain-a-technical-guide-to-splits-dividends-and-m-a/)
- [Corporate Actions in Tokenized Stocks（Bitrue）](https://www.bitrue.com/blog/corporate-actions-tokenized-stocks)
- [Corporate Actions on the Blockchain（Chainlink）](https://chain.link/article/corporate-actions-blockchain)

**市场参照（不作论据）**
- [Tokenized Stocks Now Have Nearly 3 Million Holders, But Trading Volume…（BeInCrypto）](https://beincrypto.com/tokenized-asset-holders-record-high/)
- [Tokenized Stocks 2026: Wall Street On-Chain（Mintarex）](https://mintarex.com/en/blog/tokenized-stocks-market-2026)
