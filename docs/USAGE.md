# 使用手册（三层流程）

## 0. 防御层（强制）

```bash
cd skills/hole/layers/guard
node target.mjs init
# 编辑 target.json 三个必填项：
#   authorization.reference  项目页 URL / 授权书编号 / 靶场说明
#   target.host              主目标
#   target.scope             授权范围（数组）
node target.mjs check     # 必须 PASS
node target.mjs env       # 导出 TARGET / TARGET_HOST / RATE / SCOPE / EVIDENCE_DIR
```

`check` 硬拒：无授权来源、scope 空、host 越界、命中 out_of_scope、allow_dos、max_rps>5。

## 1. 破甲层（可选）

```bash
cd ../break
node adapter.mjs build --profile cn-model --task pentest --out prompt.md
node adapter.mjs inspect --file prompt.md
node adapter.mjs log --profile cn-model --task pentest --refusal 0 --note 首轮通过
```

四层装配：L0 身份 → L1 任务框架（陈述授权事实）→ L2 工具纪律 → L3 输出契约。门禁不过时 `build` 退出码 2。

## 2. 挖掘层

按 `layers/hunt/README.md`：先侦察（probe/jsendpoints），再按「遗留文件 → 认证 → 越权 → 注入 → 文件/SSRF/业务 → 基础设施 → 框架专项」推进。命令用 `{{TARGET}}` 占位。

## 3. 报告

`references/report-template.md`：第 8 项不写 URL/IP/路径；截图两张（复现 + 归属证明）；PoC 只证明存在。
