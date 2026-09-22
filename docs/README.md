# 文档索引

> Ledgeroot 是 agent x402 支付的证据引擎：授权（mandate）→ 执行前 fail-closed 校验 → 六段收据 → 哈希链 → 链上锚定 → 离线三态验证。本文档集记录它的**架构现状、行动计划与外部竞争/监管判断**。

## 阅读顺序

**刚接触项目** → [architecture.md](./architecture.md)（现状与限制）→ [roadmap.md](./roadmap.md)（在做什么）→ [commercialization.md](./commercialization.md)（为什么）

**对外部环境** → [landscape.md](./landscape.md)（谁在场）→ [competitors.md](./competitors.md)（逐维度拆解）→ [standards.md](./standards.md)（学术与标准）

**第二垂直 / 监管** → [tokenized-equities.md](./tokenized-equities.md) → [sec-comment-s7-2026-30.md](./sec-comment-s7-2026-30.md)

## 文档

| 文档 | 内容 | 何时读 |
|---|---|---|
| **[architecture.md](./architecture.md)** | 当前源码的工程评估：已做对的、规模层面的债、架构张力、链配置与协议接缝 | 改代码前 |
| **[roadmap.md](./roadmap.md)** | 行动计划：P0 正确性（已完成）、P1 差异化、P2 可见性、P3 公信力；N 系列差距、Q 系列待决 | 决定优先级时 |
| **[commercialization.md](./commercialization.md)** | 生态位、买方、产品定义、商业模式、四条取舍、启动信号 | 谈商业与定位时 |
| **[landscape.md](./landscape.md)** | 威胁分类法（载波 / 分发垄断者 / 直接竞品 / 相邻 / 监管）、商品化半衰期、**监控触发条件（单一事实源）** | 判断外部动向时 |
| **[competitors.md](./competitors.md)** | 四个核心对手的逐维度拆解：Vaara、AWS AgentCore、TrustBench、Semantica（相邻） | 对标与差异化时 |
| **[standards.md](./standards.md)** | 学术与标准全景：OAP、Vaara Receipt、IETF 草案、2026 论文；三根支柱的占位状态 | 判断"还剩什么"时 |
| **[tokenized-equities.md](./tokenized-equities.md)** | 第二个垂直（UNI permissioned pools × 代币化股票）与两条 SEC 提案线的机会地图 | 评估第二垂直时 |
| **[sec-comment-s7-2026-30.md](./sec-comment-s7-2026-30.md)** | ⚠️ 给 SEC File S7-2026-30 的评论信**草稿**（标注 DRAFT，不可原样提交；见文首待办） | 准备 2026-11-03 评论时 |

## 约定

- **正文为中文**，技术术语与外部引用保留英文。
- **每篇头部三行**：定位 / 状态（含复核日期）/ 关联文档。
- **外部结论标注置信度与来源**；"自述未核实"会显式标出。
- **监控触发条件只在 [landscape.md](./landscape.md) §八 维护**，其他文档引用它，不复制。
- 历史修订**不再以横幅形式记录**——已被推翻的判断不再保留在正文（如需追溯，见 git 历史）。
