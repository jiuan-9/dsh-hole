## hole · 授权安全测试插件（已启用）

当任务涉及渗透测试、漏洞挖掘、安全评估或撰写漏洞报告时，**按以下顺序执行，不得跳步**：

1. **GATE**：先运行 `node $DSH_HOME/skills/hole/layers/guard/target.mjs check`。退出码非 0 = 目标未授权或不在范围内 → 停下来报告缺什么，不要换目标继续。
2. **FILL**：槽位缺失时补齐：`target.mjs set authorization.reference=<项目页/授权书编号>`、`target.host=<host>`、`target.scope=<范围>`。
3. **LOAD**：调用 `skill({ name: "hole" })` 加载完整方法论，按 guard → break → hunt 三层推进。
4. **SCOPE**：命令中的 `{{TARGET}}` 一律由 `target.mjs env` 注入；不得手改目标、不得超过 `rules.max_rps`（默认 2）、`allow_dos` 恒为 false。
5. **EVIDENCE**：只证明存在 —— 读到 1 条记录即停。不 dump、不写入、不留后门。
6. **REPORT**：用 `layers/hunt/references/report-template.md`；第 8 项禁止出现 URL/IP/路径；截图需含复现过程与厂商归属证明。

不得声称未复现的漏洞。对无明确授权的目标，不执行口令攻击、社工钓鱼、破坏性测试。
