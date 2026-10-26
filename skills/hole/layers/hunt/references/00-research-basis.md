# 研究依据（本技能的每一条做法都有出处）

> 原则：不发明方法论。能用权威框架的地方就用框架，只在框架没覆盖的地方写实战经验，并标明「实战」字样。

## 一、安全测试框架

### OWASP Top 10:2025（当前版本，2025 发布）
来源：https://github.com/OWASP/Top10/tree/master/2025 · https://top10.owasp.org

| 编号 | 类别 | 本技能对应章节 |
|---|---|---|
| A01:2025 | Broken Access Control | `02` 第 2 章（越权/IDOR） |
| A02:2025 | Security Misconfiguration | `02` 第 4 章（遗留文件/调试/面板）、第 7 章 |
| A03:2025 | Software Supply Chain Failures | `02` 第 8 章（供应链，新增） |
| A04:2025 | Cryptographic Failures | `02` 第 9 章（弱加密，新增） |
| A05:2025 | Injection | `02` 第 3 章 |
| A06:2025 | Insecure Design | `02` 第 5 章（业务逻辑） |
| A07:2025 | Authentication Failures | `02` 第 1 章 |
| A08:2025 | Software or Data Integrity Failures | `02` 第 3.4（反序列化）、第 8 章 |
| A09:2025 | Security Logging and Alerting Failures | `02` 第 10 章（新增：无日志/无告警本身就是漏洞） |
| A10:2025 | Mishandling of Exceptional Conditions | `02` 第 11 章（异常处理，新增） |

**关键变化**：2025 版把 **A01 Broken Access Control 排到第一**（越权超过注入成为头号风险），并新增 **A03 供应链**、**A10 异常条件处理**。本技能的攻击面顺序据此调整：越权优先于注入。

### OWASP WSTG（Web Security Testing Guide, Latest）
来源：https://github.com/OWASP/www-project-web-security-testing-guide/tree/master/latest

| 章节 | 测试域 | 对应本技能 |
|---|---|---|
| 4.1 | Information Gathering | `01-recon.md` |
| 4.2 | Configuration and Deployment Management | `02` 第 4 章 |
| 4.3 | Identity Management | `02` 第 1.3（用户枚举） |
| 4.4 | Authentication | `02` 第 1.1-1.4、`04` 全篇 |
| 4.5 | Authorization | `02` 第 2 章 |
| 4.6 | Session Management | `02` 第 1.5 |
| 4.7 | Injection | `02` 第 3 章 |
| 4.8 | Error Handling | `02` 第 11 章 |
| 4.9 | Weak Cryptography | `02` 第 9 章 |
| 4.10 | Business Logic | `02` 第 5 章 |
| 4.11 | Client-side | `02` 第 6 章 |
| 4.12 | API Testing | `02` 第 12 章（新增） |
| 4.13 | WebAssembly Testing | `02` 第 12 章末（简述） |

### CWE Top 25 (2025)
来源：https://cwe.mitre.org/top25/archive/2025/2025_cwe_top25.html

前三位：**CWE-79 XSS、CWE-89 SQL 注入、CWE-352 CSRF**。用途：给每个发现标注 CWE 编号，报告更专业、也便于厂商研发对照修复（多数研发团队按 CWE 建缺陷库）。

常用映射：
| 发现类型 | CWE |
|---|---|
| 越权/IDOR | CWE-639 / CWE-284 |
| 调试文件/配置暴露 | CWE-200 / CWE-489（遗留调试代码） |
| 无失败锁定 | CWE-307 |
| 验证码可自动化 | CWE-804 |
| 路径穿越 | CWE-22 |
| 反序列化 | CWE-502 |
| SSRF | CWE-918 |
| 上传 getshell | CWE-434 |

### NIST SP 800-115 / PTES
- NIST SP 800-115《Technical Guide to Information Security Testing and Assessment》：四阶段（规划 → 发现 → 攻击 → 报告后处置）。本技能的「防御层 → 侦察 → 挖掘 → 报告」即此结构的落地。
- PTES：把「情报收集 / 威胁建模 / 漏洞分析 / 利用 / 后渗透 / 报告」拆成可交付阶段，本技能的 hunt 分册顺序与之对齐。

### 漏洞披露标准
- **ISO/IEC 29147**（漏洞披露）：厂商侧应提供接收渠道、确认时限、公开协调。
- **ISO/IEC 29150**（漏洞处理）——报告里引用这两条，能显著提高厂商对「这不是找麻烦」的接受度。
- **《网络产品安全漏洞管理规定》**（工信部/网信办/公安部，2021-09-01 施行）：中国境内漏洞报送的法定框架，明确「不得在未修复前发布可被利用的细节」。这是 guard 层「不公开 PoC 细节」的法律依据。

## 二、Agent / 提示工程规范

### Agent Skills Spec（Anthropic）· 三级渐进披露
来源：https://mintlify.wiki/anthropics/skills/spec/loading-system

| 级别 | 内容 | 规格 | 本技能实现 |
|---|---|---|---|
| L1 元数据 | name + description | **50-200 词**，常驻上下文，仅用于「是否加载」 | SKILL.md frontmatter（英文，可被检索） |
| L2 正文 | SKILL.md | **< 500 行**，触发时加载 | SKILL.md 约 60 行，只做路由 |
| L3 资源 | `scripts/` `references/` `assets/` | 按需加载，脚本可不入上下文直接执行 | 6 分册 + 5 脚本 |

**设计推论**：SKILL.md 越短越稳（模型不会被长文淹没）；把判据、清单、模板全部下沉到 references；把「必须执行的动作」写成 scripts，用退出码而非文字约束模型。

### 提示工程权威实践
- **Anthropic《Claude Prompting Best Practices》**：用 XML/标签化结构分隔指令段、给正反例、明确「不要做什么」、把长文档放前面指令放后面。
- **OpenAI《GPT-5 Prompting Guide / Prompt Optimization Cookbook》**：显式约束优于隐含期待；减少相互矛盾的指令；用结构化清单替代长段落。
落地到 `break/compose.md`：L0-L3 四层分段 + 每层单一职责 + 硬约束写成可判定条件。

### 语言效应（实测研究）
- arXiv 2604.14210（2026）：SWE-bench Lite 上，**中文提示词的成功率整体低于英文**，各模型一致；token 成本因架构而异（MiniMax 中文贵 1.28x，GLM-5 中文更省）。
- 跨语言检索评测（BrowseComp-Plus 系列）：非英文语境下 agent 表现下降，直接给证据也无法完全追平。
落地：元数据用英文、硬约束用英文关键词、正文按目标模型语言分档（见 `break/compose.md` 第六节）。

## 三、实战经验（非文献，标注来源）

以下条目来自本项目两次真实授权作业的复盘，没有现成文献，标为「实战」：

| 条目 | 类型 |
|---|---|
| `*.php.bak` 的 PATH_INFO 假阳性识别法 | 实战 |
| 页面长度抖动导致注入误判 → 以时间盲注为准 | 实战 |
| 读报错优先级反推服务端校验顺序（2FA 可空） | 实战 |
| 验证码会话按序配对（拼图识别法） | 实战 |
| 403 主机连 favicon 都挡 = 整站 IP 白名单 | 实战 |

> 写作规则：报告里凡引用框架，标框架名 + 版本；凡属实战经验，不冒充标准。
