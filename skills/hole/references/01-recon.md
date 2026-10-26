# 侦察分册（被动优先，主动克制）

## 一、被动情报（零接触，永远合法）

```bash
# 1. 证书透明度：子域最全的来源，多租户 SaaS 必暴露测试/演示/开放平台
curl -s "https://crt.sh/?q=%25.DOMAIN&output=json" -o crt.json
# 去重取主机名
node -e "JSON.parse(require('fs').readFileSync('crt.json')).forEach(x=>x.name_value.split(/\n/).forEach(n=>console.log(n.trim().toLowerCase())))" | sort -u

# 2. 历史 DNS / 源站探测（绕过 CDN）
#    - 证书 SAN、邮件头 Received、SPF 记录、旧解析记录
curl -s "https://dns.google/resolve?name=DOMAIN&type=MX"
curl -s "https://dns.google/resolve?name=DOMAIN&type=TXT"

# 3. 备案与归属（写报告第 13 项直接用）
#    官网页脚 ICP/公安备案号；公安备案号前 6 位 = 行政区划代码
```

> 提示：`crt.sh` 会漏掉纯内网/自签证书资产，配合 `dnsdumpster`、`virustotal` 的 passive DNS 交叉比对。

## 二、存活探测与指纹（并发，别用 curl 循环）

用 `scripts/probe.mjs`：输入主机列表，输出 `状态码 / server / title / location`。
```bash
node scripts/probe.mjs hosts.txt out.json
```
判读要点：
- **title 直接暴露业务**：`XX旅行社-登录` → 多租户 ERP 实例；`管理员登录` → CMS 后台；`404/403` 统一页面 → 说明走同一 vhost 规则。
- **server 头**：`openresty` 常见于反代/网关；`nginx` + 自研路由 → 自研框架。
- **302 到 /login?refer=** → 存在鉴权中间件，未登录面有限。
- **同 IP 多子域** → 试 Host 头跨租户；返回 403 说明 vhost 隔离正常，停止。
- **subdomain 连 favicon 都 403** → 整站 IP 白名单，换目标。

## 三、路径与接口发现

```bash
# 目录/文件爆破（注意速率，授权项目按约定）
ffuf -u https://HOST/FUZZ -w WORDLIST -t 10 -rate 20 -mc 200,204,301,302,403 -fs 0
```
**按系统类型选字典**，不要一把通用字典打到底：
| 系统 | 优先路径 |
|---|---|
| 自研 PHP MVC（`/core/*`） | `/core/Login/{index,doLogin,code}`、`/core/{Order,Export,Upload,Print}/*` |
| CodeIgniter（`csrf_token_xw`） | `/application/config/database.php`、`/system/`、`/index.php/{cp,member}` |
| 通用遗留 | `test.php  info.php  phpinfo.php  env.php  cron.php  debug.php  install.php` |
| 源码泄露 | `.git/HEAD .git/config .svn/entries .env Dockerfile docker-compose.yml *.php.bak *.zip *.sql` |
| 编辑器 | `/ueditor/php/controller.php`、`/kindeditor/php/file_manager_json.php`、`/fckeditor/` |
| 面板 | `/phpmyadmin/ /pma/ /adminer.php /dbadmin/` |

> **假阳性陷阱**：`/test.php.bak` 返回 200 且内容与 `/test.php` 相同，是 nginx PATH_INFO 复用了 `test.php`，不是备份泄露。看响应里 `PATH_INFO => .bak` 即可识破。反之，这说明 `.php/任意后缀` 都会执行 —— 若存在上传点即解析绕过。

## 四、JS 里挖接口与密钥

```bash
node scripts/jsendpoints.mjs https://HOST page.html
```
输出：`/api/...` 风格端点、`url:`/`fetch(`/`$.ajax` 调用、以及密钥特征（`LTAI\w+` 阿里云 AK、`AKIA[0-9A-Z]{16}` AWS、`appsecret|app_key|token|smtp`）。
另外必查：**sourcemap**（`*.js.map` 存在 = 完整源码泄露，含接口注释与内部域名）。

## 五、侦察产出物（直接喂给后续章节）

| 产出 | 用途 |
|---|---|
| hosts.json（状态/标题/server） | 定优先级：登录页 > 上传页 > API > 静态站 |
| 系统指纹表 | 选对应的漏洞 checklist（见 `02-web-checklists.md`） |
| 端点清单 | 直接进未授权访问与 IDOR 测试 |
| 归属信息（备案号/主体） | 报告第 1、13 项与归属证明截图 |
