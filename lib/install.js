import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PKG_ROOT = path.resolve(__dirname, '..');

export function dshHome() {
  return process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
}
export function skillSrc() { return path.join(PKG_ROOT, 'skills', 'hole'); }
export function skillDest() { return path.join(dshHome(), 'skills', 'hole'); }
export function backupDir() { return path.join(dshHome(), 'dsh-hole-backups'); }

export function pkgVersion() {
  try { return JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf8')).version || '0.0.0'; }
  catch { return '0.0.0'; }
}

function stampFile() { return path.join(skillDest(), '.hole-version'); }

export function installedVersion() {
  try { return fs.readFileSync(stampFile(), 'utf8').trim(); } catch { return null; }
}

function copyDir(src, dest, skip) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip.has(e.name)) continue;
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d, skip);
    else fs.copyFileSync(s, d);
  }
}

const SKIP = new Set(['.git', 'node_modules', '.DS_Store']);

/**
 * 把技能同步到 $DSH_HOME/skills/hole。
 * - 已存在且版本相同 -> 跳过
 * - 已存在但版本不同 -> 备份后覆盖
 * - force=true -> 无视版本直接覆盖（先备份）
 */
export function installSkill({ force = false, silent = false } = {}) {
  const srcDir = skillSrc();
  if (!fs.existsSync(path.join(srcDir, 'SKILL.md'))) {
    throw new Error('skill payload missing: ' + srcDir);
  }
  const destDir = skillDest();
  const version = pkgVersion();
  const current = installedVersion();
  const exists = fs.existsSync(path.join(destDir, 'SKILL.md'));

  if (exists && current === version && !force) {
    if (!silent) console.log('[dsh-hole] skill already up to date: ' + destDir + ' (v' + version + ')');
    return { action: 'skip', destDir, version };
  }

  let backup = null;
  if (exists) {
    fs.mkdirSync(backupDir(), { recursive: true });
    backup = path.join(backupDir(), 'hole-' + new Date().toISOString().replace(/[:.]/g, '-'));
    fs.cpSync(destDir, backup, { recursive: true });
  }

  fs.rmSync(destDir, { recursive: true, force: true });
  copyDir(srcDir, destDir, SKIP);
  fs.writeFileSync(stampFile(), version + '\n');

  if (!silent) {
    console.log('[dsh-hole] skill installed -> ' + destDir + ' (v' + version + ')');
    if (backup) console.log('[dsh-hole] previous version backed up -> ' + backup);
    console.log('[dsh-hole] 重启 DSH 或等 catalog 刷新后，使用 skill 工具加载 hole');
  }
  return { action: exists ? 'upgrade' : 'install', destDir, version, backup };
}

export function uninstallSkill({ silent = false } = {}) {
  const destDir = skillDest();
  if (!fs.existsSync(destDir)) {
    if (!silent) console.log('[dsh-hole] nothing to remove');
    return { action: 'noop' };
  }
  fs.rmSync(destDir, { recursive: true, force: true });
  if (!silent) console.log('[dsh-hole] removed ' + destDir);
  return { action: 'removed', destDir };
}

export function status() {
  return {
    dshHome: dshHome(),
    pkgVersion: pkgVersion(),
    installed: installedVersion(),
    source: skillSrc(),
    target: skillDest(),
    present: fs.existsSync(path.join(skillDest(), 'SKILL.md')),
  };
}
