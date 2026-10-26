# 发布到 GitHub（三步）

仓库已初始化并完成首次提交（`f4cd281`），本地可直接推。**当前环境没有 GitHub 凭据**（无 gh CLI、无 token、无 SSH key），所以最后一步需要你执行。

## 1. 创建远端仓库

浏览器打开 https://github.com/new

- Repository name: `dsh-hole`
- Public（**不要**勾选 Add README / .gitignore / license，否则会与本地冲突）
- Create repository

## 2. 关联并推送

```bash
cd dsh-hole
git remote add origin https://github.com/jiuan-9/dsh-hole.git
git branch -M main
git push -u origin main
```

首次推送会要求认证：用 **Personal Access Token**（Settings → Developer settings → Personal access tokens → Fine-grained，勾 `Contents: Read and write`）当密码，或提前配好 SSH key。

## 3. 验证下载地址

推送成功后，下面两个地址立即可用：

```
https://github.com/jiuan-9/dsh-hole
https://github.com/jiuan-9/dsh-hole.git
```

- **DSH 安装**：`git clone https://github.com/jiuan-9/dsh-hole.git && cd dsh-hole && npm install`
- **Codex / 其它 agent**：直接读 `https://raw.githubusercontent.com/jiuan-9/dsh-hole/main/skills/hole/SKILL.md`
- **不装 git 也能拿**：`https://github.com/jiuan-9/dsh-hole/archive/refs/heads/main.zip`

## 备用：不走 git

仓库同级已生成 `dsh-hole-v1.0.0.zip`（48KB），可在 GitHub 网页端 **Add file → Upload files** 直接拖入解压后的目录。但这样会丢失提交历史，建议用上面的 git 流程。

## 推送后建议

- 在 repo 设置里加 Topics：`dsh` `dsh-plugin` `skill` `pentest` `security`
- 打标签：`git tag -a v1.0.0 -m "v1.0.0" && git push --tags`
- 如需 CI 校验技能格式，可加一个 workflow 跑 `node --check` 与 SKILL.md frontmatter 校验
