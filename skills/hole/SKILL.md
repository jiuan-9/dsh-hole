---
name: hole
description: Authorized web pentest playbook — legality gate, recon, per-surface vuln checklists, framework fingerprints, captcha/auth bypass, runnable probe scripts, and a 14-field Chinese SRC report template. Load when hunting real, submittable vulnerabilities.
---

# hole — 授权渗透方法论

**唯一前提**：不违反中国法律。开工前必读 `references/00-law-and-scope.md`，逐条打勾授权核验清单。未授权目标只允许公开信息检索。

## 快速开始（30 分钟跑通一轮）

```bash
# 1. 核对目标真实存在（OCR 抄错域名是最常见开局事故）
nslookup DOMAIN

# 2. 资产测绘：证书透明度枚举子域
curl -s "https://crt.sh/?q=%25.DOMAIN&output=json" -o crt.json

# 3. 批量探活 + 取标题（标题直接暴露系统类型与租户名）
node scripts/probe.mjs hosts.txt hosts.json

# 4. 对每个存活主机提接口与密钥
node scripts/jsendpoints.mjs https://HOST /

# 5. 403 主机先判是否整站白名单（连 favicon 都 403 就换目标）
node scripts/bypass403.mjs https://HOST /admin
```

## 目录结构

```
hole/
├── SKILL.md                              ← 本文件（索引 + 铁律）
├── references/
│   ├── 00-law-and-scope.md               ← 法律红线、ROE、授权核验、数据最小化
│   ├── 01-recon.md                       ← 被动情报、指纹判读、路径字典、JS 挖接口
│   ├── 02-web-checklists.md              ← 认证/授权/注入/文件/SSRF/业务/前端/基础设施
│   ├── 03-framework-fingerprints.md      ← ThinkPHP/Laravel/CI/Spring/Shiro/UEditor 等
│   ├── 04-captcha-and-auth-bypass.md     ← 验证码对抗、报错反推、JWT/会话/参数污染
│   └── 05-report-template.md             ← 14 项报告模板 + 提交前自检
└── scripts/
    ├── probe.mjs                         ← 存活+指纹批量探测
    ├── jsendpoints.mjs                   ← 页面/JS 提取接口与密钥 + sourcemap 检查
    ├── sqli-time.mjs                     ← 时间盲注存在性验证（只读、低频）
    ├── bypass403.mjs                     ← 403 绕过 header 与路径矩阵
    └── captcha-montage.ps1               ← 批量取码拼图，一次识别
```

## 打法顺序（按此序，先打不用账号的）

1. **遗留文件与配置暴露** → `02` 第 4 章 / `01` 路径字典。命中率最高、过审最稳。
2. **认证缺陷** → `02` 第 1 章 + `04`。无锁定、必填可空、验证码强度。
3. **越权/IDOR** → `02` 第 2 章。需账号，价值最高。
4. **注入** → `02` 第 3 章 + `scripts/sqli-time.mjs`。
5. **文件类 / SSRF / 业务逻辑** → `02` 第 4-5 章。
6. **基础设施** → `02` 第 7 章 + `scripts/bypass403.mjs`。
7. **框架专项** → `03`，指纹对上再打，不要盲撒 payload。

## 铁律（每一条都是踩过的坑）

1. **域名先验证再开工**。表单/截图里的域名常被 OCR 弄错（实例：`www.meiyoux.com` 实为 `www.meiyouwx.com`），前者 NXDOMAIN，白跑一小时。
2. **页面长度抖动不是注入**。含时间戳/推荐位时长度差 ±100 属噪声，**一切以时间盲注为准**（基线 70ms vs 命中 3000ms）。
3. **`*.php.bak` 可能是假阳性**。若响应里有 `PATH_INFO => .bak`，那是 nginx 复用了 `test.php`，不是备份泄露。反向看，这也说明 `.php/任意后缀` 会执行 → 有上传点即解析绕过。
4. **全站 `*.php` 统一 403** 说明上传点难直接解析，别死磕上传；**连 favicon 都 403** 是整站 IP 白名单，立刻换目标。
5. **双因子绑定的查询接口不可枚举**（邮箱+订单号双匹配），改单号一律「不存在」，早收手。
6. **验证码会话必须按序配对**：第 i 个 cookie 配第 i 张码，错位 = 全批失败。
7. **读报错优先级反推服务端逻辑**：某字段留空不报「XX不能为空」而直接进入下一校验 ⇒ 该字段可省略（2FA 绕过线索），比猜口令值钱得多。
8. **等级与证据强度必须匹配**：没进后台只报中危；虚报降级并影响后续可信度。
9. **多主机同构问题合并一条**，拆条刷量判重复。
10. **只证明存在**：读到 1 条记录即停，不 dump、不写入、不留后门。

## 提交阶段

写报告前先读 `references/05-report-template.md`。硬约束：
- **第 8 项「简要描述」禁止出现 URL / IP / 路径 / 参数值**，违反会被退回；
- **截图两张是驳回线**：①完整复现过程（地址栏可见）②厂商归属证明（官网页脚公司全称 + ICP + 公安备案三者同框）；
- **归属快速定位**：公安联网备案号前 6 位即行政区划代码（如 `350203` → 福建省厦门市思明区），用于第 13 项；
- **PoC 只证明存在**：不导出业务数据、不写入、不删除；涉口令脚本只用固定错误口令并注释声明。

## 与其它 skill 的配合

- 要出文档/表格：先加载 `office`；
- 要发披露邮件：加载 `agently-mail`；
- 写报告正文时用本 skill 的模板，导出 PDF 用 `office-export-pdf`。
