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

## 九个 `ledgeroot_*` 工具

| 工具 | 作用 |
|---|---|
| `ledgeroot_pay` | 受约束的 x402 支付，出六段收据 |
| `ledgeroot_mandate_import` | 导入 AP2 风格授权令 |
| `ledgeroot_mandate_list` | 列出有效授权 |
| `ledgeroot_mandate_revoke` | 撤销授权（一键熔断） |
| `ledgeroot_receipt_list` | 列出收据 |
| `ledgeroot_receipt_get` | 取单张收据 |
| `ledgeroot_verify` | 离线验证证据链 + 锚定 |
| `ledgeroot_anchor` | 提交 epoch Merkle 根上链 |
| `ledgeroot_export` | 导出证据包 |

## 快速开始

```bash
npm install
npm run build

# CLI（离线验证 / 导出证据包）
node dist/cli.js verify
node dist/cli.js export

# 作为 MCP server 接入宿主（stdio）
LEDGEROOT_DB=./ledgeroot.sqlite node dist/server.js
```

### 环境变量

| 变量 | 说明 |
|---|---|
| `LEDGEROOT_DB` | SQLite 数据库路径（默认 `ledgeroot.sqlite`） |
| `LEDGEROOT_FACILITATOR_URL` | Monad x402 facilitator HTTP 地址（默认 `https://x402-facilitator.molandak.org`） |
| `LEDGEROOT_RPC_URL` | Monad testnet RPC（默认 `https://testnet-rpc.monad.xyz`） |
| `LEDGEROOT_ANCHOR_ADDRESS` | 锚定合约地址（未设置则锚定离线） |
| `LEDGEROOT_PRIVATE_KEY` | 支付 + 锚定签名私钥（永不出本机） |

## 真实支付演示（Monad testnet）

前置：`ledgeroot/.env` 配好 `LEDGEROOT_PRIVATE_KEY`，钱包里已有测试网 USDC（Circle faucet）。

```bash
# 策略放行 → 真实 USDC 支付 → 出六段收据
npm run demo:pay -- <payTo地址> 0.001

# 查看收据链 + 离线验证
npm run verify -- --db ./ledgeroot.sqlite
```

`demo:pay` 会：写入一条演示 mandate → 跑 `ledgeroot_pay` 全流程 → 过五条策略 → 本地签 EIP-3009 `transferWithAuthorization` → 经 facilitator `/verify` + `/settle` 上链结算（facilitator 代付 gas）→ 打印六段收据。

## 锚定合约

`contracts/src/LedgerootAnchor.sol` — 全项目唯一合约，只存 32 字节根 + 回指针。

```bash
forge build
LEDGEROOT_ANCHOR_BYTECODE=$(cat contracts/out/LedgerootAnchor.sol/LedgerootAnchor.json | jq -r .bytecode.object) \
LEDGEROOT_DEPLOYER_PRIVATE_KEY=... \
npm run deploy:monad
```

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
  tools/     九个 ledgeroot_* MCP 工具
contracts/   LedgerootAnchor（Solidity 0.8.24 + Foundry）
deploy/      Monad testnet 部署配置
```

## 许可

MIT
