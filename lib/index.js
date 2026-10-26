import fs from 'node:fs';
import path from 'node:path';
import { installSkill, PKG_ROOT } from './install.js';

export const name = 'dsh-hole';

// 只用 systemPrompt 一个服务：用于注入常驻指令。
export const inject = ['systemPrompt'];

const POLICY_FILE = path.join(PKG_ROOT, 'assets', 'policy.md');
const FALLBACK_POLICY = [
  '## hole · 授权安全测试插件（已启用）',
  '',
  '涉及渗透测试/漏洞挖掘/安全评估/漏洞报告时，先运行 layers/guard/target.mjs check；',
  '退出码非 0 则停止并报告缺失项。通过后调用 skill({ name: "hole" }) 加载方法论。',
  '只证明存在，不 dump、不写入、不留后门；对无授权目标不做口令攻击与破坏性测试。',
].join('\n');

function readPolicy() {
  try { return fs.readFileSync(POLICY_FILE, 'utf8'); } catch { return FALLBACK_POLICY; }
}

export function apply(ctx, config = {}) {
  const log = (m) => { try { ctx?.logger?.info?.(m); } catch {} };
  const warn = (m) => { try { ctx?.logger?.warn?.(m); } catch {} };

  // A. 同步技能到 $DSH_HOME/skills/hole
  if (config.registerSkill !== false) {
    try {
      const r = installSkill({ force: !!config.force, silent: true });
      log('[dsh-hole] skill ' + r.action + ' -> ' + r.destDir);
    } catch (e) {
      warn('[dsh-hole] install failed: ' + (e && e.message));
    }
  }

  // B. 注入常驻指令：新会话开局即生效，不必等模型主动加载技能
  if (config.injectPolicy !== false) {
    const text = readPolicy();
    try {
      const dispose = ctx.systemPrompt.section({
        name: 'dsh-hole-policy',
        order: 5150,
        interpolate: false,
        text: () => text,
      });
      if (typeof dispose === 'function' && typeof ctx.effect === 'function') {
        try { ctx.effect(() => () => { try { dispose(); } catch {} }); } catch {}
      }
      log('[dsh-hole] policy section injected (' + text.length + ' chars)');
    } catch (e) {
      const msg = String(e && e.message || e);
      if (msg.includes('already registered')) log('[dsh-hole] policy section already present');
      else warn('[dsh-hole] policy injection failed: ' + msg);
    }
  }
}

export { installSkill, uninstallSkill, status, dshHome, skillSrc, skillDest } from './install.js';
