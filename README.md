# dsh-hole

> DSH 授权渗透技能包（skill + 插件封装）。把一次真实的多租户 SaaS/ERP 渗透复盘，沉淀成**可复用、可执行、可提交**的方法论工具包。

**前提**：仅用于**合法授权**目标（平台项目页列出的资产、书面授权、自有系统/靶场）。技能第一章就是法律边界门禁，未授权目标只允许公开信息检索。

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)](package.json)

---

## 这是什么

一个 DSH 插件 + 技能包。装上之后，DSH 里多出一个叫 `hole` 的技能，包含：

| 模块 | 内容 |
|---|---|
| `references/00-law-and-scope.md` | 法律红线（刑法 285/286/253 条对应行为）、授权核验清单、数据最小化五原则 |
| `references/01-recon.md` | 证书透明度枚举、指纹判读、路径字典、JS 挖接口与 sourcemap |
| `references/02-web-checklists.md` | 八大攻击面检测清单，每组「探针 → 判据 → 误报陷阱 → 修复方向」 |
| `references/03-framework-fingerprints.md` | ThinkPHP/Laravel/CI/Spring/Shiro/UEditor 等指纹与检测点 |
| `references/04-captcha-and-auth-bypass.md` | 验证码对抗、报错反推服务端逻辑、JWT/会话/参数污染 |
| `references/05-report-template.md` | 国内 SRC 通用 14 项报告模板 + 提交前自检 |
| `scripts/probe.mjs` | 主机存活与指纹批量探测 |
| `scripts/jsendpoints.mjs` | 页面/JS 提取接口、密钥特征、sourcemap 检测 |
| `scripts/sqli-time.mjs` | 时间盲注存在性验证（只读、低频） |
| `scripts/bypass403.mjs` | 403 绕过 header 与路径矩阵 |
| `scripts/captcha-montage.ps1` | 批量取码拼图，一次识别 |

## 安装

### 方式 A：作为 DSH 插件（推荐）

```bash
git clone https://github.com/jiuan-9/dsh-hole.git
cd dsh-hole
npm install          # 触发 postinstall，自动安装技能
# 或手动执行
node bin/dsh-hole.js install
```

安装动作 = 把 `skills/hole` 同步到 `$DSH_HOME/skills/hole`（默认 `~/.dsh/skills/hole`），并在目录里写入版本戳。**不修改系统提示词、不注入任何服务**。

重启 DSH，或在 catalog 刷新后，用 `skill` 工具加载：

```
skill({ name: "hole" })
```

### 方式 B：手动拷贝（任何 DSH 版本都可用）

```bash
# Linux / macOS
mkdir -p ~/.dsh/skills && cp -r skills/hole ~/.dsh/skills/

# Windows PowerShell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.dsh\skills" | Out-Null
Copy-Item -Recurse -Force skills\hole "$env:USERPROFILE\.dsh\skills\"
```

> `$DSH_HOME` 若被自定义，按实际路径放即可。

### 方式 C：给 Codex / Claude / Cursor 等其它 agent 用

不需要装 DSH。直接让 agent 读技能文件即可：

```
# 仓库地址
https://github.com/jiuan-9/dsh-hole

# 让 agent 加载
读取 skills/hole/SKILL.md 并按其索引逐章加载 references/ 下的分册
```

```bash
# 或者只取技能目录
git clone --depth 1 https://github.com/jiuan-9/dsh-hole.git
cp -r dsh-hole/skills/hole /your/project/.agents/skills/
```

> `.agents/skills/` 与 `.dsh/skills/` 都是 DSH `skill-filesystem` 的默认发现根，项目级技能放这里即生效。

### 方式 D：与 dsh-purge 组合

本包**不包含** dsh-purge 的代码，只把它声明为可选 peer 依赖。需要演练台时先装它：

```bash
npm install dsh-purge    # 或按 dsh-purge 自己的 README 安装
```

然后在 `cordis.patch.yml` 里取消注释对应的 dsh-purge 条目（文件内已给出可直接用的片段）。两个插件互不依赖，单独装哪个都能跑。

## 用法

加载技能后，按索引走：

```
1. 读 references/00-law-and-scope.md —— 授权核验清单逐条打勾，不满足就停
2. 读 references/01-recon.md —— 资产测绘，产出 hosts.json
3. 按 references/02-web-checklists.md 的顺序打（先打不用账号的）
4. 指纹对上后进 references/03-framework-fingerprints.md 打专项
5. 遇到验证码/2FA 进 references/04-captcha-and-auth-bypass.md
6. 写报告用 references/05-report-template.md
```

脚本直连使用（不依赖 DSH）：

```bash
node skills/hole/scripts/probe.mjs hosts.txt hosts.json
node skills/hole/scripts/jsendpoints.mjs https://example.com /
node skills/hole/scripts/sqli-time.mjs "https://example.com/item?id=1"
node skills/hole/scripts/bypass403.mjs https://example.com /admin
pwsh -File skills/hole/scripts/captcha-montage.ps1 -Count 12
```

## 卸载

```bash
node bin/dsh-hole.js uninstall
# 或直接删除
rm -rf ~/.dsh/skills/hole
```

## 为什么不直接合并 dsh-purge 的代码

dsh-purge 是 Apache-2.0 的独立大插件（约 500KB+，含提示词注入、演练台、事实库、HTTP 桥）。本包选择**peer 依赖 + 配置片段**而不是 vendor 复制，原因：

1. **升级不脱节**：dsh-purge 迭代快，复制会锁死在某一版本；
2. **职责单一**：本包只负责「技能安装」，不改系统提示词、不劫持工具，出问题不会拖垮宿主；
3. **许可清晰**：不复制即不产生衍生作品边界问题，只保留致谢与 NOTICE。

需要「一键全装」时，装完本包再 `npm install dsh-purge` 即可，两个插件在 DSH 里可同时启用。

## 致谢与许可

- 本仓库技能内容（references/scripts）为原创，依据两次真实授权的企业级 SaaS 渗透复盘沉淀。
- 插件脚手架约定（`$DSH_HOME/skills/<id>/SKILL.md` 布局、`cordis.patch.yml` 的 `insert` 声明、启动期不抛错）参考了 [dsh-purge](https://github.com/YuJunZhiXue/dsh-purge) 的公开实现，该项目为 Apache-2.0。
- 本仓库以 **Apache-2.0** 发布，全文见 [LICENSE](LICENSE)，归属声明见 [NOTICE](NOTICE)。

## 免责声明

本项目仅供**合法授权的安全测试、自有系统评估与安全教学**使用。使用者须自行确保对目标拥有明确授权；未授权访问计算机信息系统、获取数据、破坏系统功能在中国及多数司法辖区均构成刑事犯罪。作者不对任何滥用行为承担责任。
