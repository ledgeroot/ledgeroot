# Ledgeroot

**中文** · [English](./README.md)

> **行业造好了锁，没人造钥匙圈；造好了刹车，没人造黑匣子。**

**MCP 支付插件 + 证据引擎。** 装进 Claude Code / opencode 等任意 MCP 宿主，agent 即获得受约束的 x402 支付能力：每笔支付**执行前**过策略校验（fail-closed），**执行后**自动生成六段式审计收据，epoch Merkle 根上链锚定。**被拦下的尝试同样留痕**——拒付也出收据。

> **Every agent payment, on the record.**

Ledgeroot 是「机芯 + 仪表盘」双件结构的**机芯**。仪表盘见 [MandateKey](../mandatekey)。

---

## 一、它站在哪一格

**生态位：链上稳定币 × agent 小额 402 支付**（单价 $0.001–$0.05，百万笔/月量级）。

这个位由**费率结构**保证，不由技术优势保证：$0.30 + 2.9% 的卡组织费率摊在 $0.005 上等于 6000% 手续费，**物理上不可行**。所以 x402 存在；也所以我们**不做大额**——大额有发票、合同、退款流程，那是 Shopify / Stripe / Visa TAP / Mastercard 的地盘。

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

---

## 二、六段收据

`意图 → 授权 → 计划 → 调用 → 交易哈希 → 交付凭证`

| 段 | 内容 | 落在哪 |
|---|---|---|
| 1. **意图** | 自然语言说明 agent 为什么付这笔钱 | `segments.intent.text` |
| 2. **授权** | 覆盖本次支付的 mandate + **策略交集**（mandate 实际约束了哪几条策略） | `segments.mandate` |
| 3. **计划** | 原始 402 报价的规范哈希 + 报价本身（`amount` / `payTo` / `endpoint`） | `segments.plan` |
| 4. **调用** | **逐条策略的判定结果**，放行的和拒付的都记 | `segments.call.policyResults` |
| 5. **交易** | 结算协议 + `txHash` + `chainId` + `payer` | `segments.tx` |
| 6. **交付** | 只存**响应体的哈希与字节数**，不存原文 | `segments.delivery` |

几个刻意的地方：

- **段间由 RFC 8785 规范化哈希互锁**：每张收据带 `prevHash` 回指上一张的 `receiptHash`，append-only，不支持原地更新（收据的 `id` 就是它内容的规范哈希——改一个字节就换了身份）。
- **每张收据带 Ed25519 detached 签名**，JWS 式 `protected` 头，签名覆盖 `{payload, protected}`，因此 `alg` / `kid` 落在**被签字节内**，不可事后替换。`kid` 是公钥的 **RFC 7638 JWK thumbprint**——标识由密钥本身派生，无需注册表，也不会与密钥漂移。
- **哈希链证"内容没被改"，签名证"谁做的陈述"。** 两者独立：内容被改并重新哈希后链校验仍能通过，只有签名能发现。
- 公钥以 **JWKS** 发布（`npx ledgeroot jwks`），并随证据包一起导出，第三方**无需连回即可验签**。
- **第六段只能由调用方回报**（`ledgeroot_pay` 的 `responseBody`）。Ledgeroot 结算支付，但**不抓取资源**——响应体只有 agent 见过，所以这一段的哈希只能由调用方提供。

### 签名密钥与支付密钥是分离的

| 变量 | 用途 | 落空时 |
|---|---|---|
| `LEDGEROOT_PRIVATE_KEY` | **动钱**：签 EIP-3009 授权、提交锚定交易 | 无法支付 |
| `LEDGEROOT_SIGNING_KEY` | **只做陈述**：签收据 | **收据不签名 → `verify` 报 `incomplete` 而不是 `verified`** |

刻意**不互相回落**：一把钥匙动钱，一把钥匙作证，互不兼任。无法归因的证据不该报 `verified`。

---

## 三、三态验证（离线优先）

验证**不依赖任何服务器**，`ledgeroot verify` 直接读本地库重算。

| 状态 | 含义 |
|---|---|
| `verified` | 全部检查通过 |
| `tampered` | **字节被检查过，对不上** —— 自哈希不符 / `prevHash` 断链 / 首张带 `prevHash` / 重算 epoch 根与锚定根不符 / 已锚定 epoch 内的收据缺失 / 签名不符 / `alg` 不受支持 |
| `incomplete` | **证据缺失或取不到** —— 未签名 / 验证方不持有该 `kid` / 已付收据缺 `txHash` / 锚定记录无边界 / 未知结算协议 / 节点不可达 |

**这条界线是整个产品最重要的纪律**：`tampered` 优先于 `incomplete`，而**取不到证据绝不报成被篡改**。把网络故障报成篡改，会让告警整体失去可信度；反过来把缺失当放行，就是宣称做了一次没做的检查。

**链上结算校验是显式选用的**（`--check-chain` / `checkChain: true`）：离线路径保持同步且零网络，链上校验才去拉 RPC。

| 链上校验的判定 |
|---|
| 交易不存在 → `tampered`（链上没有这笔） |
| **节点连不上 → `incomplete`**（读不到 ≠ 不存在） |
| 交易回滚 / `to` 不是 USDC 合约 / 调用不是 `transferWithAuthorization` / `to`·`value`·`from` 与收据的 payTo·amount·payer 不符 → `tampered` |
| 非 x402 的结算协议 → `incomplete`（见 §六） |

**锚定边界**：epoch 根覆盖的是「提交那一刻已存在的收据数」（`receiptCount`）。验证按该边界切片重算，所以**锚定之后再发生支付不会误报篡改**；反过来，已锚定的收据少于记录数 → `tampered`（是删除）。

---

## 四、五条默认策略（fail-closed）

攻击形态各有对应的那条：

1. **对手方白名单** —— 只付 mandate 里列出的 x402 网关
2. **payTo 绑定** —— 结算地址必须与 mandate 绑定一致（**这是拦住提示注入转账的那一条**）
3. **报价漂移** —— 实际扣款与 402 报价的偏差不得超过阈值（默认 10%）
4. **端点限速** —— 每个端点限制调用频率
5. **限额** —— 单笔上限 + 累计上限

**约束的语义**：白名单与 payTo 列表**为空 = 不约束**（不是拒绝一切）；限速要 mandate 显式配置 `endpointRateLimit` 才生效；限额两条恒生效。`ledgeroot_mandate_import` 会把 mandate 的约束与本地已注册策略取**交集**，写进收据第二段。

引擎跑完**每一条**策略并记录全部判定，返回第一个拒绝。金额一律走 `decimal.ts` 的 **bigint 六位小数整数运算**——钱不做浮点。

**这几条里，链上表达不了的是报价漂移、端点限速、累计上限（structuring）与拒付留痕。** 链上只知道地址，不知道 host、不知道报价、不记录"被拦下的尝试"。这是这一层存在的理由。

---

## 五、幂等、崩溃窗口与任务关联

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

## 六、已知边界

诚实部分。这些是**当前实现**的边界，不是设计意图的否定；对应的排序与取舍记录在 [roadmap.md](./docs/roadmap.md)。

| 边界 | 现状 |
|---|---|
| **链是硬编码的** | `MONAD_TESTNET_X402` 是唯一实例，没有环境变量能切链或换 USDC 合约。`FacilitatorNetworkConfig` 类型已把 chainId / network / scheme / USDC / domain 全抽出来，所以**这是补实例而非重构**——但它让「测试网 → 主网」目前是改代码而不是改配置 |
| **MPP 只有接缝，没有实现** | `segments.tx.protocol` 是显式维度：**未知协议报 `incomplete`，不放行也不冤枉**。但 MPP 的字段级形状未定（未读规范全文），所以没有预设载荷，也没有 provider |
| **热路径未加索引** | 全库没有一个 `CREATE INDEX`：单笔支付有 4 次未索引全表扫描，其中两次还会 `JSON.parse` 整个匹配集。单笔 O(n)，一个月 O(n²) |
| **单进程、单租户** | 一个库、一把签名钥、一把付款钥。数据模型里没有租户边界——`agentId` / `mandateId` 不是隔离键 |
| **测试网锚定不产生证据价值** | 测试网的区块时间不是外部权威。主网或补 RFC 3161 合格时间戳是后续动作 |
| **包含证明只在库 API** | `merkleProof` / `verifyMerkleProof`（RFC 6962 §2.1.3 审计路径）已实现并有交叉验证测试，但**本仓库的 CLI 与 `ledgeroot_verify` 尚未输出或校验逐张证明**；接入在 [MandateKey](../mandatekey) 的证据包里 |
| **第三方独立验证仍要走证据包** | 独立验证器包（零依赖、单文件、断网可跑）尚未发布；目前第三方要验单张收据，需用导出的证据包（含公钥）或直接依赖本库 |
| **验证是全量的** | `verify` 每次遍历全部收据逐条重算 SHA-256 + Ed25519，无增量、无检查点；`--check-chain` 的 RPC 并发没有上限 |
| **没有聚合层** | 全库没有一处 SQL 聚合（无 `GROUP BY` / `SUM` / `COUNT`），也没有对账导出。这是生态位里唯一能收费的那一层，目前**完全不存在** |
| **ERC-8004 只埋了字段** | `Mandate.agentId` 存在但未接注册表校验 |

---

## 七、锚定合约

`contracts/src/LedgerootAnchor.sol` —— 全项目唯一合约，**只存 32 字节根 + 回指针 + epoch 计数器**。

- **权限受控**：`anchor()` 有 `onlyOwner`。开放的 `anchor()` 会让"这个根在链上"只等于"有人往这里锚了东西"——攻击者可以发布伪造根，或顶掉诚实根让有效收据验成 `tampered`。owner 是**锚定钱包**（`LEDGEROOT_PRIVATE_KEY` 推导），不是部署者，因此两把钥匙可以分离。
- **epoch 由合约拥有**：`lastEpoch` 每次锚定自增，客户端读合约而不是自己记数——否则一个全新的库会把它的第一次锚定标成 "epoch 1"，不管合约已经走到多远。
- **Merkle 用 RFC 6962 MTH**：叶 `SHA-256(0x00 ‖ d)`、内部节点 `SHA-256(0x01 ‖ L ‖ R)`、按最大 2 的幂切分（不复制奇数末节点）。**域分隔**是第二原像抗性的来源。测试用 RFC 9162 §2.1.2 的栈式算法作独立预言机交叉验证。
- 部署到 Monad testnet（chainId 10143）。曾用于 demo 的一次部署：`0xc0234ea7e3af77e5ae686caff62ff88eaccd8c30`（owner `0x055A…A8f7`）——**测试网地址，随时可能重部署，以你的 `.env` 为准**。

---

## 八、十个 `ledgeroot_*` 工具

| 工具 | 作用 |
|---|---|
| `ledgeroot_pay` | 受约束 x402 支付（幂等去重 + 任务关联），出六段收据；传 `responseBody` 让第六段覆盖交付 |
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

## 九、快速开始

```bash
npm install
npm run build

# CLI（离线验证 / 导出证据包 / 上链锚定 / 取公钥）
node dist/cli.js verify [--db <path>] [--check-chain]
node dist/cli.js export [--db <path>]
node dist/cli.js anchor [--db <path>]
node dist/cli.js jwks

# 作为 MCP server 接入宿主（stdio）
node dist/cli.js serve
```

### 仿真演示（dry-run，零门槛）

不用钱包、不用 USDC、不用网络，一条命令跑完整闭环：

```bash
LEDGEROOT_DRY_RUN=true npm run demo
```

依次演示：**① 签发授权令 → ② 正常支付（出六段收据）→ ③ 同 `requestId` 重试回放（不再扣款）→ ④ 提示注入被拦（试图把预算转给未绑定地址）→ ⑤ 一键熔断 → ⑥ 熔断后支付被拒 → ⑦ 离线验证 + 证据包**。

### 真实支付演示（Monad testnet）

前置：`.env` 配好 `LEDGEROOT_PRIVATE_KEY`，钱包里已有测试网 USDC（Circle faucet）。

```bash
npm run demo:pay -- <payTo地址> 0.001
npm run verify -- --db ./ledgeroot.sqlite
```

`demo:pay` 会：写入一条演示 mandate → 跑 `ledgeroot_pay` 全流程 → 过五条策略 → 本地签 EIP-3009 `transferWithAuthorization` → 经 facilitator `/verify` + `/settle` 上链结算（facilitator 代付 gas）→ 打印六段收据。

### 上链锚定

```bash
# 0. 安装 Foundry（如未安装）
#    curl -L https://foundry.paradigm.xyz | bash && foundryup

# 1. 编译 + 测试合约（forge-std 是 git submodule）
forge install foundry-rs/forge-std
forge build && forge test

# 2. 部署（二选一）
#   a) viem 脚本（读 forge build 产物；owner 由 LEDGEROOT_PRIVATE_KEY 推导）
LEDGEROOT_DEPLOYER_PRIVATE_KEY=... npm run deploy:monad
#   b) Foundry 原生（constructor 要 initialOwner —— 填锚定钱包地址）
forge create contracts/src/LedgerootAnchor.sol:LedgerootAnchor \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key $LEDGEROOT_DEPLOYER_PRIVATE_KEY \
  --constructor-args <锚定钱包地址>

# 3. 把地址写进 .env：LEDGEROOT_ANCHOR_ADDRESS=0x...
# 4. 锚定当前所有收据的 epoch Merkle 根
npm run build && npm run anchor -- --db ./ledgeroot.sqlite
# 5. 离线验证收据链 + 锚定
npm run verify -- --db ./ledgeroot.sqlite
```

### 在 Claude Code 中使用

```bash
claude mcp add ledgeroot \
  --env LEDGEROOT_PRIVATE_KEY=0x你的私钥 \
  --env LEDGEROOT_SIGNING_KEY=0x收据签名密钥 \
  --env LEDGEROOT_DB=/绝对路径/ledgeroot.sqlite \
  -- npx ledgeroot serve
```

之后全程对话：

1. **签发授权**：说「给它授权 5 USDC 买 agent402.tools 数据」→ Claude 调 `ledgeroot_mandate_sign` → 你确认 → 授权令签好存库。
2. **agent 花钱**：说「帮我调研 X，要买付费数据」→ agent 自动 `ledgeroot_pay` → 策略校验 → facilitator 结算 → 六段收据。
3. **撤销**：说「撤销它的授权」→ `ledgeroot_mandate_revoke`。
4. **审计**：说「查收据 / 验证证据」→ `ledgeroot_receipt_list` / `ledgeroot_verify`。

> 自然语言解析由宿主（Claude）完成，Ledgeroot 只提供结构化、确定性的工具；私钥只经 `--env` 传入并留在本机。

### 作为库使用

```ts
import { PolicyEngine, defaultPolicies, merkleProof, verifyMerkleProof } from "ledgeroot";
import { LedgerootStore } from "ledgeroot/store";
import { verifyReceiptChain } from "ledgeroot/verify";
```

子路径导出：`ledgeroot` · `/store` · `/verify` · `/anchor` · `/receipt` · `/types`。库本身**不加载 `.env`**——环境由调用方掌握（只有 CLI 与 server 入口调 `loadEnv()`）。

---

## 十、环境变量

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

## 十一、仓库结构

```
src/
  policy/        策略引擎 + 五条默认策略 + Zod schema
  receipt/       六段收据构建 + RFC 8785 哈希链 + Ed25519 签名（JWKS / thumbprint kid）
  anchor/        RFC 6962 Merkle（根 / 包含证明）+ 锚定器（viem）
  verify/        离线三态验证器 + 链上结算内容校验（ERC-3009 解码比对）
  store/         SQLite append-only 存储（receipts / mandates / anchors / payment_intents）
  wallet/        本地密钥库 / 外部钱包适配
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
```

---

## 十二、设计与调研文档

> 📌 这些文档以中文撰写，尚未有英文版。

| 文档 | 内容 |
|---|---|
| [architecture-gaps.md](./docs/architecture-gaps.md) | 源码级架构评估：已修的真 bug（崩溃窗口 / `seq` 分配）、规模差距、多协议接缝 |
| [roadmap.md](./docs/roadmap.md) | 行动规划：P0 正确性（D1–D8 已清）→ P1 差异化 → P2 可见性 → P3 公信力；含待定决策 Q1–Q8 |
| [threat-landscape.md](./docs/threat-landscape.md) | 威胁全景：载波（PEAC / x402 草案 / IETF）、分发垄断者、直接竞品、监管时钟 |
| [standards-landscape.md](./docs/standards-landscape.md) | 学术与标准层调研：OAP、Vaara Receipt、x402 与 MPP 并列支持的依据 |
| [vaara-competitive-analysis.md](./docs/vaara-competitive-analysis.md) | 最接近的对手：自托管 + 断网单文件验证 + held-set completeness |
| [trustbench-competitive-analysis.md](./docs/trustbench-competitive-analysis.md) | 同名撞车与逐条源码核验 |
| [commercialization.md](./docs/commercialization.md) | 生态位、四个取舍、商业模式分层、现在**绝不**做的事 |

---

## 许可

MIT
