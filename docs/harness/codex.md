# pstack in Codex

pstack skills use Claude Code names. In Codex, read this file once per session, then map each Claude Code name in a skill with the tables below. `<pstack>` means the folder that holds `skills/` and `docs/`. If a Claude Code name has no row, drop it and say so.

## Tools

| Claude Code | Codex |
| --- | --- |
| `Agent` tool, "spawn an `Agent`" | Spawn a Codex subagent. Name the agent type, the model, and the reasoning effort in the spawn request. |
| `AskUserQuestion` | Ask in plain text with numbered options. |
| A todo list | The `update_plan` tool. Keep the same items and update them at each phase. |
| Run another pstack skill (the **name** skill, `/name`, or `/pstack:name`) | Read `<pstack>/skills/<name>/SKILL.md` and follow it. When you tell the user to type one, write `$<name>`. |
| `Skill` tool | Read the skill's `SKILL.md`. Codex has no `Skill` tool. |
| `/loop` | Codex has no `/loop`. Re-check on each turn the user starts, and say that the run needs a person or a scheduler to wake it. |
| Claude Code plan mode | Codex plan mode, when the session offers it. |
| `skill-creator` | The built-in `$skill-creator` skill. |

## Subagent fields

| Claude Code | Codex |
| --- | --- |
| `subagent_type: "general-purpose"` | The `default` agent. Use `worker` when the job is to write code. |
| `subagent_type: "Explore"` | The `explorer` agent. The brief still says "do not edit files", and you check `git status` afterward. |
| `subagent_type: "pstack:poteto-agent"` or `"poteto-agent"` | The `poteto-agent` custom agent. Without it, the `worker` agent with "read `<pstack>/skills/poteto-mode/SKILL.md` in full before any work" at the top of the brief. |
| `subagent_type: "pstack:comment-sicko"` or `"comment-sicko"` | The `comment-sicko` custom agent. Without it, the `explorer` agent with `<pstack>/agents/comment-sicko.md` pasted at the top of the brief. |
| `isolation: "worktree"` | Tell the worker to create its own worktree first, with `git worktree add <path> <branch>`, and to work only there. Name the branch or commit. |
| `run_in_background: true` | Omit. Codex runs the spawned agents in parallel and waits for the results. |
| Resume or message a running agent | Send that agent a follow-up. Otherwise spawn a new agent and paste the earlier result into its brief. |

Codex subagents inherit the parent's sandbox and approval settings. A subagent that must write files needs a parent session that can write.

## Models

A role value is `<tier> <effort>`, such as `opus low`. Codex has no `opus`, `sonnet`, or `haiku`, so map the tier to a Codex model.

| Claude Code | Codex |
| --- | --- |
| The rule `~/.claude/rules/pstack-models.md` | `~/.codex/pstack-models.md`. Codex does not load it on its own, so read it when a skill names a role line. If the file or the role's line is missing, use the skill's default. |
| Tier `opus` or `fable` | The model on the `# codex tiers:` line for `opus`. |
| Tier `sonnet` | The model on that line for `sonnet`. |
| Tier `haiku` | The model on that line for `haiku`. |
| No `# codex tiers:` line | Omit the model, so the subagent runs on the parent model, and keep the effort. Say so once. |
| Effort `low`, `medium`, `high`, `xhigh` | The same `model_reasoning_effort`. |
| Effort `max` | `xhigh`. |
| `inherit` | Omit the model and the effort. |

A model family is the Codex model an entry maps to, not its tier. An entry with no model, because the value is `inherit` or the tiers line is missing, is the parent's model. Two entries that map to the same model are the same family. So when a skill needs a reviewer or judge from another family than the one that did the work, such as the Arena cross-judge or the review in the **show-me-your-work** skill, pick only an entry whose mapped model differs. When none does, skip that cross-family step the way the skill's own fallback says, or say "Skipped in Codex: cross-family review. No other model is mapped." when the skill has none. A panel whose seats map to the same model still runs, and you say that the panel is not diverse.

## setup-pstack

Follow the **setup-pstack** skill with these changes:

- Detect. Read the model list in `~/.codex/models_cache.json` when it exists. Otherwise ask the user which models their Codex offers. Pick the strongest model for `opus`, a mid-size model for `sonnet`, and the smallest model for `haiku`, show the three, and let the user change them. The efforts are `low`, `medium`, `high`, and `xhigh`. Clamp `max` to `xhigh`.
- Write. Write `~/.codex/pstack-models.md` in the same shape, with one more comment line after the `# budget` line: `# codex tiers: opus=<model>, sonnet=<model>, haiku=<model>`. Keep the role values as tiers, so the same lines work in Claude Code.
- Agents. Copy `<pstack>/codex/agents/*.toml` to `~/.codex/agents/`, so `poteto-agent` and `comment-sicko` exist as custom agents. Overwrite older copies. Tell the user that a new session picks them up.

## Paths

| Claude Code | Codex |
| --- | --- |
| `.claude/skills/`, `~/.claude/skills/` | `.agents/skills/`, `~/.agents/skills/` |
| `~/.claude/plugins/`, `.claude-plugin/plugin.json` | The folder this skill was loaded from, and `<pstack>/plugin.json` |
| `CLAUDE.md` | `AGENTS.md` |
| `.claude/worktrees/` | The worktree folder the run chose, such as `../<repo>-worktrees/` |
| Transcripts in `~/.claude/projects/<slug>/` | `~/.codex/sessions/<yyyy>/<mm>/<dd>/rollout-*.jsonl`. Sessions are not grouped by workspace. Read the first line of each file, which records the session's `cwd`, and keep only the files whose `cwd` is this workspace or inside it. Never read sessions from other workspaces. The newest kept file is the current session. |

## Other Claude Code features

| Claude Code | Codex |
| --- | --- |
| Hooks, `/plugin`, Claude Code cloud sessions | Skip the step with one line, `Skipped in Codex: <step>. <reason>.`, then go on. |
| A PR tool such as a GitHub MCP server | Use it when the session has it. Otherwise use the forge command the step gives, such as `gh pr create`. |
