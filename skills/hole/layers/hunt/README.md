# 挖掘层（hunt）

前置：`layers/guard/target.mjs check` 必须通过。命令模板里的 `{{TARGET}}` `{{TARGET_HOST}}` `{{RATE}}` `{{EVIDENCE_DIR}}` 由 target 工具注入，不要手工替换。

## 分册索引

| 分册 | 内容 | 何时读 |
|---|---|---|
| `references/00-research-basis.md` | OWASP Top10:2025 / WSTG / CWE Top25 / NIST 800-115 / ISO 29147 对照，及每条做法的出处 | 写报告引标准时 |
| `references/01-recon.md` | 被动情报（CT 日志/历史 DNS/备案）、指纹判读、路径字典、JS 挖接口与 sourcemap | 开工第一步 |
| `references/02-web-checklists.md` | 八大攻击面：认证 / 授权 / 注入 / 文件 / SSRF / 业务 / 前端 / 基础设施 | 主体作业 |
| `references/03-framework-fingerprints.md` | ThinkPHP / Laravel / CI / Spring / Shiro / UEditor / 面板 | 指纹对上后 |
| `references/04-captcha-and-auth-bypass.md` | 验证码识别流水线、报错反推、JWT/会话/参数污染 | 撞到登录墙时 |
| `references/report-template.md` | 14 项报告模板 + 提交前自检 | 收尾 |

> 法律与授权判定不在这里，在 `layers/guard/law-cn.md`。挖掘层默认你已经过了门禁。

## 脚本

| 脚本 | 用途 | 典型调用 |
|---|---|---|
| `scripts/probe.mjs` | 存活 + 标题指纹 | `node scripts/probe.mjs hosts.txt hosts.json 15` |
| `scripts/jsendpoints.mjs` | 提取接口 / 密钥 / sourcemap | `node scripts/jsendpoints.mjs {{TARGET}} /` |
| `scripts/sqli-time.mjs` | 时间盲注存在性（只读） | `node scripts/sqli-time.mjs "{{TARGET}}/item?id=1" 3 3` |
| `scripts/bypass403.mjs` | 403 绕过矩阵 | `node scripts/bypass403.mjs {{TARGET}} /admin` |
| `scripts/captcha-montage.ps1` | 批量取码拼图 | `pwsh -File scripts/captcha-montage.ps1 -Count 12` |

## 作业顺序（先打不需要账号的）

1. 遗留文件与配置暴露（命中率最高、过审最稳）
2. 认证缺陷（无锁定 / 必填可空 / 验证码强度）
3. 越权与 IDOR（需账号，价值最高）
4. 注入（时间盲注定性）
5. 文件 / SSRF / 业务逻辑
6. 基础设施（403 / Host / CORS / 子域接管）
7. 框架专项（指纹对上再打）

## 交付

证据落 `{{EVIDENCE_DIR}}`；报告用 `references/report-template.md`；**第 8 项禁止出现 URL/IP/路径**。
