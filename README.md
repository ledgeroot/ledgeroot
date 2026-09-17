# Ledgeroot

MCP 支付插件 + 证据引擎。装进 Claude Code / opencode 等任意 MCP 宿主，agent 即获得受约束的 x402 支付能力：每笔支付执行前经过策略校验（fail-closed），执行后自动生成六段式审计收据，epoch Merkle 根上链锚定。拒付尝试同样留痕。

> **Every agent payment, on the record.**

Ledgeroot 是「机芯 + 仪表盘」双件结构的**机芯**。仪表盘见 [mandatekey](../mandatekey)。

---

## 六段收据

`意图 → 授权 → 计划 → 调用 → 交易哈希 → 交付凭证`

- 段间由 RFC 8785 哈希链互锁（每张收据回指上一张的 `receiptHash`）
- epoch Merkle 根由 25 行锚定合约提交上链
- `npx ledgeroot verify` 离线三态验证（`verified / tampered / incomplete`），不经过任何服务器

## 五条默认策略（fail-closed）

1. **对手方白名单** — 只付 mandate 里列出的 x402 网关
2. **payTo 绑定** — 结算地址必须与 mandate 绑定一致
3. **报价漂移** — 实际扣款与 402 报价的偏差不得超过阈值
4. **端点限速** — 每个端点限制调用频率
5. **限额** — 单笔上限 + 累计上限

## 十个 `ledgeroot_*` 工具

| 工具 | 作用 |
|---|---|
| `ledgeroot_pay` | 受约束 x402 支付（幂等去重 + 任务关联），出六段收据 |
| `ledgeroot_mandate_sign` | 本地私钥现场签发授权令 |
| `ledgeroot_mandate_import` | 导入 AP2 风格授权令 |
| `ledgeroot_mandate_list` | 列出有效授权 |
| `ledgeroot_mandate_revoke` | 撤销授权（一键熔断） |
| `ledgeroot_receipt_list` | 列出收据 |
| `ledgeroot_receipt_get` | 取单张收据 |
| `ledgeroot_verify` | 离线验证证据链 + 锚定 |
| `ledgeroot_anchor` | 提交 epoch Merkle 根上链 |
| `ledgeroot_export` | 导出证据包 |

## 幂等与任务关联

`ledgeroot_pay` 接受两个可选关联键：

- `requestId`（幂等去重）——同一个 `requestId` 重试时，直接返回**已有收据**（`deduplicated: true`），不会二次扣款。去重是查本地 append-only 账本，而不是查链。
- `taskId`（意图链）——把多笔支付归到同一个用户任务下；仪表盘按任务聚合展示「N 笔 / 总额 / 拦截数」。

这两层补上了支付原语（x402）回答不了的问题：**「重试先查原交易」** 和 **「这笔钱属于哪次任务」**。

## 快速开始

```bash
npm install
npm run build

# CLI（离线验证 / 导出证据包）
node dist/cli.js verify
node dist/cli.js export

# 作为 MCP server 接入宿主（stdio）
node dist/cli.js serve
```

### 环境变量

| 变量 | 说明 |
|---|---|
| `LEDGEROOT_DB` | SQLite 数据库路径（默认 `ledgeroot.sqlite`） |
| `LEDGEROOT_FACILITATOR_URL` | Monad x402 facilitator HTTP 地址（默认 `https://x402-facilitator.molandak.org`） |
| `LEDGEROOT_RPC_URL` | Monad testnet RPC（默认 `https://testnet-rpc.monad.xyz`） |
| `LEDGEROOT_ANCHOR_ADDRESS` | 锚定合约地址（未设置则锚定离线） |
| `LEDGEROOT_PRIVATE_KEY` | 支付 + 锚定签名私钥（永不出本机） |
| `LEDGEROOT_DRY_RUN` | 设为 `true` 启用仿真：零钱包零 USDC 跑全流程（假 tx + 一次性私钥） |

## 在 Claude Code 中使用

装进 Claude Code 后，agent 获得受约束的支付能力，用户用自然语言管理授权。

```bash
# 一次性安装（发版后可直接 npx；本地开发用 node 指向 dist/cli.js）
claude mcp add ledgeroot \
  --env LEDGEROOT_PRIVATE_KEY=0x你的私钥 \
  --env LEDGEROOT_DB=/绝对路径/ledgeroot.sqlite \
  -- npx ledgeroot serve
```

之后全程对话：

1. **签发授权**：说「给它授权 5 USDC 买 xapi.to 数据」→ Claude 调 `ledgeroot_mandate_sign` → 你确认 → 授权令签好存库。
2. **agent 花钱**：说「帮我调研 X，要买付费数据」→ agent 自动 `ledgeroot_pay` → 策略校验 → facilitator 结算 → 六段收据。
3. **撤销**：说「撤销它的授权」→ `ledgeroot_mandate_revoke`。
4. **审计**：说「查收据 / 验证证据」→ `ledgeroot_receipt_list` / `ledgeroot_verify`。

> 自然语言解析由宿主（Claude）完成，ledgeroot 只提供结构化、确定性的工具；私钥通过 `--env` 传入，永不出本机。

## 仿真演示（dry-run，零门槛）

不用钱包、不用 USDC、不用网络，一条命令跑完整闭环（签发 → 支付 → 幂等重试 → 注入拦截 → 熔断 → 离线验证）：

```bash
LEDGEROOT_DRY_RUN=true npm run demo
```

## 真实支付演示（Monad testnet）

前置：`ledgeroot/.env` 配好 `LEDGEROOT_PRIVATE_KEY`，钱包里已有测试网 USDC（Circle faucet）。

```bash
# 策略放行 → 真实 USDC 支付 → 出六段收据
npm run demo:pay -- <payTo地址> 0.001

# 查看收据链 + 离线验证
npm run verify -- --db ./ledgeroot.sqlite
```

`demo:pay` 会：写入一条演示 mandate → 跑 `ledgeroot_pay` 全流程 → 过五条策略 → 本地签 EIP-3009 `transferWithAuthorization` → 经 facilitator `/verify` + `/settle` 上链结算（facilitator 代付 gas）→ 打印六段收据。

## 锚定合约 + 上链

`contracts/src/LedgerootAnchor.sol` — 全项目唯一合约，只存 32 字节根 + 回指针。部署到 Monad testnet（chainId 10143）。

```bash
# 0. 安装 Foundry（如未安装）
#    curl -L https://foundry.paradigm.xyz | bash && foundryup

# 1. 编译 + 测试合约
forge install foundry-rs/forge-std
forge build
forge test

# 2. 部署（二选一）
#   a) Foundry 原生
forge create contracts/src/LedgerootAnchor.sol:LedgerootAnchor \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key $LEDGEROOT_DEPLOYER_PRIVATE_KEY
#   b) 或 viem 脚本（自动读取 forge build 产物）
LEDGEROOT_DEPLOYER_PRIVATE_KEY=... npm run deploy:monad

# 3. 把部署地址写进 .env
#    LEDGEROOT_ANCHOR_ADDRESS=0x...

# 4. 上链锚定当前所有收据的 epoch Merkle 根
npm run build && npm run anchor -- --db ./ledgeroot.sqlite

# 5. 离线验证收据链 + 锚定
npm run verify -- --db ./ledgeroot.sqlite
```

`anchor` 把当前收据的 Merkle 根提交到链上并记录交易哈希；`verify` 离线重放校验收据链与锚定根。

## 仓库结构

```
src/
  policy/    策略引擎 + 五条默认策略 + Zod schema
  receipt/   六段收据构建 + RFC 8785 哈希链
  anchor/    Merkle 树 + 锚定器（viem）
  verify/    离线三态验证器
  store/     SQLite append-only 存储
  wallet/    本地密钥库 / 外部钱包适配
  x402/      facilitator HTTP 集成点
  tools/     十个 ledgeroot_* MCP 工具
  env.ts     环境加载 + dry-run 开关
  mandate.ts EIP-712 授权令（签发 / 验签 / 取交集）
  consistency.ts 授权-执行一致性分析
scripts/     demo（全流程演示）/ pay-demo / deploy
contracts/   LedgerootAnchor（Solidity 0.8.24 + Foundry）
deploy/      Monad testnet 部署配置
```

## 许可

MIT
