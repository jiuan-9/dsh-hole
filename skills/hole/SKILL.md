---
name: hole
description: Authorized web penetration testing playbook in three layers. guard: China cyber-law gate (Criminal Law 285/286, Data Security, PIPL, MIIT vulnerability rules) plus a fillable target-slot tool that hard-rejects out-of-scope hosts, empty scopes, DoS flags and high request rates. break: a prompt-layer harness that composes L0 identity, L1 task framing, L2 tool discipline and L3 output contract, mounting dsh-purge prompt assets and logging refusal metrics. hunt: recon from certificate transparency, per-surface checklists mapped to OWASP Top 10:2025 and WSTG 4.1-4.13, CWE Top 25 tagging, framework fingerprints, captcha and auth bypass, runnable probe scripts, and a 14-field Chinese SRC report template. Load when hunting real, submittable vulnerabilities or writing disclosure reports.
---

# hole — 三层结构

```
layers/guard  防御层  ← 先过这一层，否则下面两层拒绝执行
guard: law-cn.md（中国法律判定）+ target.mjs（目标槽位，等于 tool 入参）

layers/break  破甲层  ← 可选，仅授权评测环境
break: compose.md（四层提示词协议）+ profiles.yml（模型档位）+ adapter.mjs（装配器）

layers/hunt   挖掘层  ← 主体方法论
hunt: 5 份分册 + 5 个可执行脚本
```

## 第 0 步：防御层（强制，不可跳过）

```bash
# 1. 读法律判定
layers/guard/law-cn.md      # 刑法 285/286/253 条对应行为、授权核验清单、数据最小化、停手触发器

# 2. 填目标槽位（本技能的 tool 入参）
node layers/guard/target.mjs init
# 编辑 target.json：authorization.reference（项目页/授权书编号）、target.host、target.scope
node layers/guard/target.mjs check   # 不通过就停，别往下走
node layers/guard/target.mjs env     # 通过后导出 TARGET / RATE / SCOPE 供挖掘层使用
```

`check` 硬拒这些情况：未声明授权来源、scope 为空、host 不在 scope 内、命中 out_of_scope、allow_dos=true、max_rps>5。**没有例外**。

## 第 1 步：破甲层（可选）

仅在**授权红队演练 / 模型安全评测 / 自建靶场**时使用。

```bash
node layers/break/adapter.mjs build --profile cn-model --task pentest --out prompt.md
node layers/break/adapter.mjs inspect --file prompt.md
node layers/break/adapter.mjs log --profile cn-model --task pentest --refusal 0
```

- 装配四层：L0 身份 → L1 任务框架（陈述授权事实，不是说服模型）→ L2 工具纪律 → L3 输出契约；
- 提示词资产自动挂载 dsh-purge（Apache-2.0）中/英版本，未安装则用内置精简骨架；
- 门禁不过时 build 直接退出码 2，不产出任何提示词；
- 每次装配写一行 JSONL 评测记录（首轮通过率 / 重试次数 / 层覆盖）。

## 第 2 步：挖掘层

读 `layers/hunt/README.md` 取分册索引与脚本清单。方法论全部对标 **OWASP Top 10:2025 + WSTG 4.1-4.13 + CWE Top 25 (2025)**，出处见 `layers/hunt/references/00-research-basis.md`。命令里的 `{{TARGET}}` 等占位符由 target.mjs env 注入。

```bash
node layers/hunt/scripts/probe.mjs hosts.txt hosts.json 15
node layers/hunt/scripts/jsendpoints.mjs {{TARGET}} /
node layers/hunt/scripts/sqli-time.mjs "{{TARGET}}/item?id=1"
node layers/hunt/scripts/bypass403.mjs {{TARGET}} /admin
```

## 铁律（每条都踩过）

1. **域名先验证**：表单/截图里的域名常被 OCR 弄错，先 nslookup。
2. **长度抖动不是注入**：含时间戳/推荐位时长度差 ±100 属噪声，以时间盲注为准。
3. **`*.php.bak` 可能是假阳性**：响应里有 `PATH_INFO => .bak` 就是 PATH_INFO 复用，不是备份泄露。
4. **全站 `*.php` 403** 说明上传点难解析；**连 favicon 都 403** 是整站 IP 白名单，换目标。
5. **双因子绑定的查询接口不可枚举**（邮箱+单号双匹配），早收手。
6. **验证码会话按序配对**：第 i 个 cookie 配第 i 张码，错位 = 全批失败。
7. **读报错优先级反推逻辑**：字段留空不报「XX不能为空」而进入下一校验 ⇒ 该字段可省略（2FA 绕过线索）。
8. **等级与证据匹配**：没进后台只报中危；虚报降级。
9. **多主机同构合并一条**，拆条判重复。
10. **只证明存在**：读到 1 条即停，不 dump、不写入、不留后门。

## 提交阶段

用 `layers/hunt/references/report-template.md`。三条硬约束：第 8 项不写 URL/IP/路径；截图两张（复现 + 归属证明，官网页脚公司全称 + ICP + 公安备案同框）；PoC 只证明存在。