#!/usr/bin/env node
/** verify-manifest.mjs —— 模拟 DSH 插件管理器的清单校验 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = path.join(root, 'package.json');
const errs = [];
const warns = [];
let pkg;
try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); } catch (e) { console.error('[FAIL] package.json 解析失败: ' + e.message); process.exit(1); }

if (!pkg.name) errs.push('name 缺失');
if (!pkg.version) errs.push('version 缺失');
if (!pkg.dsh) errs.push('缺少 dsh 字段：插件管理器需要 dsh.bundle.patch 才能识别为组合包');
else {
  const patch = pkg.dsh.bundle && pkg.dsh.bundle.patch;
  if (!patch) errs.push('缺少 dsh.bundle.patch');
  else if (!fs.existsSync(path.join(root, patch))) errs.push('dsh.bundle.patch 指向的文件不存在: ' + patch);
  if (pkg.dsh.install && pkg.dsh.install.preferred && !pkg.dsh.install[pkg.dsh.install.preferred]) {
    errs.push('dsh.install.preferred=' + pkg.dsh.install.preferred + ' 但缺少对应地址');
  }
}

// SKILL.md 规范：<500 行
const skill = path.join(root, 'skills', 'hole', 'SKILL.md');
if (!fs.existsSync(skill)) errs.push('skills/hole/SKILL.md 不存在');
else {
  const lines = fs.readFileSync(skill, 'utf8').split(/\r?\n/).length;
  if (lines > 500) warns.push('SKILL.md 行数 ' + lines + ' 超过规范建议的 500 行');
  const fm = /^---\n([\s\S]*?)\n---/.exec(fs.readFileSync(skill, 'utf8'));
  if (!fm) errs.push('SKILL.md 缺少 frontmatter');
  else {
    if (!/^name:\s*hole$/m.test(fm[1])) errs.push('frontmatter name 必须是 hole');
    const desc = (/^description:\s*(.+)$/m.exec(fm[1]) || [])[1] || '';
    const words = desc.trim().split(/\s+/).filter(Boolean).length;
    if (words < 50 || words > 200) warns.push('description 词数 ' + words + '，规范建议 50-200');
  }
}

for (const p of ['lib/index.js', 'bin/dsh-hole.js', 'cordis.patch.yml']) {
  if (!fs.existsSync(path.join(root, p))) errs.push('缺少文件: ' + p);
}

console.log((errs.length ? '[FAIL] ' : '[PASS] ') + pkg.name + '@' + pkg.version);
if (pkg.dsh?.bundle?.patch) console.log('  bundle.patch: ' + pkg.dsh.bundle.patch);
errs.forEach(e => console.log('  ERROR ' + e));
warns.forEach(w => console.log('  WARN  ' + w));
process.exit(errs.length ? 1 : 0);
