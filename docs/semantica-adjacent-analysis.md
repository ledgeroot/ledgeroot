# Semantica 相邻参照分析 —— 它有哪些做法值得我们偷

> 调研日期：2026-09-18
> 调研对象：**Semantica**（`semantica-agi/semantica` · getsemantica.ai · PyPI `semantica` · MIT）
> 对比标的：Ledgeroot（本仓库）+ MandateKey
> 调研方法：**GitHub 仓库页 + README 原文 + PyPI JSON API（均为一手，本次直接抓取）**
> 关联文档：[aws-agentcore-payments-analysis.md](./aws-agentcore-payments-analysis.md) · [vaara-competitive-analysis.md](./vaara-competitive-analysis.md) · [roadmap.md](./roadmap.md) · [commercialization.md](./commercialization.md)

---

## 结论摘要

**它不是我们的竞品，一次也不算。** 它记录的对象是「agent 知道什么、决定了什么」（context/decision），我们记录的对象是「agent 花了谁的钱、谁授权的、结算了没有」（payment）。两者没有一行代码、一个标准、一个买方是重合的。

**但它可能是本仓库所有参照对象里，架构论证与我们最像的一个。**

| | Semantica | Ledgeroot |
|---|---|---|
| 主张 | 确定性基础设施，**不需要 LLM** | 确定性基础设施，**不做 LLM 推理闸门** |
| 产物 | 事实的来源链（W3C PROV-O） | 支付的证据链（签名 + 哈希链 + 锚定） |
| 姿态 | 自托管、零厂商锁定、不替代你的栈 | 同 |
| 边界措辞 | "**system-level** explainability, not foundation-model explainability" | "不做 LLM 推理闸门" |
| 买方 | 受监管企业的合规/风控 | 财务/AP（合规在小额场景暂不在场） |
| 商业模式 | MIT 内核 + 企业自托管/SLA/专业服务 | `commercialization.md` §三 的同构分层 |

**最值得偷的不是某个功能，而是一句话**：

> **"Decision provenance and audit trails aren't the product. They fall out of that structure for free."**

它把审计做成了**主收益的自然副产物**（图结构让 agent 更聪明 → 顺便就能回答"为什么"）。**我们的审计是主产品**，而 agent 运营方今天从它身上拿不到"马上就有用"的好处——除了花钱上限。这是它对我们最大的启发：**给证据层挂一个自然后果级的主收益。**

**三条最具体的动作**（其余见 §三）：

1. **把收据变成可查询的支付记忆**（先例检索 / 意图链 / 影响面）—— 我们已经有全部原料（逐笔收据 + `taskId` + 对手方 + 金额 + 报价），只差查询原语。见 §三·2、roadmap §五 P1-6。
2. **Install matrix** —— 他们每周在 3 个 OS × 4 个 Python 版本上验证包可安装。**我们刚刚因为缺这个，把 `engines: >=20` 这条假声明发到了 CI 上（node 20 上 4 个 worker SIGSEGV）。** 见 §三·3、roadmap P2-5。
3. **`doctor` 自检命令** —— 我们的失败模式是**静默降级**（没设签名密钥 → 收据不签名 → 验证从 `verified` 掉到 `incomplete`），而这恰恰是最需要一条命令说清楚的。见 §三·4、roadmap P2-5。

---

## 一、它是谁

### 1.1 侧写与规模（一手核验）

| 项 | 内容 | 置信度 |
|---|---|---|
| 定位 | "Graph-Native Infrastructure for Context and Accountable AI Systems"；自述 **"alternative to expensive enterprise platforms"**（对标企业级知识平台，不对标同类开源） | 高 |
| 许可 | **MIT**（内核）+ 企业版（on-prem、私有云、SLA、专业服务，页面只写"联系我们要报价"） | 高 |
| 首版 | **PyPI 0.0.1 上传于 2025-11-21** | 高（PyPI JSON） |
| 当前版本 | **0.6.8**（约 10 个月到 0.6.8） | 高 |
| 体量 | **13.2k star · 1.5k fork · 2,964 commits · 68 watching** | 高（抓取时刻快照） |
| 包元数据 | `requires_python >=3.8`；**core 22 个依赖，重依赖全部收敛进 extras**（40+ 个 extras：`[viz]` `[agno]` `[vectorstore-all]` `[all]`…） | 高 |
| 维护形态 | 单人主导（PyPI owner `semantica-dev`，maintainer `kaif@getsemantica.ai`，PR 里点名 `@KaifAhmad1`）；**引用条目刻意署名 "Semantica" 而非个人** | 中 |
| 分发面 | PyPI · Discord · YouTube 演示 · 12 语言 README（readme-i18n）· Trendshift 榜单 · 9 个编辑器插件 · MCP server · REST API · 8 个平台的部署模板 | 高 |
| 信任工程 | **SLSA build provenance + Sigstore 签名**，`.sigstore.json` 随 wheel/sdist 发布；**OpenSSF Scorecard**；Dependabot / Trivy / osv-scanner / checkov | 高（其 README 自述） |
| 牵引 | ⚠️ **下载量未核实**（PyPI JSON 的 `downloads` 字段返回 -1，本次未取 pepy 数值） | 低 |
| 收入 / 团队规模 | ⚠️ **完全未核实**。企业页无定价。**13.2k star 是分发证据，不是收入证据** | — |

### 1.2 它实际在做什么

一条完整的流水线：**多源摄入 → 解析/规范化/切分 → NER·关系·事件抽取 → 冲突检测 → 实体消解 → 知识图谱 → 〔本体 · 推理 · **溯源** · **决策**〕→ 导出/可视化/REST·MCP·CLI**。

其中与我们有概念交集的两块：

- **Decision Intelligence**：决策是一等图节点。`record_decision` → `add_causal_relationship`（`CAUSED` / `INFLUENCED` / `PRECEDENT_FOR`）→ `trace_decision_chain`（因果祖先）→ `find_similar_decisions`（**先例检索**）→ `analyze_decision_impact`（下游影响面）→ `check_decision_rules`（策略门）。
- **Provenance**：W3C PROV-O，每个事实可追到源，导出 JSON/CSV/RDF，被其称为"监管方接受的格式"。

**它明确不做的**：不解释模型内部（原文：*"its internal reasoning or chain-of-thought stays opaque"*）。这条**与我们"不做 LLM 推理闸门"是同一个边界**，只是他们的措辞更好——把一个非目标写成了一句对照。

---

## 二、重合与不重合

### 2.1 对表：三根支柱

| 我们的支柱 | Semantica | 判断 |
|---|---|---|
| **1. 授权**（用户自签 mandate 约束 agent 花钱） | ❌ 完全没有。它没有"钱"这个对象，也没有授权凭据 | **不重合** |
| **2. 执行前校验**（fail-closed 五条策略拦支付） | ⚠️ 有 `check_decision_rules` + SHACL + Rete 规则引擎，但校验的是**事实与决策**，不是支付授权 | **概念相邻，对象不同** |
| **3. 审计留痕** | ⚠️ **有，而且叙事比我们强**：provenance + 因果链 + 策略记录 + PROV-O 导出。**但没有签名、没有哈希链、没有锚定、没有离线三态验证、没有拒付留痕** | ⚠️ **同形不同质** |
| 支付与结算 | ❌ 零。无 x402、无 MPP、无钱包、无链 | **不重合** |

### 2.2 最要紧的一处差异：**溯源 ≠ 不可篡改**

他们的 PROV-O 回答的是「**这条事实从哪来**」；我们的签名 + 哈希链 + Merkle 锚定回答的是「**这条记录有没有被改过、是谁做的陈述**」。

- PROV-O 是一个**数据模型**，不是信任机制——它能被完整地伪造，且无法自证。
- 所以两者不是竞争关系：**他们是"来源可追"，我们是"内容不可否认"。**

> 📌 **但这条差异里藏着一个可借的东西**：PROV-O 是**审计师与合规工具已经认得的格式**。我们自造 `ledgeroot.receipt.v1`，第三方要验就得先读我们的文档。见 §三·6。

---

## 三、值得偷的八条

> 每条：**他们的做法 → 我们的现状 → 具体动作**。按"性价比"排序，不按他们的模块顺序。

### 1. 让审计成为主收益的副产品（**最重要的一条**）

- **他们**：审计不是卖点，是图结构的自然属性。原文见 §结论摘要。
- **我们**：审计就是卖点。而 agent 运营方从收据里得到的即时好处，目前只有"花超了会被拦"。
- **动作**：给证据层挂一个**自然后果级**主收益。最合适的两个候选都在下面第 2 条里——它们让 agent **自己**受益，而不只是让财务受益。

### 2. 把"解释"做成查询原语，而不是报告

- **他们**：`trace_decision_chain` / `find_similar_decisions`（**先例检索**）/ `analyze_decision_impact`，三个动词就构成了"审计即查询"。
- **我们**：原料全都有（逐笔收据 + `taskId` + 对手方 + 金额 + 402 报价 + 策略判定），但查询面只有一个 `taskId` 分组键，`consistency.ts` 的分析只在库里、没暴露成 API。
- **动作**：给"账"层定义第一批查询原语：
  | 原语 | 对应他们的 | 对我们的直接价值 |
  |---|---|---|
  | **先例检索**（"这个对手方上次收我多少"） | `find_similar_decisions` | ⭐ **对 agent 有即时经济价值**：避免重复采购、发现报价上涨 |
  | **意图链追踪**（`taskId` → 全部支付 → 拦截 → 结果） | `trace_decision_chain` | 把"这笔钱属于哪次任务"变成一次遍历 |
  | **影响面**（这个对手方/端点吃掉多少预算） | `analyze_decision_impact` | 异常视图的前置 |
- ⚠️ **这是唯一一条我认为会改变产品形态的**：它把收据从"给审计看的死档案"变成"给 agent 用的活记忆"。见 roadmap §五 **P1-6**。

### 3. Install matrix（跨 OS × 版本，定期跑）

- **他们**：`install-matrix.yml` **每周**在 Ubuntu / macOS / Windows × Python 3.9–3.12 上验证发布包可安装。
- **我们**：CI 只有一个 OS、只覆盖 node 版本；**我们刚刚因为缺这个，把 `engines: ">=20"` 这条假声明带进了 CI**——node 20 上 4 个 vitest worker SIGSEGV（`better-sqlite3@13` 需要 ≥22），72/100 通过后崩。
- **动作**：CI 扩成 `os × node` 矩阵（`ubuntu` + `macos` × 22/24），并加一步 **从 `npm pack` 产物安装的冒烟测试**（不是从源码跑测试——那验证不了发布物）。见 roadmap **P2-5**。

### 4. `doctor` 子命令

- **他们**：`semantica doctor`，"5 秒验证安装"，并在 README 里紧跟 quick start 之后。
- **我们**：没有任何自检命令。而我们的失败模式恰好**全是静默降级**，正是 `doctor` 最擅长的那类：
  - 没设 `LEDGEROOT_SIGNING_KEY` → 收据不签名 → 验证从 `verified` 掉到 `incomplete`；
  - **换了签名密钥 → 历史收据的 `kid` 全部对不上 → 整本账变 `incomplete`**（这是我们独有的坑）；
  - 没设 `LEDGEROOT_ANCHOR_ADDRESS` → 锚定静默不可用；
  - DB 路径不可写；facilitator / RPC 不可达。
- **动作**：`ledgeroot doctor`，输出**逐项**结论（不是一句 ok），特别是 **`kid` 与库内已有收据是否匹配**。见 roadmap **P2-5**。

### 5. 发布物的信任工程

- **他们**：SLSA build provenance + Sigstore 签名 + `Signed-Releases` 门禁 + Scorecard + 依赖扫描全家桶。
- **我们**：npm 发布，**没有 provenance、没有签名**。
- **为什么这条对我们比对别人更紧要**：我们卖的是"**可验证**"。**如果连自己的发布物都不可验证，"证据引擎"这个定位在自我一致性上就站不住**——这是最容易被对手一句话打穿的地方。
- **动作**：`npm publish --provenance`（GitHub Actions OIDC 支持，基本零成本）；开 Dependabot；把依赖审计加进 CI。见 roadmap **P2-5**。

### 6. 用外部标准格式做出出口

- **他们**：以 **W3C PROV-O** 作为"监管方接受的格式"交付，而不是自造一个只有自己认的格式。
- **我们**：`ledgeroot.receipt.v1` 是自有 schema，导出只有 JSON（+ MandateKey 的 zip 证据包）。
- **动作**：给 `ledgeroot_export` 加一条 **PROV-O / RDF 导出**。
  - 理由不是新颖，是**便宜**：审计师与合规工具已经认得 PROV-O，**这比再推一个自造 profile 省力得多**。
  - 它正对 [roadmap.md](./roadmap.md) §2.4 的 **N2（人类可读交付物）**，是 N2 最省力的一半。
- ⚠️ **必须诚实标注**：PROV-O 是**交付格式，不是信任根**。我们的签名 + 锚定仍然是信任根；不能因为导出了 PROV-O 就暗示它自带完整性。

### 7. "可替换后端"当架构纪律，而不是当卖点

- **他们**：RDF 三库 / LPG 四库 / 向量库八种，统一接口，"**all swappable without touching your code**"。
- **我们**：`LedgerootStore` 只有 SQLite 一个实现；链硬编码（我们自己的"已知边界"表第一条）；`PaymentProvider` 接口已存在（方向对了，MPP 就是第二个实现）。
- **动作**：把它写成一条**架构纪律**而不是宣传语：**每个"后端维度"（存储 / 链 / 协议）都必须有接口 + 至少两个实现，且"不支持"必须显式报出。**
  - 我们在这条纪律的后半句上**已经做对了**：未知结算协议报 `incomplete`（`verifySettlement`），而不是放行——这正是 Semantica 那条纪律的正确版本。

### 8. 把定位写成三列表

- **他们**：`Vector DB + RAG | Plain LLM Memory | Semantica`，行是能力维度，**第三列永远是我们的强项**。
- **我们**：README 是"做 / 不做"两列，攻击性弱。
- **动作**：换成 **`裸 x402 | 云控制面（AWS）| Ledgeroot`**，行取：授权、对手方绑定、报价漂移、拒付留痕、第三方离线验证、厂商中立、零出境。
  - 这张表同时服务 README 与 [aws-agentcore-payments-analysis.md](./aws-agentcore-payments-analysis.md) 的定位——**我们的功能性差异（对手方绑定、报价漂移）在第三列会自己显形**。

---

## 四、它替我们验证了的三个判断

1. **"确定性 + 不依赖 LLM"是可卖的技术立场。** 他们明说图谱构建、推理、溯源**都不需要 LLM**，并把这当成核心卖点之一。→ 我们"不做推理闸门、优势是确定性"的非目标，**有同类项目作背书**。
2. **"自托管 / 零厂商锁定"面对受监管企业确实是刚需。** 与 `vaara-competitive-analysis.md` 的结论一致：这一格 **不再独占，但确实是刚需**。Semantica 是第三个走这条路的项目（Vaara、我们、它）。
3. **"审计是入口级需求"——但在高风险域成立，在我们的小额域不成立。** 他们的买方是合规/风控，域是信贷、医疗、法务、国防——**每个都有明确的监管在场**。我们的小额支付域没有。
   → ⚠️ **这反过来加强了 `commercialization.md` §二 取舍 B 的判断**：合规叙事的有效性取决于场景的**金额与后果量级**。**不是"合规不重要"，是"在那个粒度上没人在场"。**

---

## 五、不该学的

| 不学 | 原因 |
|---|---|
| ❌ **不要做知识图谱 / 本体 / 向量库 / 抽取管线** | 另一个问题域；且我们没有人手。**它的广度是它的护城河，也是它的脆弱面**（一个 release 修 35 个正确性 bug、关 19 个安全告警）。我们该**窄而深** |
| ❌ **不要抄 12 语言 README、Trendshift 徽章、star-history 图** | 那是增长动作。**在没有 traction 的阶段是装饰**，而且会稀释"证据引擎"的严肃感 |
| ❌ **不要用 star 数当竞争力依据** | 13.2k star 是分发证据；**企业页无定价、无收入披露、下载量本次未核实**。把 star 当牵引会重犯"把 BlueTier 111 次/周当唯一牵引"那类误判 |
| ❌ **不要把 PROV-O 当信任机制** | 它表达来源，**不表达不可篡改**，可被完整伪造。见 §2.2 |
| ⚠️ **一个负面教训**：发布物与仓库的单一事实源 | 他们的 **PyPI `long_description` 与仓库 README 已经分叉**（同一段文字两处不一致）。我们已经有 `README.md` + `README.zh-CN.md` 两份，**同步成本要刻意维持**——这一点我们目前做对了 |

---

## 六、行动建议

| # | 动作 | 去向 | 成本 |
|---|---|---|---|
| 1 | **支付查询原语**（先例检索 / 意图链 / 影响面） | roadmap **P1-6** 的接口面 | 中（但原料已全在库） |
| 2 | **CI 扩成 `os × node` 矩阵 + `npm pack` 冒烟测试** | roadmap **P2-5** | 低 |
| 3 | **`ledgeroot doctor`**（含 `kid` 匹配检查） | roadmap **P2-5** | 低 |
| 4 | **`npm publish --provenance` + Dependabot + 依赖审计** | roadmap **P2-5** | 极低 |
| 5 | **PROV-O / RDF 导出**（标注为交付格式、非信任根） | roadmap **P3-4**（N2 的一半） | 低 |
| 6 | **README 三列表**（`裸 x402 / AWS / Ledgeroot`） | README + AWS 分析 | 极低 |

### 明确不做的

- ❌ 不引入图数据库、不做本体、不做抽取（§五）。
- ❌ 不以 Semantica 为对标做任何路线图决策——**这次借的是做法，不是方向**。

---

## 附录：置信度说明

| 项 | 置信度 | 依据 |
|---|---|---|
| 定位、架构、模块、边界措辞、MIT、企业页内容 | **高** | **一手**：GitHub README 原文 |
| 版本、首版日期、依赖与 extras 结构、`requires_python`、维护者邮箱 | **高** | **一手**：PyPI JSON API |
| star / fork / commit 数 | **高** | 一手，但**为抓取时刻快照**，会变 |
| SLSA / Sigstore / Scorecard / 扫描器 | **中** | **其自身 README 自述**，未独立核验签名产物 |
| 牵引（下载量） | ⚠️ **低** | PyPI JSON 的 `downloads` 返回 -1；**本次未取 pepy 数值** |
| 收入、团队规模、融资 | ⚠️ **未核实** | 仅有维护者邮箱与 PR 负责人；企业页无定价 |
| 与我们的重合度判断 | **高** | 由它公开的能力清单与本仓库源码逐项对照得出 |

---

## 来源

**一手（直接抓取）**

- [semantica-agi/semantica](https://github.com/semantica-agi/semantica) —— 仓库页（规模、目录、许可、Topics）
- [README.md 原文](https://raw.githubusercontent.com/semantica-agi/semantica/main/README.md) —— 定位、架构、Decision Intelligence、Provenance、安装与 extras、CI/部署、企业段
- [PyPI JSON API](https://pypi.org/pypi/semantica/json) —— 版本、首版上传时间、依赖与 extras、`requires_python`、维护者

**本仓库源码 / 文档**

- `src/tools/receipts.ts`（`exportEvidence` 的导出面）· `src/store/db.ts`（`LedgerootStore` 单实现）· `src/verify/verifier.ts`（未知协议报 `incomplete`）· `src/x402/facilitator.ts`（`PaymentProvider` 接口）· `.github/workflows/ci.yml`（当前单 OS 矩阵）
- [roadmap.md](./roadmap.md) §2.4（N2）· §五（P1-6）· §六（P2-5）· §七（P3-4）
- [commercialization.md](./commercialization.md) §二 取舍 B（合规在小额场景暂不在场）
