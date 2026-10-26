#!/usr/bin/env node
import { installSkill, uninstallSkill, status } from '../lib/install.js';

const cmd = process.argv[2] || 'status';
const quiet = process.argv.includes('--quiet') || process.argv.includes('-q');
const force = process.argv.includes('--force') || process.argv.includes('-f');

try {
  switch (cmd) {
    case 'install': {
      const r = installSkill({ force, silent: quiet });
      if (quiet) process.stdout.write(r.action + '\n');
      process.exit(0);
    }
    case 'uninstall':
      uninstallSkill({ silent: quiet });
      process.exit(0);
    case 'status': {
      const s = status();
      console.log(JSON.stringify(s, null, 2));
      process.exit(0);
    }
    case 'version':
      console.log(status().pkgVersion);
      process.exit(0);
    default:
      console.log('dsh-hole — DSH 授权渗透技能包\n\n用法:\n  dsh-hole install [--force]   安装/升级技能到 $DSH_HOME/skills/hole\n  dsh-hole uninstall           移除技能\n  dsh-hole status              查看安装状态\n  dsh-hole version             打印版本');
      process.exit(0);
  }
} catch (e) {
  console.error('[dsh-hole] ' + (e && e.message ? e.message : e));
  process.exit(1);
}
