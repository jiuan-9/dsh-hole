# 破甲层（prompt-layer harness）

## 定位

给 agent 平台用：把「身份 → 任务框架 → 工具纪律 → 输出契约」四层提示词组装成一份系统提示，让模型在**授权评测环境**里稳定执行红队任务，不被中途拒答打断。

本层是**协议与装配器**，不是提示词仓库：
- 提示词资产由 dsh-purge（Apache-2.0）提供，本层只负责**挂载、分层、按模型选档、留痕**；
- 不复制其代码，装了就挂、没装就走内置精简档；
- 每份产出都带评测记录（profile / 层覆盖 / 拒答次数），可复现、可回滚。

## 边界（硬约束）

| 允许 | 不允许 |
|---|---|
| 自建靶场、授权红队演练、模型安全评测 | 用本层对**未授权真实目标**做攻击 |
| 记录拒答率、层覆盖度、稳定性指标 | 把装配结果当通用越狱外挂对外分发 |
| 与 guard 层联用（先过 target 槽位） | 跳过 guard 层直接进 hunt |

**顺序强制**：guard 层 target.mjs check 不通过时，本层拒绝生成任何任务提示。

## 组成

| 文件 | 作用 |
|---|---|
| compose.md | 四层提示词协议、模型适配矩阵、拒答检测与重试策略 |
| profiles.yml | 档位定义（generic / cn-model / en-model）+ 槽位 |
| adapter.mjs | 装配器：build / inspect / log |

## 快速使用

```bash
# 1. 先过门禁
node ../guard/target.mjs check

# 2. 装配（若已装 dsh-purge 自动挂载其提示词资产）
node adapter.mjs build --profile cn-model --task pentest --out prompt.md

# 3. 检查层覆盖
node adapter.mjs inspect --file prompt.md

# 4. 记录评测
node adapter.mjs log --profile cn-model --task pentest --refusal 0 --note 首轮通过
```
