# 竞争格局：深度分析

> 定位：核心对手的逐维度拆解，按威胁等级排序
> 状态：2026-09-22
> 关联：[landscape.md](./landscape.md)（分类 · 半衰期 · 监控） · [standards.md](./standards.md)（学术与标准） · [roadmap.md](./roadmap.md) · [commercialization.md](./commercialization.md)
> 口径：每个对手按同一模板 —— **侧写 → 能力对比 → 它领先 → 我领先 → 弱点 → 动作**

**一句话结论**：能力面已被占满（Vaara 占两根半、OAP 占一根、AWS 把三根的表述面全占），**Ledgeroot 剩下的不是"能力独占"，而是"链上稳定币 × agent 小额 402 支付"这个生态位里的用户签名授权 + 零出境**。生态位是经济结构差异，能力差异可被半年抹平。

| 对手 | 性质 | 威胁 | 一句话 |
|---|---|---|---|
| **Vaara** | 自托管证据与门控层，AGPL | **最高** | 三根支柱全占，且可验证性工程领先我们一个量级 |
| **AWS AgentCore payments** | 云厂商 GA 产品 | **最高（不同性质）** | 分发压倒性，能力面全占，但"证据 ≠ 日志"没跨过去 |
| **TrustBench** | 托管注册表 + 路由器 + 收据 | 中 | 同层撞车，但架构弱；它自己让出了我们的那条道 |
| **Semantica** | 相邻参照（非竞品） | — | 架构论证最像我们，借做法不借方向 |

---

## 一、Vaara —— 目前最接近的对手

### 1.1 侧写

| 项 | 内容 |
|---|---|
| 主体 | Henri Sirkkavaara，**唯一版权持有人**，单人；付费 pilot 由作者本人承接 |
| 许可 | **AGPL-3.0-or-later**（v0.70.0 及以前为 Apache-2.0）；闭源嵌入需商业许可；**不接受第三方代码贡献**（为保留再许可能力，需先签版权转让） |
| 版本 / 活跃度 | **v1.50.0**；2026-04-20 建仓，5 个月；最后提交 2026-09-17 |
| 牵引 | **≈2,164 次/周**（PyPI 1,495 + npm 669）；GitHub 仅 12 star（CLI 分发形态，star 严重低估它） |
| 定位 | **自托管证据与门控层**——"Open source. **No SaaS. No telemetry. No signup.**" |
| 治理 / 存档 | 每 tag 由 Zenodo 归档并授 DOI；SLSA Build L3 + Sigstore + 持续 fuzzing + OpenSSF |
| 背书 | **IMDA Agentic AI 框架 v1.5 行业致谢**；AMD testimonial；EU Apply AI Alliance 三篇立场文 |

> ⚠️ **AGPL 的方向性**：AGPL 可以吸收 MIT 代码，**反过来不行**。这是 `commercialization.md` 待定项 **C2** 的直接输入。
> ⚠️ **"不接受外部贡献"是一条被低估的护城河**：它挡住分叉，但也意味着巴士系数 = 1。

### 1.2 能力清单（带版本）

| 版本 | 能力 |
|---|---|
| 基础 | `@vaara.govern` 装饰器：执行前风险打分 + 策略 allow/block/escalate；决策+调用+结果写入哈希链 trail；`report_outcome` 闭环；`shadow=True` 影子模式 |
| 打分 | 五个专家信号 + **保形置信区间**；词表 85.6% recall @ 5.1% FPR；热路径规则打分器 140 µs；25,556 条对抗语料 |
| **v1.1.0** | **强制执行**：credential broker 铸造签名短期凭据，绑定 attestation digest + 单 tool + 参数承诺 + tenant + typed capability scopes；gateway 拒绝无有效 grant 的调用（**默认关闭**） |
| **v1.4.0** | **Gap-evident completeness**：逐条签名 seq + running count，`vaara verify-contiguity`，无需联系签发方（**默认关闭**） |
| **v1.14.0** | **独立重铸**：第二个生成器仅凭规范化规则**逐字节重现签名载体**，不 import 任何 Vaara 代码 |
| v1.0 | 主权推理 harness：本地模型 + 签名代理产出硬件根植的推理收据，第二个模型交叉检查 |
| 验证 | **Vaara Resin**：单 HTML 文件，WebCrypto 重算 + 验签，**收据不出标签页、断网可用** |
| 时间锚 | 自托管 **RFC 3161** + **eIDAS 合格时间戳** |
| 硬件根 | TPM 2.0 quote + IMA 度量；AMD SEV-SNP；可重表达为 IETF RATS EAR / AR4SI；root-agnostic |
| 合规交付 | `vaara compliance report` 逐条 EU AI Act 证据（无事件条款返回 `evidence_insufficient` 而非橡皮图章）→ Notified-Body PDF / HTML 看板 / Sigstore 签名信封 |
| 集成 | LangChain / CrewAI / OpenAI Agents SDK 钩子；MCP 代理；**Claude Code plugin**；HTTP API；TS 客户端 |

### 1.3 逐维度对比

| 维度 | Vaara | Ledgeroot |
|---|---|---|
| 数据出境 | **零**；断网可验，明说"Vaara 不是验证的一方" | **零** |
| 授权凭据 | **credential broker 铸造**（厂商授权） | **用户 EIP-712 本地签名 mandate**，私钥不出本机 |
| 执行前强制 | ✅ v1.1.0（默认关） | ✅ 五条策略（fail-closed） |
| 风险打分 | ✅ 统计模型 | ❌ 纯确定性规则 |
| 支付语义 | ⚠️ 仅下游 profile（x402 settlement binding） | ✅ **x402 为主界面**：报价漂移 / payTo 绑定 / 累计上限 |
| 完整性 | ✅ v1.4.0 逐条 seq + running count + `maxClass` | ⚠️ 逐 epoch Merkle 根 + `receiptCount`，无逐条计数、无缺口最坏情况 |
| 独立可验证 | ✅ 极强：Resin 单文件 + `_check_independent.py` + 独立重铸 + 50 套公开一致性套件 | ❌ 与主库耦合 |
| 时间戳 | ✅ RFC 3161 自托管 + eIDAS 合格 | ⚠️ 仅链上锚定 |
| 硬件根植 / 后量子 | ✅ TPM 2.0 / SEV-SNP；ML-DSA-65 并行 | ❌ |
| 合规交付物 | ✅ 逐条 Art. 12 证据 + Notified-Body PDF | ❌ 无人类可读交付物 |
| 发现面 / 供应链 | ✅ MCP Registry / brew / PyPI / npm；SLSA L3 + Sigstore | ❌ |
| 许可 | AGPL-3.0（+ 商业许可） | MIT |
| 牵引 | ≈2,164/周 | 0 |

**读法**：Ledgeroot 占优的行只有四行——**支付语义、报价漂移/payTo、累计限额、凭据由用户自签**。其余打平或落后。

### 1.4 它领先之处（要认的）

1. **合规包装完成度**：直接产出 Notified-Body PDF 与逐条 Article 证据，并对无事件条款诚实返回 `evidence_insufficient`——**这正是"报告格式是领域问题，不是技术问题"那道坎，它已经跨过去了**。
2. **可验证性工程**：单 HTML 断网验证 + 不 import 签发方代码的 checker + **独立重铸逐字节重现**，三件叠加，最后一条是我们完全没有对标物的最强形式。
3. **硬件根植**：TPM 2.0 + IMA + SEV-SNP + RATS EAR，把它从"软件证据"推到"平台证据"。
4. **监管车道署名**：IMDA 致谢 + EU Apply AI Alliance 立场文。**Ledgeroot 的 README 也在对齐 MAS SAFR（同属新加坡），而对方已有署名。**
5. **时效性钩子打得准**：用 **EU Product Liability Directive（2026-12-09 生效）第 10 条**——无法披露证据时举证责任翻转——比 AI Act 第 12 条**更早、更宽**。
6. **发布卫生**：SLSA L3、Sigstore、持续 fuzzing、每版 Zenodo DOI。
7. **Dogfooding**：自家营销站点跑在自己的门控下并公开 trail 与公钥——最难伪造的公信力。

### 1.5 Ledgeroot 领先之处（仅四行，要守）

1. **x402 / 支付作为主界面**：Vaara 是通用 tool call 门控，x402 只是它 SPEC 里的下游 profile。
2. **凭据由用户自签**：它的 grant 由其 credential broker 铸造 = 厂商授权；我们是用户签名、私钥不出本机、可离线验签。
3. **聚合视角下的拒绝留痕**：我们出"N 笔尝试 / M 笔执行 / K 笔拦截"的一致性视图；未见它有等价物。
4. **许可更宽松**（MIT vs AGPL）——但按 C2，这既是资产也是负债。

### 1.6 弱点与可攻击面

| # | 弱点 | 说明 |
|---|---|---|
| 1 | **单人 + 不收外部贡献** | 巴士系数 = 1，生态无法靠贡献者扩张；对大企业采购是实质风险 |
| 2 | **社区可见度低** | 12 star；下载高但无社区表面，尽调时会注意到 |
| 3 | **两个关键能力默认关闭** | v1.1.0 强制执行与 v1.4.0 完整性**都 off by default**——默认配置下它只是一个记录器 |
| 4 | **不是支付专用** | 无报价漂移、无 payTo 绑定、无累计限额语义 |
| 5 | **凭据非用户自签** | broker 铸造 = 厂商在授权链上，与其"不依赖厂商"叙事存在张力 |
| 6 | **策略表达能力未公开** | README 未说明策略语言的形式化边界（OAP 至少限制了可判定片段并给了论证） |
| 7 | **无链上锚定** | 用 RFC 3161——**在合规接受度上是优势**，但公开可审计性依赖 TSA 而非公开账本 |
| 8 | **AGPL 对企业的摩擦** | 闭源嵌入需商业许可，法务流程长 |

### 1.7 战略判断与动作

- **它把"证据主权"从"位置"变成"已占据的位置"**：支柱 3 不再是差异，只是平价，且我们这一侧还差一截（缺单文件断网验证器）。
- **但生态位不重合**：它卖**高风险系统合规**（EU AI Act、产品责任、DORA），买方是合规/法务；我们卖**小额 402 支付**，买方是财务/AP。**不重合的原因是经济结构**——$0.005 既不触发产品责任，也不在 FATF/MiCA 金额门槛内。它转身进来不是"加个功能"，是"换一个买家和一套话术"。
- **真正的问题不是它抢了什么，而是我们慢了多久**：它 5 个月到 v1.50.0、50 套一致性套件、一份 IETF 草案（4 天内 `-08`→`-10`）；我们是 0 下载、测试网、无发现面、无独立 checker。**这是发布节奏差一个数量级。**

**动作（借力，不重复造）**：

1. 跑一遍它的公开向量与 `_check_independent.py`（零成本拿外部验证基线，同时实测它的诚实度）。
2. 读它的 `docs/PRIOR_ART.md` 与 `docs/eu-ai-act-article-12.md`——后者公开写了"第 12 条要求什么、不要求什么、该向工具要求什么"，**这正是我们打算自己去问审计师的那份功课**。
3. 对齐 `vaara.receipt/v1` 作为可选输出格式（它的 SPEC 明确欢迎下游只定义 evidence schema）。
4. 在 C2 决策里纳入 AGPL 的对照。

---

## 二、AWS —— Bedrock AgentCore payments

> 来源：AWS 官方 GA 博客 + `docs.aws.amazon.com` 官方文档页（均为直接抓取的一手页面）。

### 2.1 侧写

| 项 | 内容 |
|---|---|
| 状态 | **已 GA（2026-08-18）**；2026-05 与 Coinbase / Stripe 合作 preview |
| 定位 | AgentCore 生产栈补齐支付一环：Runtime / Memory / Identity / Gateway / Policy / Observability **+ Payments** |
| 授权 | **Payment session**：`maxSpendAmount` + `currency` + expiry；过期或超限后会话内后续支付被拒 |
| 强制 | 官方原文：*"The check is **deterministic** and runs at the **infrastructure layer**"*；凭据存 Secrets Manager，**agent 看不到原始凭据** |
| 协议 | **x402 v1 + v2 + MPP**，另加 x402 的 **`upto`** scheme（先授上限、按用量结算） |
| 审计 | CloudWatch 日志 / span / 预置看板，官方称 **payment audit trails**；失败记为 `FAILED` |
| 钱包 | Coinbase CDP / Stripe Privy；**法币入金**（卡 / Apple Pay / Google Pay / ACH） |
| 分发 | **AWS Marketplace 采购 + 既有企业账号** + CloudFront / Cloudflare 边缘 + Bazaar 策展发现 + Strands / LangGraph / OpenClaw / OpenAI Agents SDK 插件 |
| 已公布客户 | Anchor Browser、**Travala**（旅行 MCP）、Elsa AI、Heurist AI、SpreadX/Incarna |

> 📌 **注意 Travala**：我们曾说旅行预订"复杂得多、未证明形成规模"，**AWS 把旅行预订作为公开客户案例**——这条边界至少在企业叙事上已被挪动。

### 2.2 逐维度对比

| 维度 | AWS AgentCore payments | Ledgeroot |
|---|---|---|
| 形态 | **云服务**（控制面在 AWS） | **本地 MCP 插件 + CLI**，无服务端 |
| 授权凭据 | **AWS 签发**（PaymentManager + IAM/JWT）+ **钱包方授予** | **用户 EIP-712 本地签名 mandate**，chain-agnostic |
| 限额粒度 | 会话级 `maxSpendAmount` + currency + expiry | 单笔 + 累计 + 端点限速 + 报价漂移 + 白名单 + payTo |
| 对手方约束 | ❌ 未见文档化（只有总额度） | ✅ 白名单（host 维度）+ payTo 绑定 |
| 报价/实扣一致性 | ⚠️ 有 `upto`，但校验只到"不超会话额度" | ✅ **报价漂移策略**（默认 10%） |
| 执行前校验 | ✅ 确定性，**在基础设施层**（agent 拿不到凭据） | ✅ 五条策略，**在本机** |
| 协议 | ✅ x402 v1+v2 + MPP + `upto` | ⚠️ 仅 x402（`protocol` 维度已有，MPP 未实现） |
| 审计产物 | CloudWatch 日志 / 看板 | Ed25519 签名收据 + RFC 8785 哈希链 + epoch Merkle 根上链 |
| 拒绝留痕 | 失败记 `FAILED`（服务状态） | ✅ **拒付同样出签名收据** |
| 第三方独立验证 | ❌ **必须信任 AWS** | ✅ 证据包 + JWKS 离线验签 |
| 断网 / 气隙验证 | ❌ 服务端产品 | ⚠️ CLI 本地可验；**单文件断网验证器未发布** |
| 钱包与入金 | ✅ 完整（法币入金、WalletHub、Quick Create） | ❌ 只支持自带私钥 |
| 发现面 / 分发 | ✅ Bazaar + Gateway + Marketplace | ❌ |
| 数据出境 | 支付轨迹进 CloudWatch（厂商可见） | ✅ **零出境** |
| 许可 | 专有 SaaS | **MIT** |

**读法**：Ledgeroot 占优的行是**对手方约束、报价漂移、签名拒付收据、第三方离线验证、零出境、许可**。**且"确定性"这一格 AWS 也有**——不能再拿"确定性"当独有卖点。

### 2.3 它领先之处（要认的）

1. **分发压倒性且零摩擦**：走既有 AWS 账号与 Marketplace 采购，代码接入只需一个插件。我们那三条"非直销路径"在它面前基本失效——**它不是"需要直销"，而是"已经在企业预算里"**。
2. **协议广度领先一个身位**：MPP 已实现，x402 覆盖 v1+v2 并加 `upto`（pay-per-inference 这类动态定价需要的东西）。
3. **强制力更硬**：agent 拿不到凭据。**在基础设施层的强制 > 本地校验**——必须承认。
4. **入金问题被解决**：法币入金 + 钱包 Hub + Quick Create，我们完全没有这一环。

### 2.4 Ledgeroot 仍占优之处（要守的）

1. **证据 ≠ 日志，这是唯一不可让的一格。** 它的 audit trail 是**某家厂商云里的日志**：证明"AWS 记录了这些"，**不证明记录完整、未被更改、第三方可复核**。而 **AWS 是这笔交易的当事人**（持有凭据、编排支付、指示签名），**结构上不能同时是验证的中立第三方**——与"记账人不能同时是审计师"同理。
2. **对手方绑定**：会话额度管的是**花多少**，不管**付给谁**。被提示注入的 402 响应，只要不超额度就会被付给攻击者地址。**白名单 + payTo 绑定 + 报价漂移正是拦这一类**——dry-run demo 第 ④ 步就是它，而在 AWS 的模型里那笔支付在额度内是被允许的。
3. **宿主与链中立**：任何 MCP 宿主、任何链；AWS 要求 agent 跑在 AgentCore、钱包用 Coinbase/Privy。**多云/多框架的舰队，无法把某一家云的控制面当作中立的证据根。**
4. **凭据由用户自签** + **零出境** + **MIT 无平台绑定**。

### 2.5 弱点与动作

| # | 弱点 | 对应动作 |
|---|---|---|
| 1 | **证据可验证性缺失**（无签名、无链、无锚定） | 把"日志 vs 证据"讲透 + 补单文件断网验证器 |
| 2 | 只有总额度，无对手方与报价约束 | demo 与文档主推"注入 → 转给未绑定地址"；把 `upto` 与报价漂移接起来 |
| 3 | 绑定 AgentCore + Coinbase/Privy | 定位为**跨云中立证据层** |
| 4 | 单一厂商信任模型 | 面向"不能把支付证据发给第三方"的客户群（Vaara 通过，**AWS 不通过**） |
| 5 | 推向了旅行等场景 | "不做旅行预订"改为**"差异化不在交易撮合，而在证据"** |
| 6 | 服务端产品有可用性/区域限制 | 强调离线、气隙、无服务依赖 |

**⚠️ 它推翻了我们自己的一条论证**：`commercialization.md` §零 说这个位"由费率结构保证"（$0.30+2.9% 摊在 $0.005 上 = 6000%，物理不可行）。**这条排除的是按交易金额抽成的对手（卡组织 / Stripe），不排除云厂商**——云厂商按请求/算力计费，与支付金额解耦。**护城河挡住的是"抽成型"对手，挡不住"把支付当平台功能送"的对手，而后者是最有钱、最有渠道的那一类。**

**战略结论**：不要对抗，也不要退回"我们也能做控制面"。唯一守得住的是**它结构上不会去做的那层**——不参与交易、不属于任何云、可断网独立验证的中立证据层。

| | 记账 / 传输 | 独立证据 |
|---|---|---|
| 网络 | TLS | **Certificate Transparency**（不参与加密，只提供可公开验证的记录） |
| 财务 | 记账人 | **审计师**（不能是同一方） |
| Agent 支付 | AgentCore payments / 卡组织轨道 | **Ledgeroot** |

---

## 三、TrustBench —— 同层撞车，但架构弱

### 3.1 侧写

| 项 | 内容 |
|---|---|
| 主体 | Johan Lithvall，**个人运营，无公司实体**；**零融资，~$50/mo 基建上限，~10–15 hrs/week** |
| 形态 | 托管 **注册表 + 非托管路由器 + 签名收据层**，在请求路径里 |
| 栈 | TypeScript + Hono + Supabase(Postgres/RLS) + Redis + Railway；facilitator 用 Coinbase CDP |
| 规模 | 1,592 个已登记 x402 端点；**近 30 天签发收据 0**；GitHub 0 star；`@trustbench/verify-receipt` 4 次/周 |
| 收据 | Ed25519 detached 签名（JCS RFC 8785）；`/.well-known/trustbench-pubkey`；ULID `rcpt_` / `rrcpt_` |
| 独立验证器 | `@trustbench/verify-receipt`，退出码 0/1/2/3/4/**5=无法验证**；v0.1.2 加 `valid \| invalid \| unavailable` |
| 明确不做 | **不上链锚定**（"Phase 5 consideration if real demand surfaces"）；单商户路由；单链 Base |

> ⚠️ **"TrustBench"是四家同名产品**：本文分析的是 `trustbench.io`（最弱的一家）。另有 `trustbench.net`（AI 输出质量评估，$249/mo）、`trustmodel.ai/trustbench`（企业评估引擎）、**arXiv 2603.09157**（ASU+UCLA 的执行前信任验证框架，见 [standards.md](./standards.md)）。对外沟通必须带域名限定。

### 3.2 逐维度对比

| 维度 | TrustBench | Ledgeroot |
|---|---|---|
| 形态 / 信任模型 | 托管 SaaS 路由器，**在请求路径里**；证明**真实性** | 本地引擎；哈希链 + Merkle 根证明**完整性** |
| 收据签名 | ✅ Ed25519 detached | ✅ Ed25519 JWS（`alg`/`kid` 落在被签字节内） |
| 完整性（防漏发） | ❌ 无（可静默不发收据） | ✅ **哈希链 + epoch Merkle 根** |
| 上链锚定 | ❌ **明确没有** | ✅ 已上线（Monad 测试网；主网待办） |
| 离线验证 | ⚠️ 首次需联网抓公钥；链检查需 RPC | ✅ **完全离线，零网络** |
| 链上结算内容校验 | ✅ 有 | ✅ 有（节点不可达报 `incomplete` 而非 `tampered`，更严谨） |
| 授权层 | ❌ 无（限额由**厂商按 API key 签发**） | ✅ **EIP-712 mandate**，用户签名、可离线验签 |
| 执行前策略 | 单笔 + 日滚动上限 | ✅ 五条策略 |
| 拒绝留痕 | ❌ 只有成功结算才出收据 | ✅ **拒绝也出收据** |
| 交付凭证 | ✅ `request_hash` / `response_hash` / 尺寸 / 延迟 | ✅ `payloadHash` + `payloadSize`；**只存哈希不存原文**，更保守 |
| 数据外泄 | ❌ 路由即全见；`/receipts/:id` **公开无鉴权** | ✅ 零外泄 |
| 发现面 / 独立验证器 | ✅ `/skill.md`、`/llms.txt`、`/.well-known`、7+ 渠道；✅ 独立 npm 包 | ❌ 无 |
| 网络 | Base **主网**（+ Solana 登记） | Monad **测试网**，单链单 facilitator |

### 3.3 它自己交出的底牌

> **"签名收据 = 护城河"这个论点已死**："The implicit moat thesis ('we sign receipts, that's our defense') was **killed by direct evidence**. Multiple competitors already ship Ed25519-signed receipts... **commoditizing on a timescale of months.**"
> —— 其内部战略文档 `JarvisBrain-feed-2026-05-14.md`

> **它自己让出了我们的那条道**："The open lane is **lightweight, non-custodial, MCP-native payment plumbing that plugs into trust layers, governance proxies, and frameworks rather than competing with them.**"
> —— `TrustBench-strategy.md`

> **它自我定性**："TrustBench in its current form is a **registry with telemetry, not a benchmark** or routing oracle."

**关键信号**：它点名的、已在做签名收据的对手已达七家（PEAC、agentstamp、Vaultra、anchor-x402-mcp、Coinbase facilitator、AWS AgentCore…）。**不要把赌注押在"我们签收据"上**——这条路的终点是 PEAC 成为标准。

### 3.4 Ledgeroot 领先 / 弱点与动作

**领先**：上链锚定（它明确没有）、完整性防漏发（哈希链 vs 逐张签名）、纯离线零依赖、授权模型是用户的而非厂商的、拒绝也上账、零外泄。

**它领先**：**发现面与生态可见度**、**独立验证器包**。这两项我们仍缺，且**独立验证器是"卖报告"的前置条件**——战略权重高于其余所有未修项。

**动作**：发布独立验证器包 + 收据规范；上 `skill.md` / `llms.txt` / `/.well-known` 并提交 MCP 目录；facilitator 多路化 + 上主网。**不要赌"我们签收据"。**

---

## 四、Semantica —— 相邻参照，非竞品

### 4.1 侧写

| 项 | 内容 |
|---|---|
| 定位 | "Graph-Native Infrastructure for Context and Accountable AI Systems"；自述"替代昂贵的企业平台" |
| 记录对象 | **agent 知道什么、决定了什么**（context / decision）——**不是支付** |
| 许可 | MIT 内核 + 企业版（on-prem / SLA / 专业服务，无公开定价） |
| 规模 | 13.2k star · 1.5k fork · 2,964 commits；PyPI 0.6.8（首版 2025-11-21）；单人主导 |
| 信任工程 | SLSA build provenance + Sigstore + OpenSSF Scorecard + Dependabot/Trivy/osv-scanner/checkov |
| 两处概念交集 | **Decision Intelligence**（决策是图节点，`trace_decision_chain` / `find_similar_decisions` / `analyze_decision_impact`）与 **Provenance**（W3C PROV-O） |

**它与我们架构最像、对象完全不同**：同为"确定性基础设施、不做 LLM 推理闸门、自托管、零厂商锁定"，但一个记"agent 知道什么"，一个记"agent 花了谁的钱"。

### 4.2 最要紧的差异：溯源 ≠ 不可篡改

它的 PROV-O 回答"这条事实从哪来"；我们的签名 + 哈希链 + Merkle 锚定回答"这条记录有没有被改过、是谁做的陈述"。**PROV-O 是数据模型，不是信任机制**——它能被完整伪造，且无法自证。

> 📌 但藏着一条可借的：**PROV-O 是审计师与合规工具已经认得的格式**，采用它比自造 profile 省力得多。

### 4.3 值得偷的（按性价比）

| # | 动作 | 去向 |
|---|---|---|
| 1 | **把"解释"做成查询原语**（先例检索 / 意图链 / 影响面）——让 agent **自己**受益，而不只是让财务受益 | roadmap P1-6 |
| 2 | **Install matrix**（`os × node` + 从 `npm pack` 产物冒烟测试） | roadmap P2-5 |
| 3 | **`ledgeroot doctor`**（逐项结论，含 `kid` 与库内收据匹配检查） | roadmap P2-5 |
| 4 | **`npm publish --provenance`** + Dependabot + 依赖审计 | roadmap P2-5 |
| 5 | **PROV-O / RDF 导出**（标注为交付格式、非信任根） | roadmap P3-4 |
| 6 | **README 三列表**（`裸 x402` / `AWS` / `Ledgeroot`） | README |

> ⚠️ **这是唯一会改变产品形态的一条**（第 1 条）：它把收据从"给审计看的死档案"变成"给 agent 用的活记忆"。

### 4.4 不该学的

- ❌ 不做知识图谱 / 本体 / 向量库 / 抽取管线（另一个问题域，且它的广度也是它的脆弱面——一个 release 修 35 个正确性 bug）。**我们该窄而深。**
- ❌ 不抄 12 语言 README / Trendshift 徽章 / star-history（无 traction 阶段是装饰）。
- ❌ 不用 star 数当竞争力依据（13.2k star 是分发证据，非收入证据）。
- ❌ 不把 PROV-O 当信任机制。

### 4.5 它替我们验证的三个判断

1. **"确定性 + 不依赖 LLM"是可卖的技术立场**——三个走这条路的项目之一（Vaara、我们、它）。
2. **"自托管 / 零厂商锁定"对受监管企业是刚需**——**不再独占，但确实是刚需**。
3. **"审计是入口级需求"在高风险域成立，在小额域不成立**——它的买方是合规/风控，域是信贷/医疗/法务/国防，每个都有监管在场。**这反过来加强了"合规在小额场景暂不在场"的判断：不是合规不重要，是那个粒度上没人在场。**

---

## 附录：来源

**Vaara**：[官网](https://vaara.io/) · [Resin 验证器](https://vaara.io/verify.html) · [一致性结果页](https://vaara.io/conformance.html) · [GitHub](https://github.com/vaaraio/vaara) · [README](https://raw.githubusercontent.com/vaaraio/vaara/main/README.md) · [LICENSING.md](https://raw.githubusercontent.com/vaaraio/vaara/main/LICENSING.md) · [SPEC.md](https://github.com/vaaraio/vaara/blob/main/SPEC.md) · [IETF draft-sirkkavaara-vaara-receipt-10](https://datatracker.ietf.org/doc/html/draft-sirkkavaara-vaara-receipt-10) · [PyPI](https://pypi.org/project/vaara/) · [npm @vaara/client](https://www.npmjs.com/package/@vaara/client)

**AWS**：[GA 博客](https://aws.amazon.com/blogs/machine-learning/amazon-bedrock-agentcore-payments-is-now-generally-available-enabling-agents-to-transact-safely-and-autonomously-at-scale/) · [How AgentCore payments works](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/payments-how-it-works.html) · [What's New](https://aws.amazon.com/about-aws/whats-new/2026/08/bedrock-agentcore-payments-ga/)

**TrustBench**：[官网](https://trustbench.io/) · [Methodology](https://trustbench.io/methodology) · [lithvall/TrustBench](https://github.com/lithvall/TrustBench) · [receipt-spec-v1.md](https://github.com/lithvall/TrustBench/blob/main/receipt-spec-v1.md) · [TrustBench-strategy.md](https://github.com/lithvall/TrustBench/blob/main/TrustBench-strategy.md) · [JarvisBrain-feed-2026-05-14.md](https://github.com/lithvall/TrustBench/blob/main/JarvisBrain-feed-2026-05-14.md) · [@trustbench/verify-receipt](https://www.npmjs.com/package/@trustbench/verify-receipt)

**Semantica**：[semantica-agi/semantica](https://github.com/semantica-agi/semantica) · [PyPI JSON](https://pypi.org/pypi/semantica/json)

**牵引数据（2026-09-17 直查）**：PyPI Stats API（`vaara`）· npm Downloads API（`@vaara/client`、`@aporthq/aport-agent-guardrails`、`blackwall-mcp`）· GitHub API

**置信度提示**：Vaara 的"独立重铸逐字节重现"、打分指标、Resin 断网可验证性均为**其自述，未独立复现**；AWS"不按交易金额抽成"为**中**（未查定价页，由产品形态推断）；TrustBench 的牵引与自述为一手；Semantica 的 star/版本为一手，**下载量、收入、团队规模未核实**。
