# pstack (fork)

Customized copy of [cursor/plugins/pstack](https://github.com/cursor/plugins/tree/main/pstack) (commit `180939f`, MIT).

| Path | Source | Purpose |
|---|---|---|
| `pstack/` | `pstack/` | Cursor plugin: skills, agents, docs |
| `harness/pstack/` | `harness/pstack/` | Generated Claude Code tree |
| `cursor-team-kit/skills/` | `cursor-team-kit/skills/{deslop,control-cli,control-ui}` | Skills pstack calls but does not ship |
| `scripts/` | `scripts/check-pstack-docs.mjs`, `generate-pstack-harness-trees.mjs` | Doc check and harness tree generator |

After editing `pstack/`, regenerate the Claude Code tree:

```bash
node scripts/generate-pstack-harness-trees.mjs
```
