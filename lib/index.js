import { installSkill, status as readStatus } from './install.js';

export const name = 'dsh-hole';

// 不注入任何服务：技能安装是纯文件系统动作，避免宿主因缺少服务而 pending 退出。
export const inject = [];

export function apply(ctx, config = {}) {
  const log = (m) => { try { ctx?.logger?.info?.(m); } catch {} };
  if (config.registerSkill === false) {
    log('[dsh-hole] registerSkill=false, skip');
    return;
  }
  try {
    const r = installSkill({ force: !!config.force, silent: true });
    log('[dsh-hole] ' + r.action + ' -> ' + r.destDir + ' (v' + r.version + ')');
  } catch (e) {
    // 启动期绝不抛错：技能没装上不该拖垮宿主
    try { ctx?.logger?.warn?.('[dsh-hole] install failed: ' + (e && e.message)); } catch {}
  }
}

export { installSkill, uninstallSkill, status, dshHome, skillSrc, skillDest } from './install.js';
