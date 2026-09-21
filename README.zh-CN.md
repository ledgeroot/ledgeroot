<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/ledgeroot-logo-dark.svg">
  <img src="assets/ledgeroot-logo-light.svg" alt="Ledgeroot" width="244">
</picture>

# Ledgeroot

### 面向 agent x402 支付的 MCP 支付插件 + 证据引擎

**Every agent payment, on the record.**

[![CI](https://github.com/ledgeroot/ledgeroot/actions/workflows/ci.yml/badge.svg)](https://github.com/ledgeroot/ledgeroot/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/ledgeroot)](https://www.npmjs.com/package/ledgeroot)
![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![MCP](https://img.shields.io/badge/MCP-server-informational)
![x402](https://img.shields.io/badge/x402-payments-blueviolet)

[English](./README.md) · **中文**

</div>

---

## 看它拦下一笔被提示注入的支付

```text
$ LEDGEROOT_DRY_RUN=true npm run demo

1. 签发授权令 → demo-mandate（issuer 0x19E7…ff2A）
2. 正常支付 → paid，0.1 USDC 付给 agent402.tools/search
3. 同 requestId 重试 → paid，deduplicated: true（不再扣款）
4. 提示注入转账 → denied：payTo "0x…dead" is not bound by the mandate
5. 一键熔断 → 已撤销 1 条授权
6. 熔断后支付 → denied：unknown mandate "demo-mandate"
7. 离线验证 → verified，3 张收据，0 个问题
```

> 摘自一次真实运行；第 4、6 行是收据里 `reason` 字段的**原文**（拒付原因由代码以英文写出）。**被拒付也是一张收据**——第 4、6 步各自带签名留痕，所以账本最后是 3 张收据，且离线验证依然干净。

不用钱包、不用 USDC、不用网络、不用注册账号。完整闭环就是这些：授权 → 约束 → 支付 → 拒付 → 熔断 → 离线验证。

---

## 快速开始

### 1. 离线跑完整闭环（60 秒）

```bash
npm install
npm run build
LEDGEROOT_DRY_RUN=true npm run demo
```

### 2. 接进 Claude Code

```bash
claude mcp add ledgeroot \
  --env LEDGEROOT_PRIVATE_KEY=0x你的私钥 \
  --env LEDGEROOT_SIGNING_KEY=0x收据签名密钥 \
  --env LEDGEROOT_DB=/绝对路径/ledgeroot.sqlite \
  -- npx ledgeroot serve
```

之后全程对话：

1. **签发授权**：说「给它授权 5 USDC 买 agent402.tools 数据」→ Claude 调 `ledgeroot_mandate_sign` → 你确认。
2. **agent 花钱**：说「帮我调研 X，要买付费数据」→ agent 调 `ledgeroot_pay` → 策略校验 → facilitator 结算 → 六段收据。
3. **撤销**：说「撤销它的授权」→ `ledgeroot_mandate_revoke`。
4. **审计**：说「验证证据」→ `ledgeroot_verify`。

> 自然语言解析由宿主完成。Ledgeroot 只提供结构化、确定性的工具；私钥经 `--env` 传入并留在本机。

### CLI

```bash
node dist/cli.js verify [--db <path>] [--check-chain]   # 离线验证（可选加链上校验）
node dist/cli.js export [--db <path>]                   # 导出证据包 JSON
node dist/cli.js anchor [--db <path>]                   # 提交 epoch Merkle 根上链
node dist/cli.js jwks                                   # 第三方验签所需的 JWKS
node dist/cli.js serve                                  # 以 stdio 启动 MCP server
```

### 作为库使用

```ts
import { PolicyEngine, defaultPolicies, merkleProof, verifyMerkleProof } from "ledgeroot";
import { LedgerootStore } from "ledgeroot/store";
import { verifyReceiptChain } from "ledgeroot/verify";
```

子路径导出：`ledgeroot` · `/store` · `/verify` · `/anchor` · `/receipt` · `/types`。库本身**不加载 `.env`**——环境由调用方掌握（只有 CLI 与 server 入口调 `loadEnv()`）。

### 真实支付与上链锚定

```bash
# Monad testnet。需要 LEDGEROOT_PRIVATE_KEY 与测试网 USDC（Circle faucet）。
npm run demo:pay -- <payTo地址> 0.001
npm run verify -- --db ./ledgeroot.sqlite

# 锚定 epoch 根（合约需要 Foundry；forge-std 是 git submodule）
forge install foundry-rs/forge-std && forge build && forge test
LEDGEROOT_DEPLOYER_PRIVATE_KEY=... npm run deploy:monad   # owner 由 LEDGEROOT_PRIVATE_KEY 推导
npm run anchor -- --db ./ledgeroot.sqlite
```

---

## 为什么用 Ledgeroot

- **fail-closed 是结构性的。** 每条策略都跑，第一个拒绝即中止支付，并且**拒绝本身也被记录**。不存在"跳过一次检查然后放行"的路径。
- **可验证，不只是有日志。** 收据带 Ed25519 签名、哈希链互锁、commit 到链上 epoch Merkle 根。第三方**离线**即可验证——不连回、不经手任何厂商。
- **拒付也是证据。** 被拦下的尝试与成功的支付产生同样格式的签名收据。那是 agent 任务失败唯一能被看见的地方。
- **一把钥匙动钱，一把钥匙作证。** 收据签名密钥与支付密钥刻意不互相回落。
- **钱不碰浮点。** 全程六位小数 bigint 运算。
- **对"不知道"诚实。** 证据缺失报 `incomplete`，**绝不报成被篡改**，也绝不放行。
- **证明的是执行，不只是意图。** 一致性视图会把已付收据拿回它所属的 mandate 再校验一遍。
- **MIT、本地 SQLite、无 SaaS、无遥测。** 什么都不会离开本机。

---

## 它站在哪一格

**生态位：链上稳定币 × agent 小额 402 支付**（单价 $0.001–$0.05，百万笔/月量级）。

这个位由**费率结构**保证，不由技术优势保证：$0.30 + 2.9% 的卡组织费率摊在 $0.005 上等于 6000%，**物理上不可行**。所以 x402 存在；也所以我们**不做大额**——大额有发票、合同、退款流程，那是 Shopify / Stripe / Visa TAP / Mastercard 的地盘。

> ⚠️ 费率结构排除的是**按交易金额抽成**的对手，**不排除**按负载计费、把支付当平台功能送的云厂商——见 [aws-agentcore-payments-analysis.md](./docs/aws-agentcore-payments-analysis.md) §6.2。

在这个位里，Ledgeroot 只做三件事：

| 做 | 不做 |
|---|---|
| **授权** —— 用户自签的 mandate 约束 agent 能花多少、付给谁、到何时 | ❌ **不做托管** —— 私钥永不出本机 |
| **执行前校验** —— fail-closed 策略引擎，五条默认策略 | ❌ **不做路由器 / 发现层** —— 分发层已被占据 |
| **审计留痕** —— 六段收据 + 哈希链 + 上链锚定 + 离线三态验证 | ❌ **不做 LLM 推理闸门** —— 我们的优势恰恰是**确定性** |

> 📌 在这个粒度下，**"收据"本身不是产品**（$0.005 的万分之一），它是**原料**。能收费的只有把收据变成**账**的那一层。这个定位**不影响收据的工程质量**——上层要可信，底下每张收据就必须能独立验证。

### 对齐 MAS SAFR

Ledgeroot 的三层与 MAS《Safeguards for Agentic Finance at Runtime》的三个运行时保障功能一一对应——**我们在看到这份文档之前就独立实现了同一套架构**：

| SAFR 功能 | Ledgeroot 实现 |
|---|---|
| 身份与权限（establish agent's identity and authority） | mandate（EIP-712 签名授权令）+ `ledgeroot_mandate_sign` |
| 执行前评估（evaluate agent actions against controls before execution） | 策略引擎（fail-closed，五条默认策略）+ `ledgeroot_pay` 前置校验 |
| 审计留痕（maintain a clear audit record） | 六段收据 + RFC 8785 哈希链 + epoch Merkle 根上链 + `ledgeroot_verify` 离线三态验证 |

> SAFR 是自愿性框架（2026-07-03 发布）；真正有约束力的是 MAS 即将定稿的 AI 风险管理指南（覆盖 agentic AI）。两层都值得对齐——我们现在就按 SAFR 的三层实现。

### 能接什么

- **任意 MCP 宿主** —— Claude Code、opencode，以及任何说 MCP 的宿主（这是我们唯一维护的集成面）。
- **x402 网关** —— 包括已上 Coinbase Bazaar 的那些。
- **目前是 Monad testnet** —— chainId 10143，facilitator 为 `x402-facilitator.molandak.org`。换链是补一个配置实例，不是重写；见[已知边界](#已知边界)。
- **AP2 风格授权令** —— 可导入外部签名授权，并与本地策略取交集。

---

## 六段收据

`意图 → 授权 → 计划 → 调用 → 交易哈希 → 交付凭证`

| 段 | 内容 | 落在哪 |
|---|---|---|
| 1. **意图** | 自然语言说明 agent 为什么付这笔钱 | `segments.intent.text` |
| 2. **授权** | 覆盖本次支付的 mandate + **策略交集**（mandate 实际约束了哪几条策略） | `segments.mandate` |
| 3. **计划** | 卖家发来的 402 报价**原样**，加上它的规范哈希 —— `payTo` 与报价金额都从这里读，因此"策略判定的是什么"与"收据记录的是什么"是同一个对象 | `segments.plan` |
| 4. **调用** | **逐条策略的判定结果**，放行的和拒付的都记 | `segments.call.policyResults` |
| 5. **交易** | 结算协议 + `txHash` + `chainId` + `payer` | `segments.tx` |
| 6. **交付** | 只存**响应体的哈希与字节数**，不存原文 | `segments.delivery` |

几个刻意的地方：

- **段间由 RFC 8785 规范化哈希互锁**：每张收据带 `prevHash` 回指上一张的 `receiptHash`，append-only，不支持原地更新（收据的 `id` 就是它内容的规范哈希——改一个字节就换了身份）。
- **每张收据带 Ed25519 detached 签名**，JWS 式 `protected` 头，签名覆盖 `{payload, protected}`，因此 `alg` / `kid` 落在**被签字节内**，不可事后替换。`kid` 是公钥的 **RFC 7638 JWK thumbprint**——标识由密钥本身派生，无需注册表，也不会与密钥漂移。
- **哈希链证"内容没被改"，签名证"谁做的陈述"。** 两者独立：内容被改并重新哈希后链校验仍能通过，只有签名能发现。
- 公钥以 **JWKS** 发布（`npx ledgeroot jwks`），并随证据包一起导出，第三方**无需连回即可验签**。
- **第六段只能由调用方回报**（`ledgeroot_pay` 的 `responseBody`）。Ledgeroot 结算支付，但**不抓取资源**——响应体只有 agent 见过，所以这一段的哈希只能由调用方提供。
- **第三段是可验证的，不只是描述性的。** 报价原样存储并由哈希承诺，验证方会重算 `canonicalHash(segments.plan.quote)` 做比对。**签名后偷换报价**会被这条抓住——即使把收据重新哈希并重新签名也一样。而 `payTo` 与报价金额取自同一个对象，调用方也就无法一边传一个合规的 `payTo`、一边让报价指向别处。

### 签名密钥与支付密钥是分离的

| 变量 | 用途 | 落空时 |
|---|---|---|
| `LEDGEROOT_PRIVATE_KEY` | **动钱**：签 EIP-3009 授权、提交锚定交易 | 无法支付 |
| `LEDGEROOT_SIGNING_KEY` | **只做陈述**：签收据 | **收据不签名 → `verify` 报 `incomplete` 而不是 `verified`** |

刻意**不互相回落**：一把钥匙动钱，一把钥匙作证，互不兼任。无法归因的证据不该报 `verified`。

---

## 三态验证（离线优先）

验证**不依赖任何服务器**，`ledgeroot verify` 直接读本地库重算。

| 状态 | 含义 |
|---|---|
| `verified` | 全部检查通过 |
| `tampered` | **字节被检查过，对不上** —— 自哈希不符 / `prevHash` 断链 / 首张带 `prevHash` / `plan.quoteHash` 与所记录的报价对不上 / 重算 epoch 根与锚定根不符 / 已锚定 epoch 内的收据缺失 / 签名不符 / `alg` 不受支持 |
| `incomplete` | **证据缺失或取不到** —— 未签名 / 验证方不持有该 `kid` / 已付收据缺 `txHash` / 锚定记录无边界 / 未知结算协议 / 节点不可达 |

**这条界线是整个产品最重要的纪律**：`tampered` 优先于 `incomplete`，而**取不到证据绝不报成被篡改**。把网络故障报成篡改，会让告警整体失去可信度；反过来把缺失当放行，就是宣称做了一次没做的检查。

**链上结算校验是显式选用的**（`--check-chain` / `checkChain: true`）：离线路径保持同步且零网络，链上校验才去拉 RPC。

| 链上校验的判定 |
|---|
| 交易不存在 → `tampered`（链上没有这笔） |
| **节点连不上 → `incomplete`**（读不到 ≠ 不存在） |
| 交易回滚 / `to` 不是 USDC 合约 / 调用不是 `transferWithAuthorization` / `to`·`value`·`from` 与收据的 payTo·amount·payer 不符 → `tampered` |
| 非 x402 的结算协议 → `incomplete`（见[已知边界](#已知边界)） |

**锚定边界**：epoch 根覆盖的是「提交那一刻已存在的收据数」（`receiptCount`）。验证按该边界切片重算，所以**锚定之后再发生支付不会误报篡改**；反过来，已锚定的收据少于记录数 → `tampered`（是删除）。

---

## 五条默认策略（fail-closed）

攻击形态各有对应的那条：

1. **对手方白名单** —— 只付 mandate 里列出的 x402 网关
2. **payTo 绑定** —— 结算地址必须与 mandate 绑定一致（**拦住上面 demo 里那笔提示注入转账的就是这一条**）
3. **报价漂移** —— 实际扣款与 402 报价的偏差不得超过阈值（默认 10%）
4. **端点限速** —— 每个端点限制调用频率
5. **限额** —— 单笔上限 + 累计上限

**约束的语义**：白名单与 payTo 列表**为空 = 不约束**（不是拒绝一切）；限速要 mandate 显式配置 `endpointRateLimit` 才生效；限额两条恒生效。`ledgeroot_mandate_import` 会把 mandate 的约束与本地已注册策略取**交集**，写进收据第二段。

引擎跑完**每一条**策略并记录全部判定，返回第一个拒绝。金额一律走 `decimal.ts` 的 **bigint 六位小数整数运算**——钱不做浮点。

**这几条里，链上表达不了的是报价漂移、端点限速、累计上限（structuring）与拒付留痕。** 链上只知道地址，不知道 host、不知道报价、不记录"被拦下的尝试"。这是这一层存在的理由。

---

## 幂等、崩溃窗口与任务关联

x402 轨道与本地库**不是一个事务**。Ledgeroot 用两个可选关联键补上支付原语回答不了的问题：

### `requestId` —— 幂等，且在**动钱之前**占位

朴素做法（"结算成功后再写收据，重试时查收据去重"）有一个致命窗口：**钱已结算、收据还没落库**时崩溃，则钱动了、没有记录、`requestId` 也查不到 → 重试**再付一次**。这既丢证据又丢钱，而且丢的正是产品声称要防的事。

所以 `requestId` 在**尝试时**被消耗，而不是在成功时：

| 步 | 动作 |
|---|---|
| 1 | 命中已有收据 → **直接回放**（`deduplicated: true`），不再次扣款 |
| 2 | 策略放行后、**动钱之前**：在链外的 `payment_intents` 表占位 |
| 3 | **占位失败**（该 key 已被占，说明上一次尝试的结果没被记录）→ **拒付**，并记一条 `denied` 收据 |
| 4 | 结算 → 写收据 → 释放占位 |

**为什么占位失败必须拒付而不是重试**：那一行的含义是「**我们不知道那笔支付有没有结算**」。拒付是可恢复的，重复付款不是。

> ⚠️ 预写记录**只能在链外**：收据的 `id` 是内容哈希，把 `status` 从 `pending` 改成 `paid` 就会改哈希，下一张收据的 `prevHash` 会指向不存在的哈希。链是 append-only 的，原地更新在结构上不可能。
>
> ⚠️ **不传 `requestId` 就没有这层保护**——没有可对应的键。幂等必须主动要求。

### `taskId` —— 意图链

把多笔支付归到同一个用户任务下；仪表盘据此聚合展示「N 笔 / 总额 / 拦截数」。

### 撤销

`ledgeroot_mandate_revoke` 撤销单条；存储层另有**一键熔断**（`revokeAllMandates`）供控制面调用。撤销后的下一笔当场拒付**并留痕**。

---

## 已知边界

诚实部分。这些是**当前实现**的边界，不是设计意图的否定；对应的排序与取舍记录在 [roadmap.md](./docs/roadmap.md)。

| 边界 | 现状 |
|---|---|
| **链是硬编码的** | `MONAD_TESTNET_X402` 是唯一实例，没有环境变量能切链或换 USDC 合约。`FacilitatorNetworkConfig` 类型已把 chainId / network / scheme / USDC / domain 全抽出来，所以**这是补实例而非重构**——但它让「测试网 → 主网」目前是改代码而不是改配置 |
| **MPP 只有接缝，没有实现** | `segments.tx.protocol` 是显式维度：**未知协议报 `incomplete`，不放行也不冤枉**。但 MPP 的字段级形状未定，所以没有预设载荷，也没有 provider。**这是 [roadmap.md](./docs/roadmap.md) 里排在第一位的待补项** |
| **热路径未加索引** | 全库没有一个 `CREATE INDEX`：单笔支付有 4 次未索引全表扫描，其中两次还会 `JSON.parse` 整个匹配集。单笔 O(n)，一个月 O(n²) |
| **单进程、单租户** | 一个库、一把签名钥、一把付款钥。数据模型里没有租户边界——`agentId` / `mandateId` 不是隔离键 |
| **测试网锚定不产生证据价值** | 测试网的区块时间不是外部权威。主网或补 RFC 3161 合格时间戳是后续动作 |
| **包含证明只在库 API** | `merkleProof` / `verifyMerkleProof`（RFC 6962 §2.1.3 审计路径）已实现并有交叉验证测试，但**本仓库的 CLI 与 `ledgeroot_verify` 尚未输出或校验逐张证明**；接入在 [MandateKey](../mandatekey) 的证据包里 |
| **第三方独立验证仍要走证据包** | 独立验证器包（零依赖、单文件、断网可跑）尚未发布；目前第三方要验单张收据，需用导出的证据包（含公钥）或直接依赖本库 |
| **验证是全量的** | `verify` 每次遍历全部收据逐条重算 SHA-256 + Ed25519，无增量、无检查点；`--check-chain` 的 RPC 并发没有上限 |
| **合约测试不在 CI 里** | `.github/workflows/ci.yml` 只跑 typecheck、100 个 TypeScript 测试与 build；`LedgerootAnchor.sol` 的 `forge test` 目前仍只在本地跑 |
| **没有聚合层** | 全库没有一处 SQL 聚合（无 `GROUP BY` / `SUM` / `COUNT`），也没有对账导出。这是生态位里唯一能收费的那一层，目前**完全不存在** |
| **ERC-8004 只埋了字段** | `Mandate.agentId` 存在但未接注册表校验 |

---

## 锚定合约

`contracts/src/LedgerootAnchor.sol` —— 全项目唯一合约，**只存 32 字节根 + 回指针 + epoch 计数器**。

- **权限受控**：`anchor()` 有 `onlyOwner`。开放的 `anchor()` 会让"这个根在链上"只等于"有人往这里锚了东西"——攻击者可以发布伪造根，或顶掉诚实根让有效收据验成 `tampered`。owner 是**锚定钱包**（`LEDGEROOT_PRIVATE_KEY` 推导），不是部署者，因此两把钥匙可以分离。
- **epoch 由合约拥有**：`lastEpoch` 每次锚定自增，客户端读合约而不是自己记数——否则一个全新的库会把它的第一次锚定标成 "epoch 1"，不管合约已经走到多远。
- **Merkle 用 RFC 6962 MTH**：叶 `SHA-256(0x00 ‖ d)`、内部节点 `SHA-256(0x01 ‖ L ‖ R)`、按最大 2 的幂切分（不复制奇数末节点）。**域分隔**是第二原像抗性的来源。测试用 RFC 9162 §2.1.2 的栈式算法作独立预言机交叉验证。
- 部署到 Monad testnet（chainId 10143）。曾用于 demo 的一次部署：`0xc0234ea7e3af77e5ae686caff62ff88eaccd8c30`（owner `0x055A…A8f7`）——**测试网地址，随时可能重部署，以你的 `.env` 为准**。

---

## 十个 `ledgeroot_*` 工具

| 工具 | 作用 |
|---|---|
| `ledgeroot_pay` | 受约束 x402 支付（幂等去重 + 任务关联），出六段收据；传卖家发来的 `quote`，收据即对它作出承诺；传 `responseBody` 让第六段覆盖交付 |
| `ledgeroot_mandate_sign` | 本地私钥现场签发授权令（`id` 可省略，自动生成） |
| `ledgeroot_mandate_import` | 导入 AP2 风格授权令（**验签失败直接拒绝**） |
| `ledgeroot_mandate_list` | 列出有效授权 |
| `ledgeroot_mandate_revoke` | 撤销授权（一键熔断） |
| `ledgeroot_receipt_list` | 列出收据（按 mandate / status / endpoint 过滤） |
| `ledgeroot_receipt_get` | 取单张收据 |
| `ledgeroot_verify` | 离线验证证据链 + 锚定；`checkChain` 额外核对链上结算 |
| `ledgeroot_anchor` | 提交 epoch Merkle 根上链 |
| `ledgeroot_export` | 导出证据包（收据 + 根 + 锚定记录 + 公钥 + 验证结论） |

---

## 环境变量

| 变量 | 说明 |
|---|---|
| `LEDGEROOT_DB` | SQLite 数据库路径（默认 `ledgeroot.sqlite`） |
| `LEDGEROOT_PRIVATE_KEY` | **动钱**的私钥：支付签名 + 锚定提交。永不出本机 |
| `LEDGEROOT_SIGNING_KEY` | **收据签名**密钥（32 字节 hex 种子）。与支付密钥刻意分离。**未设置则收据不签名，验证报 `incomplete`** |
| `LEDGEROOT_FACILITATOR_URL` | Monad x402 facilitator 地址（默认 `https://x402-facilitator.molandak.org`，公开、无需 API key） |
| `LEDGEROOT_RPC_URL` | Monad testnet RPC（默认 `https://testnet-rpc.monad.xyz`） |
| `LEDGEROOT_ANCHOR_ADDRESS` | 锚定合约地址（未设置则无法锚定） |
| `LEDGEROOT_DEPLOYER_PRIVATE_KEY` | 仅 `deploy/monad.ts` 使用；合约 owner 由 `LEDGEROOT_PRIVATE_KEY` 推导 |
| `LEDGEROOT_ANCHOR_BYTECODE` | 部署用字节码；不设则读 `forge build` 产物 |
| `LEDGEROOT_DRY_RUN` | `true` 启用仿真：零钱包零 USDC 跑全流程（假 tx + 一次性私钥，**禁止用于真实支付**） |

---

## 仓库结构

```
src/
  policy/        策略引擎 + 五条默认策略 + Zod schema
  receipt/       六段收据构建 + RFC 8785 哈希链 + Ed25519 签名（JWKS / thumbprint kid）
  anchor/        RFC 6962 Merkle（根 / 包含证明）+ 锚定器（viem）
  verify/        离线三态验证器 + 链上结算内容校验（ERC-3009 解码比对）
  store/         SQLite append-only 存储（receipts / mandates / anchors / payment_intents）
  x402/          facilitator 集成（EIP-3009 授权 + /verify + /settle）
  tools/         十个 ledgeroot_* MCP 工具
  mandate.ts     EIP-712 授权令（签发 / 验签 / 策略交集）
  consistency.ts 授权-执行一致性分析（事后复核：已付收据是否越权）
  decimal.ts     USDC 六位小数 bigint 运算，无浮点
  env.ts         环境加载 + dry-run 开关
  cli.ts         verify / export / anchor / jwks / serve
scripts/         demo（dry-run 全流程）/ pay-demo（真实支付）/ deploy
contracts/       LedgerootAnchor（Solidity 0.8.24 + Foundry）
deploy/          Monad testnet 部署配置
docs/            架构评估 / 路线图 / 竞品与标准调研 / 商业化方向
assets/          字标（亮 / 暗两版）
test/            12 个文件、100 个测试
```

---

## 参与贡献

小而聚焦的改动最好落地，路线图是最好的入口：

- **[roadmap.md](./docs/roadmap.md)** —— 排好序的计划，每项都带验收标准与涉及文件。
- **[已知边界](#已知边界)** —— 表里每一条都是真实且有边界的工作量。
- **提 PR 前先跑**：`npm run typecheck && npm test && npm run build`（CI 跑的就是这三条）。

刚接触代码？`scripts/demo.ts` 用单文件走完整闭环，`test/pay.test.ts` 端到端覆盖崩溃窗口那一组行为。

---

## 设计与调研文档

> 📌 这些文档以中文撰写，尚未有英文版。

| 文档 | 内容 |
|---|---|
| [aws-agentcore-payments-analysis.md](./docs/aws-agentcore-payments-analysis.md) | **AWS Bedrock AgentCore payments（2026-08-18 GA）深度分析**：第一个同时是分发垄断者与能力竞品的对手，以及它在我们"费率结构护城河"上打出的洞 |
| [architecture-gaps.md](./docs/architecture-gaps.md) | 源码级架构评估：已修的真 bug（崩溃窗口 / `seq` 分配）、规模差距、多协议接缝 |
| [roadmap.md](./docs/roadmap.md) | 行动规划：P0 正确性（D1–D8 已清）→ P1 差异化 → P2 可见性 → P3 公信力；含待定决策 Q1–Q9 |
| [threat-landscape.md](./docs/threat-landscape.md) | 威胁全景：载波（PEAC / x402 草案 / IETF）、分发垄断者（Coinbase、卡组织、**AWS**）、直接竞品、监管时钟 |
| [standards-landscape.md](./docs/standards-landscape.md) | 学术与标准层调研：OAP、Vaara Receipt、x402 与 MPP 并列支持的依据 |
| [vaara-competitive-analysis.md](./docs/vaara-competitive-analysis.md) | 最接近的对手：自托管 + 断网单文件验证 + held-set completeness |
| [trustbench-competitive-analysis.md](./docs/trustbench-competitive-analysis.md) | 同名撞车与逐条源码核验 |
| [commercialization.md](./docs/commercialization.md) | 生态位、四个取舍、商业模式分层、现在**绝不**做的事 |

---

## 许可

MIT © 2026 Ledgeroot

<div align="center">

### 行业造好了锁，没人造钥匙圈；造好了刹车，没人造黑匣子。

**[自己验一遍——不必信我们。](#快速开始)**

⭐ **[Star](https://github.com/ledgeroot/ledgeroot)** · 📖 **[English README](./README.md)** · 🗺️ **[路线图](./docs/roadmap.md)** · 🛡️ **[威胁全景](./docs/threat-landscape.md)**

<sub>MIT · 无 SaaS · 无遥测 · 私钥永不出本机</sub>

</div>
