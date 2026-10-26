# dsh-hole

> A DSH skill + plugin package for **authorized** web penetration testing. Distilled from real multi-tenant SaaS/ERP engagements into a reusable, runnable, submittable methodology.

**Prerequisite**: authorized targets only (assets listed on a bug-bounty platform, written authorization, or your own lab). Chapter 1 of the skill is a legality gate.

---

## What you get

A DSH plugin that installs a skill named `hole`, containing 6 reference chapters (legality/ROE, recon, 8-surface vuln checklists, framework fingerprints, captcha & auth bypass, 14-field Chinese SRC report template) and 5 runnable scripts (probe, js-endpoint extractor, time-based SQLi checker, 403-bypass matrix, captcha montage).

## Install

```bash
git clone https://github.com/jiuan-9/dsh-hole.git
cd dsh-hole && npm install     # postinstall syncs the skill
# or
node bin/dsh-hole.js install
```

Installs `skills/hole` into `$DSH_HOME/skills/hole` (default `~/.dsh/skills/hole`). It does **not** touch the system prompt and injects **no** services.

Then load it in DSH: `skill({ name: "hole" })`.

### Manual / other agents

```bash
mkdir -p ~/.dsh/skills && cp -r skills/hole ~/.dsh/skills/
# or point Codex / Claude / Cursor at skills/hole/SKILL.md directly
```

### Optional: combine with dsh-purge

`dsh-purge` is declared as an **optional peer dependency** — no code is vendored. Install it separately, then uncomment the prepared block in `cordis.patch.yml`.

## Usage

```bash
node skills/hole/scripts/probe.mjs hosts.txt hosts.json
node skills/hole/scripts/jsendpoints.mjs https://example.com /
node skills/hole/scripts/sqli-time.mjs "https://example.com/item?id=1"
node skills/hole/scripts/bypass403.mjs https://example.com /admin
```

## Uninstall

```bash
node bin/dsh-hole.js uninstall
```

## License & credits

Apache-2.0 (see [LICENSE](LICENSE), [NOTICE](NOTICE)). Plugin scaffolding conventions follow the public implementation of [dsh-purge](https://github.com/YuJunZhiXue/dsh-purge) (Apache-2.0).

## Disclaimer

For authorized security testing, self-assessment and education only. Unauthorized access to computer systems is a criminal offense in China and most jurisdictions. The authors accept no liability for misuse.
