#!/usr/bin/env node
/**
 * target.mjs — 目标槽位工具（本质是本技能的「tool 入参」）
 *
 * 目的：把「打谁、凭什么打、能打多狠」从模型脑补变成显式参数，
 *       check 不过就不给可执行命令。
 *
 * 用法：
 *   node target.mjs init               生成 target.json 模板
 *   node target.mjs check              校验授权与范围（不通过 = 禁止进入挖掘层）
 *   node target.mjs show               打印当前槽位与就绪状态
 *   node target.mjs env                输出 shell 环境变量（TARGET / RATE / SCOPE）
 *   node target.mjs render "<模板>"     把 {{TARGET}} {{RATE}} {{SCOPE}} 替换成实际值
 *   node target.mjs set key=value      修改单个字段（点号路径，如 target.host=example.com）
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const FILE = process.env.HOLE_TARGET || 'target.json';

const TEMPLATE = {
  authorization: {
    type: 'platform_scope',
    reference: 'https://www.butian.net/... 或在授权书编号',
    expires: '',
    contact: '',
  },
  target: {
    host: 'example.com',
    scheme: 'https',
    ips: [],
    scope: ['example.com'],
    out_of_scope: [],
  },
  rules: {
    max_rps: 2,
    allow_bruteforce: false,
    allow_social: false,
    allow_dos: false,
    data_minimization: true,
    stop_on_prod_impact: true,
  },
  evidence: { dir: './evidence', screenshot_time: true },
  report: { platform: '补天', vendor: '', industry: '', region: '' },
};

function readCfg() {
  if (!fs.existsSync(FILE)) return null;
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { throw new Error('target.json 解析失败: ' + e.message); }
}
function writeCfg(c) { fs.writeFileSync(FILE, JSON.stringify(c, null, 2) + '\n'); }

function inScope(host, scope) {
  const h = String(host || '').toLowerCase();
  return (scope || []).some((s) => {
    const p = String(s || '').toLowerCase().trim();
    if (!p) return false;
    if (p.startsWith('*.')) return h === p.slice(2) || h.endsWith(p.slice(1));
    if (p.includes('/')) return h === p.split('/')[0];
    return h === p || h.endsWith('.' + p);
  });
}

/** 返回 { ok, errors[], warnings[] } */
export function check(c) {
  const errors = [];
  const warnings = [];
  if (!c) return { ok: false, errors: ['target.json 不存在，先执行 node target.mjs init'], warnings };

  const a = c.authorization || {};
  const allowedTypes = ['platform_scope', 'written_auth', 'own_lab'];
  if (!allowedTypes.includes(a.type)) errors.push('authorization.type 必须是 ' + allowedTypes.join(' / ') + ' 之一，当前: ' + JSON.stringify(a.type));
  if (!a.reference || !String(a.reference).trim()) errors.push('authorization.reference 为空：必须写明项目页 URL / 授权书编号 / 靶场说明');
  if (a.type === 'written_auth' && !a.expires) warnings.push('written_auth 建议填写 expires（授权到期日），否则无法判断是否已过期');
  if (a.expires) {
    const t = Date.parse(a.expires);
    if (!Number.isNaN(t) && t < Date.now()) errors.push('授权已于 ' + a.expires + ' 过期，停止作业');
  }

  const t = c.target || {};
  if (!t.host) errors.push('target.host 为空');
  if (!Array.isArray(t.scope) || t.scope.length === 0) errors.push('target.scope 为空：没有任何授权范围，等同于未授权');
  if (t.host && Array.isArray(t.scope) && t.scope.length && !inScope(t.host, t.scope)) {
    errors.push('target.host (' + t.host + ') 不在 target.scope 内，属于越界测试');
  }
  for (const o of (t.out_of_scope || [])) {
    if (o && inScope(t.host, [o])) errors.push('target.host 命中 out_of_scope 条目: ' + o);
  }

  const r = c.rules || {};
  if (r.allow_dos) errors.push('rules.allow_dos 必须为 false：任何压测/DoS 一律不做');
  const rps = Number(r.max_rps ?? 2);
  if (!(rps > 0)) errors.push('rules.max_rps 必须为正数');
  if (rps > 5) errors.push('rules.max_rps > 5 被硬拒：授权项目普遍要求低频，请降到 5 或以下');
  if (r.allow_bruteforce) warnings.push('allow_bruteforce=true：仅在授权明确允许时保留，且必须查平台禁止项');
  if (r.allow_social) warnings.push('allow_social=true：社工/钓鱼在多数平台被禁止，确认授权书是否覆盖');
  if (r.data_minimization === false) warnings.push('data_minimization=false 违反数据最小化原则，报告可能被判违规');

  return { ok: errors.length === 0, errors, warnings };
}

function statusLine(c) {
  const v = check(c);
  if (!c) return 'NOT-READY  (no target.json)';
  return v.ok ? 'READY      ' + (c.target?.scheme || 'https') + '://' + c.target?.host : 'BLOCKED    ' + v.errors.length + ' 项未通过';
}

const cmd = process.argv[2] || 'show';
const args = process.argv.slice(3);

try {
  switch (cmd) {
    case 'init': {
      if (fs.existsSync(FILE) && !args.includes('--force')) {
        console.log('已存在 ' + FILE + '（加 --force 覆盖）');
        process.exit(0);
      }
      writeCfg(TEMPLATE);
      console.log('已生成 ' + FILE + ' —— 请填写 authorization.reference 与 target.scope 后执行 check');
      process.exit(0);
    }
    case 'check': {
      const c = readCfg();
      const v = check(c);
      console.log((v.ok ? '[PASS] ' : '[FAIL] ') + statusLine(c));
      if (v.errors.length) { console.log('\n必须修复:'); v.errors.forEach(e => console.log('  - ' + e)); }
      if (v.warnings.length) { console.log('\n提醒:'); v.warnings.forEach(w => console.log('  ! ' + w)); }
      if (v.ok) console.log('\n可以进入挖掘层。先读 layers/hunt/README.md，命令中的 {{TARGET}} 用 target.mjs env 注入。');
      process.exit(v.ok ? 0 : 1);
    }
    case 'show': {
      const c = readCfg();
      if (!c) { console.log('未初始化，执行: node target.mjs init'); process.exit(1); }
      console.log(statusLine(c));
      console.log(JSON.stringify(c, null, 2));
      process.exit(0);
    }
    case 'env': {
      const c = readCfg();
      const v = check(c);
      if (!v.ok) { console.error('槽位未通过校验，拒绝输出环境变量'); v.errors.forEach(e => console.error('  - ' + e)); process.exit(1); }
      const base = (c.target.scheme || 'https') + '://' + c.target.host;
      console.log('export TARGET=' + base);
      console.log('export TARGET_HOST=' + c.target.host);
      console.log('export RATE=' + (c.rules?.max_rps ?? 2));
      console.log('export SCOPE=' + JSON.stringify(c.target.scope));
      console.log('export EVIDENCE_DIR=' + (c.evidence?.dir || './evidence'));
      process.exit(0);
    }
    case 'render': {
      const tpl = args.join(' ');
      if (!tpl) { console.error('用法: node target.mjs render "<含 {{TARGET}} 的模板>"'); process.exit(1); }
      const c = readCfg();
      const v = check(c);
      if (!v.ok) { console.error('槽位未通过校验，拒绝渲染命令'); process.exit(1); }
      const base = (c.target.scheme || 'https') + '://' + c.target.host;
      const out = tpl
        .replaceAll('{{TARGET}}', base)
        .replaceAll('{{TARGET_HOST}}', c.target.host)
        .replaceAll('{{RATE}}', String(c.rules?.max_rps ?? 2))
        .replaceAll('{{SCOPE}}', JSON.stringify(c.target.scope))
        .replaceAll('{{EVIDENCE_DIR}}', c.evidence?.dir || './evidence');
      console.log(out);
      process.exit(0);
    }
    case 'set': {
      const kv = args[0];
      if (!kv || !kv.includes('=')) { console.error('用法: node target.mjs set target.host=example.com'); process.exit(1); }
      const c = readCfg() || JSON.parse(JSON.stringify(TEMPLATE));
      const [k, ...rest] = kv.split('=');
      const val = rest.join('=');
      const parts = k.split('.');
      let o = c;
      for (let i = 0; i < parts.length - 1; i++) { o[parts[i]] = o[parts[i]] || {}; o = o[parts[i]]; }
      const ARRAY_KEYS = new Set(['scope', 'out_of_scope', 'ips']);
      let parsed = val;
      const leaf = parts[parts.length - 1];
      if (ARRAY_KEYS.has(leaf)) {
        // 兼容 shell 丢引号的情况：[a.com,b.com] / a.com,b.com / ["a.com"]
        parsed = val.replace(/^\[|\]$/g, '').split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      } else if (val === 'true') parsed = true;
      else if (val === 'false') parsed = false;
      else if (val !== '' && !Number.isNaN(Number(val))) parsed = Number(val);
      o[parts[parts.length - 1]] = parsed;
      writeCfg(c);
      console.log(statusLine(c));
      process.exit(0);
    }
    default:
      console.log('target.mjs — 目标槽位工具\n  init | check | show | env | render "<模板>" | set key=value');
      process.exit(0);
  }
} catch (e) {
  console.error('[target] ' + (e && e.message ? e.message : e));
  process.exit(1);
}
