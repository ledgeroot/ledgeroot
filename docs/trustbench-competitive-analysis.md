# TrustBench 竞品深度分析

> 调研日期：2026-09-17
> **最近修订：2026-09-17（复核）—— ⚠️ 本文档第 1 节与第 4 节已部分过期，阅读前必读下方"修正说明"。**
> 调研对象：TrustBench（https://trustbench.io · https://github.com/lithvall/TrustBench）
> 对比标的：Ledgeroot（本仓库）+ MandateKey
> 调研方法：官网 / npm / GitHub API / 仓库内文档（含其内部战略文档）通读，对照 Ledgeroot 源码逐条核对

---

## ⚠️ 修正说明（2026-09-17 复核）

本文档写于 2026-09-17，其中**第 4 节"Ledgeroot 落后之处"列的 8 条问题，有 6 条已在当前源码中修复**。原表低估了 Ledgeroot，据此做决策会误判。

| 原节 | 原结论 | 当前源码实况 |
|---|---|---|
| §4.1 收据没有签名 | ❌ 完全无签名 | ✅ **已修**（`verifyAttribution()` + `RECEIPT_ALG`，算法与 kid 落在被签字节内）；**但同节的 `LedgerootAnchor` 无权限控制仍未修** |
| §4.2 不做链上结算内容校验 | ❌ 只信任 facilitator 的 txHash | ✅ **已修**（`src/verify/onchain.ts` 拉 tx、解 ERC-3009、比对 from/to/value） |
| §4.3 第 6 段是假的 | ❌ 把 txHash 抄进交付凭证 | ✅ **已修**（`pay.ts` 对 `responseBody` 做 `contentHash` + `payloadSize`） |
| §4.4 `incomplete` 是死代码 | ⚠️ 永远返回不到 `incomplete` | ✅ **已修**（`IssueKind = "tampered" \| "incomplete"`，`tampered` 优先） |
| §4.5 锚定后误报篡改 | ⚠️ 全量算根导致误报 | ✅ **已修**（`verifyAnchor` 按 `receiptCount` 切片） |
| §4.6 无发现面 | ❌ 零 | ❌ **仍未修** |
| §4.7 独立验证器缺失 | ⚠️ 与主库耦合 | ❌ **仍未修** |
| §4.8 单链单 facilitator | ⚠️ 硬编码 | ❌ **仍未修** |

**结论变化**：本文档 §二 的逐维度对比表与 §四 的"落后之处"清单**不再准确**，请以 [threat-landscape.md](./threat-landscape.md) §C1 的"状态修正"表为准（该表同时纳入了 Traceipt 的 `traceipt-verify` 一手自述）。

**另外两处需要知道的新情况**：

1. **"TrustBench"是四家同名产品**，本文档只分析了其中一家（`trustbench.io`），而且是四家里最弱的一家。另有 `trustbench.net`（AI 输出质量评估 SaaS，$249/mo）、`trustmodel.ai/trustbench`（企业评估引擎）与 **arXiv 2603.09157**（ASU + UCLA 的"执行前实时信任验证"框架）。详见 threat-landscape.md §C3。
2. **Traceipt（BlueTier）的密码学实现已被 Ledgeroot 追平**，仍在 PQ 签名、跨语言规范化、独立验证器上领先。详见 threat-landscape.md §C1。

---

## 结论摘要

**TrustBench 不是正面对手，是互补的另一半——但在"收据"这一层已经正面撞车。**

- 它是托管的**注册表 + 路由器 + 签名收据层**；Ledgeroot 是本地**策略引擎 + 证据引擎**。
- 它的三层架构是 smart router / policy firewall / receipt+accounting。**Ledgeroot 已拥有后两层，缺第一层（发现与路由）。**
- 它赢在**发现面**和**生态可见度**，以及**独立可引用的验证器包**（`@trustbench/verify-receipt`）。
- Ledgeroot 赢在**上链锚定**、**完整性证明（防漏发）**、**纯离线验证**、**用户签名授权**、**执行前策略拦截**和**零数据外泄**。
- ✅ **2026-09-17 复核更新**：原本文档把"真实性证明（Ed25519 签名）"与"内容级证明（request/response hash）"算作它赢的两项——**这两项现已打平**（Ledgeroot 已有收据签名与第 6 段交付证明），且 Ledgeroot 的交付证明**只存哈希、不存原文**，比它更保守。**它仍赢的是发现面与独立验证器包。**
- 它自己判定"签名收据 = 护城河"这个论点**已经死了**——这对 Ledgeroot 是关键信号：不要把赌注押在"我们签收据"上。
- ⚠️ **它仍明确不做上链锚定**（复核时官网仍写 "Phase 5 consideration if real demand surfaces"），且**近 30 天签发收据仍为 0**。这场对比目前比的是**架构与生态卡位**，不是用户量。

---

## 一、TrustBench 侧写

### 1.1 时间线（约 5 个月，速度很快）

| 时间 | 事件 |
|---|---|
| 2026-04-22 | GitHub 仓库创建（`created_at: 2026-04-22T11:45:29Z`） |
| 2026-04-24 | 首批实质提交（capability-specific 探针） |
| 2026-04-29 ~ 04-30 | Phase 2 用户验证（r/AI_Agents + X，与 @InfopunksHQ 完整对话） |
| 2026-05-04 | Phase 3 收口：非托管路由器 + 幂等 + 限额 + 签名收据 |
| 2026-05-06 | **第一笔真实付费收据在 Base 上链结算**（`rcpt_01KQY7C44GAPSXZPFQYRZ1D10C`） |
| 2026-05-11 | paywall v0.1.0 上线；收入钱包启用 |
| 2026-05-14 | 战略重整（两支柱框架 + 强制开发前过滤器） |
| 2026-09-16 | **仍在持续提交**（夜间 bot 报表） |

一个月跑完一个 phase，节奏参照：Phase 0（定位）→ 1（签名）→ 2（验证）→ 3（路由器）→ 4（paywall + 发现面）→ 5（未启动）。

### 1.2 团队与资金：**零融资，单人，$50/月**

- **创始人：Johan Lithvall**（GitHub `lithvall`，lithvall88@gmail.com）
- 服务条款载明 **"operated by Johan Lithvall"** —— **个人运营，无公司实体**
- 其内部 CLAUDE.md 自述资源约束：
  - **Capital: self-funded, ~$50/mo infra cap**
  - **Energy: ~10-15 hrs/week after Phase 4 sprint**
  - 明确回避：React Native、Kubernetes、售前工程、多租户 auth/billing、前端框架折腾
- 全网无任何融资 / 加速器 / 投资人记录

**这个约束是决定性的**，它解释了几个"为什么"：

- 为什么上链锚定被推到 Phase 5 且措辞是"if real demand surfaces"——没钱没时间
- 为什么 Solana 路由迟迟未做（其自己承认是 "multi-day work"，而非计划里的一行）
- 为什么极端依赖自动化：夜间爬虫 + GitHub Actions 自动发 X + 每晚报表

### 1.3 规模与牵引（基本为零，但有生态"表面"）

| 指标 | 数值 |
|---|---|
| 注册 x402 端点 | 1,592 |
| **近 30 天签发收据** | **0** |
| 探针延迟中位数 | 152 ms |
| GitHub star / fork / watcher | **0 / 0 / 0** |
| `@trustbench/verify-receipt` 周下载 | **4** |
| npm 版本 | verify-receipt v0.1.2（约 4 个月前发布） |

已上架渠道：mcpservers.org、Smithery、claudemarketplaces、Metatext、OAIS、402radar、Agenstry。

> 注：双方牵引都接近零。这场对比比的是**架构与生态卡位**，不是用户量。

### 1.4 技术栈与架构

- **栈**：TypeScript + Hono（API）+ Supabase（Postgres + RLS）+ ioredis（Upstash）+ tsx，部署在 Railway
- **自动化**：夜间 03:00 UTC 爬虫（Bazaar + agentic.market + Heurist Mesh）+ 探针评分流水线 + 自动发 X
- **facilitator**：Coinbase CDP facilitator（`api.cdp.coinbase.com/platform/v2/x402`）
- **网络**：Base 已可路由；Solana 仅登记未路由
- **能力分类**：search / inference / data / media / infra（对齐 Coinbase Agentic Market 五分类）

### 1.5 收据设计（其核心产品）

- **签名**：Ed25519，对 JCS（RFC 8785）规范化后的 `receipt` 对象签名；**detached signature**（`signature` 块不在被签字节内，因此 `public_key_url` 可在验证时覆盖）
- **公钥**：`/.well-known/trustbench-pubkey`（PEM）
- **ID**：ULID，前缀 `rcpt_`（结算）/ `rrcpt_`（paywall 路由）
- **收据内容**：`call`（capability、provider、**request_hash / response_hash**、尺寸、延迟）/ `settlement`（chain、tx_hash、block_number、payer、payee、amount_atomic）/ `pricing`（拆出 provider 价 + TrustBench 费）/ `routing`（决策时分数、备选数量、选择理由）/ `audit`（audit_url）
- **可选链上校验**（`--check-chain`）：按 `tx_hash` 拉交易 → 断言 `tx.to == USDC 合约` → 解码 `transferWithAuthorization(from,to,value,...)` → 比对 from/to/value → 确认已成功出块
- **独立验证器**：`@trustbench/verify-receipt`，退出码 0=有效 / 1=参数错 / 2=签名无效 / 3=链上不符 / 4=链检查错误 / 5=**无法验证**（连不上，非篡改）
- **v0.1.2 改进**：新增 `verificationStatus: valid | invalid | unavailable`，把"验不了"和"被篡改"分开

### 1.6 策略原语与定价

**四个建商（builder）主动要求的原语**（其 Phase 2 验证结论）：幂等键、硬限额、签名收据、可查询审计。

- **幂等**：`Idempotency-Key`（16–128 字符）；同键同体=重放缓存，同键异体=409
- **硬限额**：单笔上限 + 日滚动上限，**服务端强制**，原子 USDC 计价
- **审计**：`GET /receipts/:id`，公开、无鉴权、不可变、`Cache-Control: immutable`
- **定价**：`POST /route` $0.005/次（已上线）；路线图 `/score-provider` $0.005、`/receipts/:id?replay=true` $0.01、`/compliance-export` $0.50 单份 / $2.00 百份内

### 1.7 它明确"不做"的事（自述局限）

> 原文摘录，这些是它自己写下的边界：

- **收据未上链锚定**："Receipts are Ed25519-signed... They are **not Merkle-batched into a public blockchain**. On-chain anchoring is a **Phase 5 consideration if real demand surfaces**."
- **单商户路由**：不支持一意图多商户扇出
- **单链结算**：Base + USDC
- **测量局限**："Score reflects reachability and response time, **not capability quality**"、"**Payment behavior is not yet measured**"、"Latency is **single-origin**"
- **自我评价**（战略文档）："TrustBench in its current form is a **registry with telemetry, not a benchmark** or routing oracle."

---

## 二、逐维度对比

| 维度 | TrustBench | Ledgeroot |
|---|---|---|
| 形态 | 托管 SaaS 路由器，**在请求路径里** | 本地引擎 / MCP 插件，**无服务器** |
| 信任模型 | 签名（**真实性**：谁说的） | 哈希链 + Merkle 根（**完整性**：没被改/没被漏） |
| 收据签名 | ✅ Ed25519，detached | ✅ **Ed25519 JWS**（2026-09-17 复核已修；原表"无签名"已失效） |
| 完整性证明（防漏发） | ❌ 无（可静默不发收据） | ✅ **哈希链 + epoch Merkle 根** |
| 上链锚定 | ❌ **明确没有**（推到 Phase 5；2026-09-17 复核官网仍无变化） | ✅ **已上线**，但仅在 Monad **测试网**（⚠️ 对手已在主网） |
| 离线验证 | ⚠️ 首次需联网抓公钥；链检查需 Base RPC | ✅ **完全离线，零网络** |
| 链上结算内容校验 | ✅ **有**（拉 tx、解码 calldata、比对 from/to/value） | ✅ **已有**（`src/verify/onchain.ts`，2026-09-17 复核已修；且节点不可达报 `incomplete` 而非 `tampered`） |
| 授权层 | ❌ 无（限额是**厂商按 API key 发的**，用户无法验证） | ✅ **EIP-712 mandate**，用户签名，可离线验签 |
| 执行前策略 | 单笔上限 + 日滚动上限（服务端） | ✅ **五条策略**：白名单 / payTo 绑定 / 报价漂移 / 端点限速 / 限额 |
| 拒绝留痕 | ❌ 只有成功结算才出收据 | ✅ **拒绝也出收据** |
| 交付凭证 | ✅ **真实**：`request_hash` / `response_hash` / 尺寸 / 延迟 | ✅ **已修**：`payloadHash` + `payloadSize`（2026-09-17 复核）；且**只存哈希不存原文**，比 TrustBench 更保守 |
| 数据外泄 | ❌ 路由即全见；`/receipts/:id` 公开无鉴权 | ✅ **零外泄**，数据不出本机 |
| 熔断 | 有 kill switch（Phase 4 订阅功能） | ✅ 一键撤销全部 mandate |
| 发现面 | ✅ `/skill.md`、`/llms.txt`、`/.well-known`、MCP 目录、7+ 渠道上架 | ❌ **仍无** |
| 独立验证器 | ✅ `@trustbench/verify-receipt`（独立 npm 包） | ❌ **仍缺**（与主库 / SQLite schema 耦合） |
| 合格时间戳 | ❌ 无 | ❌ 无 —— 对手 **Vaultra**（RFC 3161 / eIDAS QTSP）与 **NovaFabric** 已有 ← 新增行 |
| 人类可读交付物 | ❌ 无 | ❌ 无 —— 对手 **Traceipt**（VAT PDF）与 **Vaultra**（auditor-ready PDF）已有 ← 新增行 |
| 网络与 facilitator | Base **主网**（+ Solana 登记），CDP facilitator | Monad **测试网**、单链、单 facilitator（硬编码） |
| 商业模式 | 每次路由 $0.005 + 路线图订阅/导出 | MIT、免费、本地 |

---

## 三、Ledgeroot 领先之处

### 3.1 上链锚定——它明确没有

这是最清晰的分界线。它的 README 原文把上链锚定定义为"Phase 5 consideration **if real demand surfaces**"——不是"即将做"，是"看情况"。而 Ledgeroot 已有 `LedgerootAnchor.sol` 并跑通 Monad testnet。

### 3.2 完整性证明（防漏发）——被低估的强项

TrustBench 逐张签名，但**它可以干脆不给某笔支付发收据，而你永远发现不了**。Ledgeroot 的哈希链（每张收据回指上一张 `receiptHash`）+ epoch Merkle 根能证明"这个 epoch 里没有收据被删除或篡改"。

> 在审计语境下，"我能证明没漏"比"我每张都签了名"更硬。这是 Ledgeroot 最应该主打、但目前在 README 里只占一行的能力。

### 3.3 纯离线、零依赖

- TrustBench 验证器：`public_key_url` 指向 trustbench.io，**首次验证必须联网**；`--check-chain` 还需 Base RPC
- Ledgeroot：`ledgeroot verify` 只读本地 SQLite + 比对链上根，**零网络**

### 3.4 授权模型是用户的，不是厂商的

根本性区别：

- TrustBench 的限额是 **"configured at issuance"**、由服务端持有——**用户既无法验证，也无法证明那是自己授权的**
- Ledgeroot 的 mandate 是 **用户 EIP-712 签名的凭证**，可离线验签，含到期时间、单笔上限、累计上限、限速、对手方白名单、payTo 绑定

它的战略文档甚至承认 policy firewall（白名单/价格上限/熔断/HiTL）是 **Phase 4 的 $20–100/月订阅**功能，并断言 **"Nobody offers this for x402 today — every team rolls its own."** —— 而 Ledgeroot 已经免费、本地、签名地做完了。

### 3.5 拒绝也上账

只有 Ledgeroot 能产出"尝试 N 笔 / 执行 M 笔 / 拦截 K 笔"的视图（MandateKey 的授权-执行一致性时间线）。TrustBench 只对成功结算出收据，看不到企图。

### 3.6 零数据外泄

TrustBench 是路由器，能看到你请求的每个 capability 和 payer 地址；且 `GET /receipts/:id` **公开、无鉴权、可缓存**——agent 的钱包地址与消费记录对任何拿到 ULID 的人可见。对合规/审计产品，这是隐私负债；对 Ledgeroot 是叙事优势。

---

## 四、Ledgeroot 与 TrustBench 的能力对照（2026-09-17 复核后）

> ⚠️ **本节原为"Ledgeroot 落后之处（附源码证据与修法）"，列出 8 条缺陷。复核后 6 条已修，本节据此重写。**已修项的原始证据保留在下方 `<details>` 中以便追溯。

### 4.0 状态总表

| # | 项 | 原状态 | 现状 | 对手是否有 |
|---|---|---|---|---|
| 4.1a | 收据签名 | ❌ 无签名 | ✅ **已修** | TrustBench ✅ / BlueTier ✅ |
| 4.1b | `LedgerootAnchor` 权限控制 | ❌ permissionless | ❌ **仍未修** | Traceipt 同类问题（不校验 `from`）——**平手，谁先修谁得分** |
| 4.2 | 链上结算内容校验 | ❌ 只信任 facilitator | ✅ **已修** | TrustBench ✅（`--check-chain`） |
| 4.3 | 六段收据第 6 段 | ❌ 占位符 | ✅ **已修** | TrustBench ✅ |
| 4.4 | `incomplete` 三态 | ⚠️ 死代码 | ✅ **已修** | TrustBench ✅（`valid\|invalid\|unavailable`） |
| 4.5 | 锚定后误报篡改 | ⚠️ 全量算根 | ✅ **已修** | TrustBench ❌（它根本不做锚定） |
| 4.6 | agent-native 发现面 | ❌ 零 | ❌ **仍未修** | TrustBench ✅ / EVIDIQ ✅ |
| 4.7 | 独立验证器包 | ⚠️ 与主库耦合 | ❌ **仍未修** | TrustBench ✅ / Traceipt ✅ |
| 4.8 | 单链单 facilitator | ⚠️ 硬编码 | ❌ **仍未修** | TrustBench ✅（Base + 登记 Solana） |
| 4.9 | **RFC 3161 合格时间戳** | — | ❌ **无**（新增项） | Vaultra ✅（Sectigo eIDAS）/ NovaFabric ✅ |
| 4.10 | **人类可读交付物** | — | ❌ **无**（新增项） | Traceipt ✅（VAT PDF）/ Vaultra ✅（auditor-ready PDF） |
| 4.11 | **主网** | — | ❌ 仍在 Monad 测试网（新增项） | Traceipt ✅ Base / EVIDIQ ✅ 0G+X Layer |

<details>
<summary>已修项的原始源码证据（保留以便追溯）</summary>

**4.1a 收据没有签名——最大的洞**（已修）

原文：`src/receipt/builder.ts` 只做 `canonicalHash`，`src/types.ts` 的 `Receipt` 没有签名字段。后果是能证"内容没被改"，不能证"是谁做的陈述"。
**现状**：`src/verify/verifier.ts` 的 `verifyAttribution()` 已实现完整归属校验——无签名 → `incomplete`；找不到 kid 对应公钥 → `incomplete`；`alg` 不受支持或签名验证失败 → `tampered`。签名覆盖含 `protected` 的规范字节，`alg` / `kid` 不可替换。

**4.2 不做链上结算内容校验**（已修）

原文：`verifyAnchor` 只重算 Merkle 根；`segments.tx.txHash` 直接信任 facilitator 返回，于是"一个出错或被攻破的 facilitator 返回伪造 txHash，验证照样报 `verified`"。
**现状**：新增 `src/verify/onchain.ts`（`verify --check-chain`），拉取 tx、断言 `to` 为 USDC 合约、解码 ERC-3009 `transferWithAuthorization`、比对 from/to/value/payer。且**节点不可达时报 `incomplete` 而非 `tampered`**——这个细节比 TrustBench 更严谨。

**4.3 六段收据第 6 段是假的**（已修）

原文：
```ts
segments.tx = { txHash: payment.txHash, chainId: payment.chainId };
segments.delivery = { payloadHash: payment.txHash };   // ← 把 txHash 抄进了交付凭证
```
**现状**：`src/tools/pay.ts` 在调用方提供 `responseBody` 时，写入 `payloadHash: contentHash(input.responseBody)` 与 `payloadSize: Buffer.byteLength(...)`，且**只存哈希与字节数，不存原文**——这一点比 TrustBench 的 `request_hash` / `response_hash` 更保守（TrustBench 的服务端看得到请求与响应本身）。

**4.4 `incomplete` 是死代码**（已修）

原文：
```ts
export function classify(errors: string[]): VerificationStatus {
  return errors.length === 0 ? "verified" : "tampered";
}
```
**现状**：
```ts
export type IssueKind = "tampered" | "incomplete";
export function classify(issues: Issue[]): VerificationStatus {
  if (issues.some((issue) => issue.kind === "tampered")) return "tampered";
  return issues.length > 0 ? "incomplete" : "verified";
}
```
"明确不匹配"优先于"证据缺失"，两个方向都不会误判。与 TrustBench v0.1.2 的 `valid | invalid | unavailable` 设计等价。

**4.5 锚定后再有新支付，`verify` 会误报篡改**（已修）

原文：`verify` 与 `anchor` 都用**全量**收据算根，于是 epoch 1 锚定 N 张后再支付一笔，重算根 ≠ 锚定根 → 报 `tampered`。
**现状**：锚定记录 `receiptCount` 作为 epoch 边界，`verifyAnchor(receipts, root, receiptCount)` 按边界 slice 后再重算根；追加的收据属于下一个 epoch，不再误报。旧锚点（无 `receiptCount`）返回 `incomplete` 而非 `tampered`。

</details>

### 仍未修的四项 + 新增的三项

#### 4.1b `LedgerootAnchor` 没有权限控制 —— 唯一未修的 P0

`contracts/src/LedgerootAnchor.sol` 的 `anchor(bytes32 root)` 仍是 permissionless：任何人都能锚任意根。所以"上链了"目前只证明"有人在这个时间锚了这个根"，不证明"是谁锚的"。

> ⚠️ **x402 Receipt Attestation 草案的攻击 A4 已明确把 permissionless 锚定标为可伪造**，并在生产建议里用的是 permissioned 合约。Traceipt 的方案有同类问题（只比对 calldata 内容，不校验交易的 `from`）——**两边都缺，谁先修谁得分。**

**修法**：加 `owner` 或 issuer 映射，仅允许登记的签名者写根；或保留 permissionless 但在 `Anchored` 事件里带上 `msg.sender` 并在验证时比对。

#### 4.6 没有 agent-native 发现面

TrustBench 一条龙：`/skill.md`、`/llms.txt`、`/.well-known/trustbench.json`、`/mcp/tools`、`/openapi.json`，并已上架 7+ 渠道。**EVIDIQ** 同样齐全（MCP endpoint + `/skill.md` + `/x402` 定价发现端点，已上架 OKX.AI）。Ledgeroot 零。

**成本极低、收益直接**——Ledgeroot 本身就是 MCP server。

#### 4.7 独立验证器包缺失

TrustBench 有 `@trustbench/verify-receipt`，**Traceipt 有 `traceipt-verify`**（零依赖、退出码 0/1/2、`--offline` 开关、同时可作为库引用）。Ledgeroot 的验证器与本地库/SQLite schema 耦合，第三方拿到一张收据不易独立验证。

> **这一项的战略权重高于其他所有未修项**——它是 [commercialization.md](./commercialization.md) §四"卖报告"的前置条件：审计师必须能**不安装任何 Ledgeroot 组件**就完成验证。缺了它，支柱 2 只是内部能力，不是可交付物。

#### 4.8 单链单 facilitator

硬编码 `MONAD_FACILITATOR_URL` + `MONAD_TESTNET_X402`，无 fallback，且仍在**测试网**。TrustBench 已跑通 Base、登记 Solana；Traceipt 与 Black_Wall 都在 **Base 主网**；EVIDIQ 在 0G + X Layer 主网。

**注**：`FacilitatorNetworkConfig` 已经把 network/scheme 抽出来了，再往前一步即可多路化。

#### 4.9–4.11 新增的三项差距

| 项 | 谁有 | 为什么重要 |
|---|---|---|
| **RFC 3161 合格时间戳** | Vaultra（Sectigo eIDAS QTSP，eIDAS Art. 41）、NovaFabric | Merkle 锚定证明"这个根在此区块之前存在"，**不等于法定时间戳**。EU 监管语境下 eIDAS QTSP 的戳有独立法律地位。这是 Ledgeroot 在 EU 合规场景的真实落差 |
| **人类可读交付物** | Traceipt（VAT 合规 PDF + 扫码验证）、Vaultra（auditor-ready PDF + 公开验证 URL） | 机器可验 ≠ 会计可归档。这是进财务/审计流程的门票，也是 commercialization.md §三"合规交付物"那一层最先被问到的东西 |
| **主网** | 全部主要对手 | 测试网上的锚定不能作为任何真实审计的凭据 |

---

## 五、它自己交出的底牌（关键情报）

其内部战略文档（`JarvisBrain-feed-2026-05-14.md`）暴露了大量对方视角的情报，价值极高。

### 5.1 它自己判定"签名收据 = 护城河"已死

> "The implicit moat thesis ('we sign receipts, that's our defense') was **killed by direct evidence**. Multiple competitors already ship Ed25519-signed receipts... The thesis is **commoditizing on a timescale of months**."

它点名的、已在做签名收据的对手：

| 项目 | 定位 |
|---|---|
| **PEAC Protocol** | Ed25519 JWS 收据格式，Wire 0.1 稳定 / 0.2 预览 |
| anchor-x402-mcp | 签名决策证明（+ OFAC 端点） |
| agentstamp | Ed25519 戳记 + 信任评分 |
| Vaultra | RFC-3161 合规收据 |
| Coinbase facilitator | 轨道层做 KYT/OFAC |
| AWS Bedrock AgentCore | 审计轨迹打包（2026-05 GA） |

### 5.2 监管顺风指向 PEAC，不是它

**EU AI Act 第 12 条（记录保存）2026-08-02 已生效**。PEAC 明确为此定位。它自己的判断是：**2026-08-02 之后，任何为合规而建的项目都会默认 PEAC**。

### 5.3 它的两支柱框架

- **支柱 1**：让 TrustBench 的收据信封成为**他人采纳的标准**
- **支柱 2**：成为凌驾于任何发现层/facilitator 之上的**中立路由 + 收据层**

它自评支柱 2 更强、支柱 1 处于争夺中，且**最高杠杆的在手项目是 MCP connector 进入 Anthropic Connectors Directory**。

### 5.4 它自己承认的开放赛道——正是 Ledgeroot 的位置

> 开放的口子是 **"lightweight, non-custodial, MCP-native payment plumbing that plugs into trust layers, governance proxies, and frameworks rather than competing with them."**

**这就是 Ledgeroot 的形状。** 它自己把这条道让了出来。

### 5.5 它点名的 Pillar 2 竞争者（生态全景）

Dexter/x402gle（代币融资，2500 万+ 结算）、PayAI/pay.sh（Solana + Google Cloud 背景）、x402scan（Merit Systems）、x402atlas、402index.io（15,000+ API）、Coinbase agentic.market、Pylon、agentsvc.io、httpay.xyz（一个周末 186 个端点）、OpenRegistry by Sophymarine。

---

## 六、战略判断

### 6.1 关系定性：互补大于竞争

- TrustBench 是**需要证据层的路由器**
- Ledgeroot 是**需要发现面的证据层**

它的三层（router / policy firewall / receipt+accounting）里，Ledgeroot 已拥有第 2、3 层，缺第 1 层。它的收据是**公开无鉴权**的，这恰恰是 Ledgeroot"零外泄"叙事的靶子。

### 6.2 正面碰撞点：收据

两边都把收据当核心产品。就证据层而言：

- **它赢在**：独立验证器包（`@trustbench/verify-receipt`）、发现面与生态可见度
- **Ledgeroot 赢在**：锚定、完整性（防漏发）、纯离线、执行前策略、授权模型、零外泄
- ✅ **已打平**：真实性证明（签名）与内容级证明（第 6 段交付哈希）——原本文档把这两项算作它赢，2026-09-17 复核后已不成立

### 6.3 决定性判断：不要赌"我们签收据"

TrustBench 用自己的失败教训证明了签名收据是商品化的。加上 EU AI Act 第 12 条的 PEAC 收敛压力，**"我们签名收据"这条路的终点是 PEAC 成为标准**。

Ledgeroot 真正没人抄得动的是这一组：

> **用户签名授权（mandate）+ 执行前拦截（五条策略）+ 哈希链完整性（防漏发）+ 上链时间戳（锚定）+ 链上结算内容校验**

✅ **这五件套现在已全部实现**（2026-09-17 复核），是 TrustBench 与 PEAC 都不具备的组合。**但"实现"不等于"卖得出去"**——要变成商业物，还缺下面 §七 的第 5–9 项（独立验证器、发现面、合格时间戳、人类可读交付物、主网）。

---

## 七、行动建议（按优先级）

> ✅ = 已在当前源码完成；`[ ]` = 未完成。原表第 1–4 项已全部落地。

| # | 动作 | 理由 | 对应问题 | 状态 |
|---|---|---|---|---|
| 1 | 收据/epoch 根签名 | 补上"谁做的陈述"这唯一缺口 | §4.1a | ✅ 已完成 |
| 2 | 链上结算内容校验 | 消除"facilitator 伪造 txHash 仍报 verified" | §4.2 | ✅ 已完成 |
| 3 | 修复六段收据第 6 段 | 品牌核心能力原为占位符 | §4.3 | ✅ 已完成 |
| 4 | 修 `incomplete` 与锚定后误报篡改 | 旗舰"三态验证"原不成立 | §4.4 §4.5 | ✅ 已完成 |
| 5 | ⚠️ **`LedgerootAnchor` 加 owner / issuer 记录** | **唯一未修的 P0**；x402 草案攻击 A4 已把 permissionless 标为可伪造 | §4.1b | ❌ 待办（**优先**） |
| 6 | **发布独立验证器包 + 收据规范** | 对标 `@trustbench/verify-receipt` 与 `traceipt-verify`；**commercialization.md §四"卖报告"的前置条件** | §4.7 | ❌ 待办（**优先**） |
| 7 | 上 `skill.md` / `llms.txt` / `/.well-known` + 提交 MCP 目录 | 零成本被发现；本身就是 MCP server | §4.6 | ❌ 待办 |
| 8 | facilitator 多路化 + 多链 + **上主网** | 消除单点；Traceipt/Black_Wall 已在 Base 主网 | §4.8 §4.11 | ❌ 待办 |
| 9 | **加 RFC 3161 合格时间戳** | Vaultra（eIDAS QTSP）与 NovaFabric 已有；EU 合规场景的独立法律凭据 | §4.9 | ❌ 待办（**新增**） |
| 10 | **加人类可读交付物（VAT / 审计报告 PDF）** | Traceipt 与 Vaultra 都已交付；进会计/审计流程的门票 | §4.10 | ❌ 待办（**新增**） |
| 11 | 主动接 EU AI Act 第 12 条合规叙事 | 已生效（2026-08-02）的监管顺风；**注意不要泛化** | §5.2 | ❌ 待办 |

---

## 附录 A：TrustBench 关键原文摘录

> **关于未锚定**："Receipt content is not yet on-chain anchored. Receipts are Ed25519-signed by TrustBench. They are not Merkle-batched into a public blockchain. On-chain anchoring is a Phase 5 consideration if real demand surfaces."
> —— `README.md`

> **关于测量局限**："Score reflects reachability and response time, not capability quality... Payment behavior is not yet measured. The current probe does NOT execute x402 payments."
> —— `/methodology`

> **关于护城河已死**："The implicit moat thesis ('we sign receipts, that's our defense') was killed by direct evidence. Multiple competitors already ship Ed25519-signed receipts... commoditizing on a timescale of months."
> —— `JarvisBrain-feed-2026-05-14.md`

> **关于开放赛道**："The open lane is lightweight, non-custodial, MCP-native payment plumbing that plugs into trust layers, governance proxies, and frameworks rather than competing with them."
> —— `TrustBench-strategy.md`

> **自我定性**："TrustBench in its current form is a registry with telemetry, not a benchmark or routing oracle."
> —— `TrustBench-strategy.md`

## 附录 B：Ledgeroot 侧代码状态索引（2026-09-17 复核）

| 问题 | 文件 | 原关键代码 | 现状 |
|---|---|---|---|
| 第六段是假的 | `src/tools/pay.ts` | `segments.delivery = { payloadHash: payment.txHash }` | ✅ 已修：`contentHash(input.responseBody)` + `payloadSize` |
| `incomplete` 死代码 | `src/verify/verifier.ts` | `return errors.length === 0 ? "verified" : "tampered"` | ✅ 已修：`IssueKind` 区分 `tampered` / `incomplete`，前者优先 |
| 锚定后误报篡改 | `src/tools/receipts.ts` | `verifyAnchor(receipts /* 全量 */, anchor.root)` | ✅ 已修：按 `receiptCount` 切 epoch |
| 无签名 | `src/receipt/builder.ts` / `src/types.ts` | 仅 `canonicalHash`，`Receipt` 无签名字段 | ✅ 已修：`verifyAttribution()` + `RECEIPT_ALG` |
| 无链上内容校验 | `src/verify/verifier.ts` | `verifyAnchor` 仅重算 Merkle 根 | ✅ 已修：新增 `src/verify/onchain.ts`（ERC-3009 解码比对） |
| Merkle 无域分隔 | `src/anchor/merkle.ts` | 十六进制字符串拼接、奇数层复制末节点 | ✅ 已修：完整 RFC 6962 MTH（`0x00`/`0x01` 前缀、字节运算、2 的幂切分） |
| **锚定合约无权限** | `contracts/src/LedgerootAnchor.sol` | `function anchor(bytes32 root) external { ... }` | ❌ **仍未修** |
| **单 facilitator / 测试网** | `src/x402/facilitator.ts` | `MONAD_FACILITATOR_URL` 硬编码 | ❌ **仍未修** |

---

## 来源

- [TrustBench 官网](https://trustbench.io/) · [Methodology](https://trustbench.io/methodology) · [skill.md](https://trustbench.io/skill.md) · [.well-known/trustbench.json](https://trustbench.io/.well-known/trustbench.json) · [Terms](https://trustbench.io/terms)
- [lithvall/TrustBench README](https://github.com/lithvall/TrustBench/blob/main/README.md)
- [receipt-spec-v1.md](https://github.com/lithvall/TrustBench/blob/main/receipt-spec-v1.md)
- [TrustBench-strategy.md](https://github.com/lithvall/TrustBench/blob/main/TrustBench-strategy.md)
- [JarvisBrain-feed-2026-05-14.md](https://github.com/lithvall/TrustBench/blob/main/JarvisBrain-feed-2026-05-14.md)
- [GitHub API — 仓库元数据](https://api.github.com/repos/lithvall/TrustBench)
- [@trustbench/verify-receipt (npm)](https://www.npmjs.com/package/@trustbench/verify-receipt)
- **同名撞车与新增对照（2026-09-17 复核）**：[trustbench.net](https://www.trustbench.net/) · [trustmodel.ai/trustbench](https://trustmodel.ai/trustbench) · [arXiv 2603.09157](https://arxiv.org/abs/2603.09157) · [traceipt-verify README](https://github.com/bluetieroperations-create/traceipt-verify/blob/main/README.md) · [EVIDIQ Notary](https://evidiq.dev/docs/notary) · [Vaultra](https://vaultra.io/) · [arXiv 2609.12582 (NovaFabric)](https://arxiv.org/abs/2609.12582)
- [awesome-agentic-commerce](https://github.com/MikeyPetrillo/awesome-agentic-commerce)（x402 生态索引，本次调研入口）
