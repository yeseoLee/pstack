---
name: setup-pstack
description: Configure which models pstack uses per role and at what reasoning budget. Detects your available models and writes an always-applied rule that overrides the skill defaults. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

# Setup pstack

In Codex, read [the Codex adapter](../../docs/harness/codex.md) once per session before you follow this skill. It maps the Claude Code names in pstack skills to Codex.

Write `~/.claude/rules/pstack-models.md`, a rule that sets pstack's model and effort per role. Claude Code loads every `.md` file in `~/.claude/rules/` into each new session, so every pstack skill sees the role lines.

A role value is `<model> <effort>`, such as `opus low`. `model` is the `Agent` tool's `model` field and names the model family: `opus`, `sonnet`, `haiku`, or `fable`. `effort` is the `Agent` tool's `effort` field, on the ladder `max` > `xhigh` > `high` > `medium` > `low`. The value `inherit` means the role runs on the parent chat model, so the spawn omits `model` and `effort`.

## Steps

### 1. Detect available models

Read the `model` and `effort` values that the `Agent` tool schema lists in this session. That is the dependable source. If you cannot read them, ask the user which of `opus`, `sonnet`, `haiku`, and `fable` they can use. Never write a model you have not confirmed is available. `inherit` is always valid.

### 2. Load current state

The default role mapping is the rule shape shown in step 5 below. If `~/.claude/rules/pstack-models.md` already exists, read it and treat its `# budget` line and its role values as the current choices. Otherwise start from those defaults. A line whose role is not in step 5, such as `how critics`, is from a retired role. Drop it. A value that is not `<model> <effort>` or `inherit`, such as a slug from an older pstack version, needs a choice in step 3.

### 3. Budget, map, and confirm

**(a) Ask for a budget.** Prefer AskUserQuestion over free text. Offer these four options with these exact labels, and name the current budget when the rule records one. With no rule, say that `large` matches the skill defaults.

- `unlimited — one effort step above the defaults`
- `large — the defaults`
- `medium — one effort step below the defaults`
- `small — two effort steps below the defaults`

**(b) Apply it.** Build the working table from the skill defaults, and on a re-run keep any role you changed by model, list, or `inherit`. The budget shifts the effort of every real value, panel entries included, from its default: `unlimited` one step up, `large` no change, `medium` one step down, `small` two steps down. Clamp at `max` and `low`. `inherit` does not change. So `unlimited` turns `opus xhigh` into `opus max` and `opus low` into `opus medium`, and `small` turns `opus xhigh` into `opus medium` and `sonnet medium` into `sonnet low`. If the detected efforts do not include the result, use the highest detected effort at or below it.

**(c) Show the roles and confirm.** Show every role with its value, marking any model not in the detected set as needing a choice. Also list each line step 2 dropped. Ask whether to accept as-is or change specific roles, offering the detected models, each effort, and `inherit` as the options. Prefer AskUserQuestion over free text. For panel roles (arena runners, architect runners, interrogate reviewers) the value is a list, and one subagent runs per entry, `inherit` entries included, so the list length sets the count. `arena cross-judge pool` is also a list, but Arena runs one judge. It tries only values from a family other than the parent's, in list order, so order it by preference. An `inherit` value never judges. `swarm workers` is the default model for every worker unless a race or comparison assigns another model per arm.

The defaults follow one split. The chat that runs `/poteto-mode` plans, scaffolds, and decides when the work is done, so it should run on `opus` at `xhigh` effort. Code delegates implement that plan on `opus low`. Delegates that plan or judge run on `opus xhigh`. Read-only exploration runs on `haiku` or `sonnet`. Review panels pair `opus` with `sonnet`.

### 4. Validate

Every model written must be in the detected set, and every effort must be on the ladder. `inherit` always passes. If a chosen model is not available, stop and ask again.

### 5. Write the rule

Write `~/.claude/rules/pstack-models.md` with no frontmatter, then the comment lines, a `# budget` line with the chosen label, and one line per role, using the same labels poteto-mode uses. Overwrite the whole file so re-runs stay idempotent. Never put the role lines in `CLAUDE.md`. Shape:

```
# pstack model configuration. One line per role. Delete a line to fall back to the skill default.
# A value is `<model> <effort>`, passed as the Agent tool's `model` and `effort`. `inherit` runs the role on the parent chat model. `inherit` entries in a panel list still count toward its fan-out.
# budget: large
feature, refactoring: opus low
bug-fix: opus low
perf-issue: opus low
hillclimb: opus low
judgment and prose: opus xhigh
hardest tasks: opus xhigh
how explorer: haiku medium
how explainer: opus xhigh
why investigators: sonnet medium
why synthesizer: opus xhigh
reflect tooling: sonnet medium
reflect judgment, divergent, synthesizer: opus xhigh
arena runners: opus xhigh, sonnet xhigh
arena cross-judge pool: sonnet xhigh, opus xhigh
swarm workers: sonnet medium
architect runners: opus xhigh, sonnet xhigh
interrogate reviewers: opus xhigh, sonnet xhigh
```

### 6. Confirm

Tell the user the rule was written and that it applies to new sessions. Re-running this skill updates it.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /create-verification-skill." On yes, invoke `/create-verification-skill` (resolves wherever pstack is installed: workspace, user, or plugin). On no, move on without pushing.

### 8. Offer a formal verification skill (optional)

Check whether the project already has a formal verification skill (a project skill that runs a model checker, a proof, or another verifier against the code). If not, offer once: "want a formal verification skill, so agents can prove a key property of your code holds in every case in scope, not only the cases tests reach? I can generate one with /create-formal-verification-skill." On yes, invoke `/create-formal-verification-skill` (resolves wherever pstack is installed: workspace, user, or plugin). On no, move on without pushing.
