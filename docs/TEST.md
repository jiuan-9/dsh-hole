# 测试指引（安装后怎么验）

## 一、一条命令跑完（推荐）

```bash
cd <安装目录>/dsh-hole
node scripts/selftest.mjs
```

期望输出结尾：

```
========================================================
ALL PASS   35/35
```

加 `--verbose` 看每一步的实际输出。失败时会打印退出码与前 8 行输出。

**外部目标只有 `example.com`**（公共示例域），其余全部在系统临时目录里跑，不访问任何真实业务系统。

## 二、35 项检查覆盖什么

| 组 | 项数 | 验证内容 |
|---|---|---|
| 1 安装状态 | 2 | CLI 可执行、`$DSH_HOME/skills/hole` 已安装且版本与包一致 |
| 2 文件完整性 | 3 | 20 个必备文件齐全、frontmatter 合法、SKILL.md < 500 行 |
| 3 guard 门禁 | 13 | 模板默认必失败、填字段后通过、host 越界被拒、`allow_dos` 被拒、env/render 占位符正确 |
| 4 break 装配 | 8 | build 产出含 L1 的 prompt、inspect 可通过、log 落盘、**门禁不过时 build 退出码 2** |
| 5 hunt 脚本 | 5 | probe 拿到 200+标题、jsendpoints 可提取、sqli-time 正确判定「无信号」（误报检测）、bypass403 可运行 |

## 三、手动三步验证（想看清每层行为时用）

### 第 1 步：防御层

```bash
cd skills/hole/layers/guard
node target.mjs init
node target.mjs check          # 期望：[FAIL] 退出码 1 —— 模板未填就该失败
node target.mjs set authorization.reference=https://example.com/policy
node target.mjs set target.host=demo.example.com
node target.mjs set target.scope=example.com
node target.mjs check          # 期望：[PASS] READY
node target.mjs env            # 期望：export TARGET=https://demo.example.com ...

# 越界测试：必须被拒
node target.mjs set target.host=evil.example.net
node target.mjs check          # 期望：[FAIL] host 不在 scope 内
```

### 第 2 步：破甲层

```bash
cd ../break
node adapter.mjs build --profile cn-model --task pentest --out prompt.md
# 期望：[ok] prompt -> ... 并显示挂载的 dsh-purge 资产路径
node adapter.mjs inspect --file prompt.md
# 期望：L0/L1/L2/L3 全部 present，refusal-marker: none
node adapter.mjs log --profile cn-model --task pentest --refusal 0 --note 手动验证
# 期望：[ok] logged -> .cache/eval.jsonl，文件里多一行 JSON
```

### 第 3 步：挖掘层

```bash
cd ../hunt/scripts
printf "example.com\n" > hosts.txt
node probe.mjs hosts.txt hosts.json
# 期望：example.com | 200 | cloudflare | ... | Example Domain
node jsendpoints.mjs https://example.com /
node sqli-time.mjs "https://example.com/?id=1" 2 1
# 期望：no time-based signal（这是误报检测：不该乱报注入）
node bypass403.mjs https://example.com /admin
```

## 四、在 DSH 会话里验证技能本身

```
skill({ name: "hole" })
```
返回内容以 `# hole — 三层结构` 开头即加载成功。若 catalog 里没有 `hole`，先检查 frontmatter：

```bash
node scripts/verify-manifest.mjs   # 会顺带做 YAML 解析校验
```

> 踩过的坑：`description:` 里出现未加引号的 `: ` 会让 YAML 解析失败，技能直接从 catalog 消失。遇到这种情况给 description 加双引号。

## 五、真实目标怎么测（合规前提）

1. 必须有授权（平台项目页 / 书面授权 / 自有靶场），并在 `target.json` 的 `authorization.reference` 写清楚；
2. 把 `target.scope` 填成授权范围，`out_of_scope` 填第三方（支付网关、CDN、SaaS）；
3. `max_rps` 保持 2，不要调高（`> 5` 会被硬拒）；
4. 先跑 `check`，PASS 之后再执行 hunt 层脚本；
5. 证据落 `evidence.dir`，报告用 `references/report-template.md`。

## 六、常见失败与处理

| 现象 | 原因 | 处理 |
|---|---|---|
| selftest 第 1 组失败 | 未安装或版本不一致 | `node bin/dsh-hole.js install --force` |
| frontmatter 失败 | 引号/缩进问题 | `node scripts/verify-manifest.mjs` 看具体错误 |
| build 退出 2 | 门禁未过 | 先 `target.mjs check`，按提示补字段 |
| probe 报文为空 | 网络或代理 | 换 `example.com` 复测，确认脚本本身没问题 |
| 技能不在 catalog | YAML 解析失败 | 见第四节，给 description 加引号 |
