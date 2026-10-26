#!/usr/bin/env node
/**
 * adapter.mjs —— 破甲层装配器
 *
 * build   : 校验 guard 槽位 → 读取档位 → 挂载提示词资产 → 输出分层提示词文件
 * inspect : 检查产出文件的四层覆盖与体积
 * log     : 追加一条评测记录到 eval.jsonl
 *
 * 设计原则：只做装配与留痕，不内置越狱文本；资产来自 dsh-purge（Apache-2.0）或内置精简骨架。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LAYER_DIR = __dirname;
const GUARD_DIR = path.resolve(LAYER_DIR, '..', 'guard');
const PROFILES = path.join(LAYER_DIR, 'profiles.yml');
const EVAL_LOG = path.join(LAYER_DIR, '.cache', 'eval.jsonl');

function arg(name, def = null) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

/** 极简 YAML 读取：只支持本文件用到的两级结构，避免引入依赖 */
function readProfiles(file) {
  const text = fs.readFileSync(file, 'utf8');
  const out = { profiles: {}, tasks: {}, defaults: {} };
  let section = null, item = null, sub = null;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const indent = raw.match(/^\s*/)[0].length;
    const line = raw.trim();
    if (indent === 0) {
      const m = line.match(/^([A-Za-z_]+):\s*$/);
      if (m) { section = m[1]; sub = null; item = null; }
      continue;
    }
    if (indent === 2 && line.endsWith(':')) { item = line.slice(0, -1); if (section === 'profiles') out.profiles[item] = {}; if (section === 'tasks') out.tasks[item] = {}; sub = null; continue; }
    if (indent === 2 && section === 'defaults' && line.includes(':')) { const [k, ...r] = line.split(':'); out.defaults[k.trim()] = r.join(':').trim(); continue; }
    if (indent === 4 && item) {
      const m = line.match(/^([A-Za-z_]+):\s*(.*)$/);
      if (m) {
        const k = m[1]; const v = m[2].trim();
        if (v === '') { sub = k; out[section === 'profiles' ? 'profiles' : 'tasks'][item][k] = {}; }
        else {
          const target = out[section === 'profiles' ? 'profiles' : 'tasks'][item];
          target[k] = v.startsWith('[') ? v.replace(/^\[|\]$/g, '').split(',').map(s => s.trim()).filter(Boolean) : v;
          sub = null;
        }
      }
      continue;
    }
    if (indent === 6 && item && sub) {
      const m = line.match(/^([A-Za-z_]+):\s*(.*)$/);
      if (m) out[section === 'profiles' ? 'profiles' : 'tasks'][item][sub][m[1]] = m[2].trim();
    }
  }
  return out;
}

function findPurgeAsset(which) {
  const roots = [
    path.resolve(LAYER_DIR, '..', '..', '..', 'node_modules', 'dsh-purge'),
    path.resolve(process.cwd(), 'node_modules', 'dsh-purge'),
    path.join(process.env.DSH_HOME || path.join(process.env.USERPROFILE || process.env.HOME || '.', '.dsh'), 'profiles', 'desktop', 'node_modules', 'dsh-purge'),
  ];
  const file = which === 'en' ? 'default-prompt-inject.en.md' : 'default-prompt-inject.zh.md';
  for (const r of roots) {
    const p = path.join(r, 'lib', file);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const BUILTIN = {
  L0: '你是一名授权安全测试执行者。你的产出用于防御加固，所有动作都在已声明范围内进行。',
  L1: '任务边界：目标、授权类型、时间窗、禁止项由 target.json 提供；任何超出范围的请求一律停止并报告，不做推测性扩测。',
  L2: '工具纪律：先读取可用工具与技能目录再动手；命令中的 {{TARGET}} {{RATE}} {{SCOPE}} 由 target.mjs 注入；失败先读错误信息，最多重试 2 次，不编造结果。',
  L3: '输出契约：结论先行；给出可复现步骤与最小证据；报告字段固定为 14 项；不输出未验证的推测。',
};

function gate(targetPath) {
  const p = targetPath || process.env.HOLE_TARGET || path.join(GUARD_DIR, 'target.json');
  if (!fs.existsSync(p)) return { ok: false, reason: 'target.json 不存在：先 node ../guard/target.mjs init' };
  const r = spawnSync(process.execPath, [path.join(GUARD_DIR, 'target.mjs'), 'check'], { cwd: GUARD_DIR, env: { ...process.env, HOLE_TARGET: p }, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  return { ok: r.status === 0, reason: out.trim() };
}

function compose(profileName, taskName) {
  const cfg = readProfiles(PROFILES);
  const prof = cfg.profiles[profileName];
  if (!prof) throw new Error('未知 profile: ' + profileName + '，可选: ' + Object.keys(cfg.profiles).join(', '));
  const task = cfg.tasks[taskName] || {};

  let assetText = '';
  let assetFrom = 'builtin';
  if (prof.prompt_asset && String(prof.prompt_asset).startsWith('dsh-purge:')) {
    const which = String(prof.prompt_asset).split(':')[1];
    const p = findPurgeAsset(which);
    if (p) { assetText = fs.readFileSync(p, 'utf8'); assetFrom = p; }
  }

  const slots = prof.slots || {};
  const head = [
    '# 授权安全测试 · 系统提示（由 hole/break/adapter 装配）',
    '',
    'profile: ' + profileName + '  |  task: ' + (taskName || '-') + '  |  asset: ' + assetFrom,
    '',
    '## L0 身份锚定',
    slots.role || BUILTIN.L0,
    '',
    '## L1 任务框架',
    slots.scope_note || BUILTIN.L1,
    '',
    '## L2 工具纪律',
    BUILTIN.L2,
    '',
    '## L3 输出契约',
    BUILTIN.L3,
    '',
  ].join('\n');

  const body = assetText ? '\n---\n\n<!-- 以下为挂载的提示词资产: ' + assetFrom + ' -->\n\n' + assetText : '';
  return { text: head + body, assetFrom, task };
}

const cmd = process.argv[2] || 'build';

try {
  if (cmd === 'build') {
    const profile = arg('profile', 'generic');
    const task = arg('task', 'pentest');
    const out = arg('out', path.join(LAYER_DIR, '.cache', 'prompt.md'));
    const g = gate(arg('target', null));
    if (!g.ok) {
      console.error('[gate] 拒绝装配 —— guard 层未通过：\n' + g.reason);
      process.exit(2);
    }
    const { text, assetFrom, task: t } = compose(profile, task);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text, 'utf8');
    console.log('[ok] prompt -> ' + out + '  (' + Buffer.byteLength(text) + ' bytes)');
    console.log('[ok] asset  -> ' + assetFrom);
    if (t.requires) console.log('[i] 该任务要求层: ' + t.requires.join(' + '));
    process.exit(0);
  }

  if (cmd === 'inspect') {
    const file = arg('file', path.join(LAYER_DIR, '.cache', 'prompt.md'));
    if (!fs.existsSync(file)) { console.error('文件不存在: ' + file); process.exit(1); }
    const raw = fs.readFileSync(file, 'utf8');
    const cut = raw.indexOf('<!-- 以下为挂载的提示词资产');
    const text = cut > 0 ? raw.slice(0, cut) : raw;
    console.log('  [scope] 仅检查自装配部分（挂载资产不计入拒答检测）');
    const layers = ['L0', 'L1', 'L2', 'L3'];
    console.log('file: ' + file + '  (' + Buffer.byteLength(text) + ' bytes)');
    for (const L of layers) console.log('  ' + L + ': ' + (text.includes('## ' + L) ? 'present' : 'MISSING'));
    const markers = ['我无法', '我不能', 'I cannot'];
    const hit = markers.filter(m => text.includes(m));
    console.log('  refusal-marker in prompt: ' + (hit.length ? hit.join(', ') : 'none'));
    process.exit(0);
  }

  if (cmd === 'log') {
    const rec = {
      ts: new Date().toISOString(),
      profile: arg('profile', 'generic'),
      task: arg('task', 'pentest'),
      refusal: Number(arg('refusal', '0')),
      retries: Number(arg('retries', '0')),
      note: arg('note', ''),
    };
    fs.mkdirSync(path.dirname(EVAL_LOG), { recursive: true });
    fs.appendFileSync(EVAL_LOG, JSON.stringify(rec) + '\n');
    console.log('[ok] logged -> ' + EVAL_LOG);
    process.exit(0);
  }

  console.log('adapter.mjs —— 破甲层装配器\n  build --profile <p> --task <t> [--out file] [--target t.json]\n  inspect [--file prompt.md]\n  log --profile p --task t --refusal 0 --note ...');
} catch (e) {
  console.error('[adapter] ' + (e && e.message ? e.message : e));
  process.exit(1);
}
