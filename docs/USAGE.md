# 使用手册

## 一次完整作业的推进顺序

### 0. 门禁（跳过这步的作业一律作废）

读 `references/00-law-and-scope.md`，逐条确认：目标在授权范围内、禁止项清楚、时间窗明确、数据处置有约定。任一条不满足就停。

### 1. 侦察

```bash
nslookup TARGET
curl -s "https://crt.sh/?q=%25.TARGET&output=json" -o crt.json
node scripts/probe.mjs hosts.txt hosts.json
node scripts/jsendpoints.mjs https://HOST /
```

产出 `hosts.json`，按「登录页 > 上传页 > API > 静态站」排序，后面按这个顺序打。

### 2. 检测（先打不需要账号的）

顺序：遗留文件/配置暴露 → 认证缺陷 → 注入 → 文件/SSRF/业务逻辑 → 基础设施 → 框架专项。逐项对照 `references/02-web-checklists.md` 的判据与误报陷阱。

### 3. 拿到账号后（越权是价值高地）

优先打：订单/合同/发票详情、导出接口、打印/PDF 渲染、会员资料、审批流。**读到 1 条即停**，证明即可。

### 4. 报告

用 `references/05-report-template.md`。三条硬约束：第 8 项不写 URL；截图两张（复现 + 归属证明）；PoC 只证明存在。

## 脚本速查

| 脚本 | 用途 | 关键参数 |
|---|---|---|
| `probe.mjs` | 主机存活 + 标题指纹 | `hosts.txt out.json [并发]` |
| `jsendpoints.mjs` | 提取接口/密钥/sourcemap | `https://HOST [页面路径]` |
| `sqli-time.mjs` | 时间盲注存在性 | `"URL" [延时秒] [轮次]` |
| `bypass403.mjs` | 403 绕过矩阵 | `https://HOST /路径` |
| `captcha-montage.ps1` | 批量取码拼图 | `-Count 12 -Out cap12.png` |

## 与 dsh-purge 组合时的用法

装好 dsh-purge 并启用其演练台后，可在同一会话里：

- 用演练台的事实库记录资产、漏洞与状态；
- 用红队角色分工（侦察/利用/报告）并行推进；
- 技能本身不依赖演练台，单独使用不受影响。

> 组合部署时注意：dsh-purge 会改写系统提示词与工具行为，若出现异常，先禁用其条目回归干净状态再排查。
