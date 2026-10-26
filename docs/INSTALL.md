# 安装指引

## 前置

- Node.js >= 18
- 已安装 DSH（桌面版或 CLI 均可）
- 知道自己的 `$DSH_HOME`：默认 `~/.dsh`，Windows 为 `C:\Users\<你>\.dsh`

## 三种安装路径

### 1. 插件方式（推荐）

```bash
git clone https://github.com/jiuan-9/dsh-hole.git
cd dsh-hole
npm install
```

`postinstall` 会执行 `node bin/dsh-hole.js install --quiet`，把 `skills/hole` 同步到 `$DSH_HOME/skills/hole`。

校验：

```bash
node bin/dsh-hole.js status
# {
#   "dshHome": "C:\\Users\\you\\.dsh",
#   "pkgVersion": "1.0.0",
#   "installed": "1.0.0",
#   "present": true
# }
```

### 2. 纯手动

```powershell
# Windows
New-Item -ItemType Directory -Force "$env:USERPROFILE\.dsh\skills" | Out-Null
Copy-Item -Recurse -Force .\skills\hole "$env:USERPROFILE\.dsh\skills\"
```

```bash
# Linux / macOS
mkdir -p ~/.dsh/skills && cp -r ./skills/hole ~/.dsh/skills/
```

### 3. 项目级安装（只对某个工作目录生效）

```bash
mkdir -p .agents/skills && cp -r skills/hole .agents/skills/
```

`.agents/skills/` 与 `.dsh/skills/` 同属 `skill-filesystem` 的默认发现根。项目级优先，适合团队各自维护。

## 生效与验证

1. 重启 DSH（或触发 catalog 刷新）；
2. 在会话里调用 `skill({ name: "hole" })`；
3. 返回内容以 `# hole — 授权渗透方法论` 开头即安装成功。

## 常见问题

| 现象 | 原因 | 处理 |
|---|---|---|
| catalog 里没有 hole | 未重启 / 放错目录 | 确认 `$DSH_HOME/skills/hole/SKILL.md` 存在；重启 DSH |
| 加载报 name 不匹配 | 目录名必须是 kebab-case | 目录必须叫 `hole`，不能是 `Hole` 或 `洞` |
| 插件启用后宿主报错退出 | cordis.patch.yml 里启用了未安装的 dsh-purge 条目 | 只保留 `dsh-hole` 条目，或在装完 dsh-purge 后再启用 |
| 升级后内容没变 | 版本戳未变被跳过 | `node bin/dsh-hole.js install --force` |

## 卸载

```bash
node bin/dsh-hole.js uninstall
rm -rf ~/.dsh/dsh-hole-backups   # 可选：清掉历史备份
```

