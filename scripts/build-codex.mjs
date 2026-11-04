#!/usr/bin/env node

// Builds the Codex files from the Claude Code sources, so one tree serves both harnesses:
// - skills/<name>/agents/openai.yaml turns off implicit invocation where SKILL.md sets disable-model-invocation.
// - codex/agents/<name>.toml is each agents/<name>.md as a Codex custom agent.
// - Each SKILL.md whose skill uses a Claude Code name gets one line that points Codex at docs/harness/codex.md,
//   and the adapter must have a row for every name the skills use.
// Run with --check in CI to fail when the generated files drift from their sources.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = join(ROOT, "skills");
const AGENTS = join(ROOT, "agents");
const CODEX_AGENTS = join(ROOT, "codex", "agents");
const ADAPTER = "docs/harness/codex.md";
const CHECK = process.argv.includes("--check");

const LINE =
  `In Codex, read [the Codex adapter](../../${ADAPTER}) once per session before you follow this skill. ` +
  "It maps the Claude Code names in pstack skills to Codex.";
const YAML = "policy:\n  allow_implicit_invocation: false\n";

// Each Claude Code name a skill may use, and the text the adapter must contain for it.
const TERMS = [
  { key: "`Agent` tool", re: /`Agent`|\bAgent (tool|call|subagent)/ },
  { key: "`AskUserQuestion`", re: /AskUserQuestion/ },
  { key: "A todo list", re: /\btodo list\b/i },
  { key: "Run another pstack skill", re: /`\/pstack:|the `Skill` tool/ },
  { key: "`/loop`", re: /`\/loop`/ },
  { key: "plan mode", re: /\bplan mode\b/i },
  { key: "`skill-creator`", re: /skill-creator/ },
  { key: "`subagent_type: \"general-purpose\"`", re: /"general-purpose"|`general-purpose`/ },
  { key: "`subagent_type: \"Explore\"`", re: /"Explore"/ },
  { key: "pstack:poteto-agent", re: /poteto-agent/ },
  { key: "pstack:comment-sicko", re: /comment-sicko/ },
  { key: "`isolation: \"worktree\"`", re: /isolation: "worktree"/ },
  { key: "`run_in_background: true`", re: /run_in_background/ },
  { key: "Resume or message a running agent", re: /\b(resume|Resume)\b/ },
  { key: "~/.claude/rules/pstack-models.md", re: /pstack-models\.md/ },
  { key: "Tier `haiku`", re: /`haiku/ },
  { key: "Tier `sonnet`", re: /`sonnet/ },
  { key: "Tier `opus` or `fable`", re: /`opus/ },
  { key: "`inherit`", re: /`inherit`/ },
  { key: "`.claude/skills/`", re: /\.claude\/skills/ },
  { key: "`~/.claude/plugins/`", re: /\.claude\/plugins|\.claude-plugin/ },
  { key: "`CLAUDE.md`", re: /CLAUDE\.md/ },
  { key: "`.claude/worktrees/`", re: /\.claude\/worktrees/ },
  { key: "Transcripts in `~/.claude/projects/<slug>/`", re: /\.claude\/projects/ },
];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name === ".DS_Store") return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function frontmatter(text) {
  const block = text.match(/^---\n([\s\S]*?)\n---\n/);
  const fields = {};
  if (!block) return { fields, body: text };
  for (const line of block[1].split("\n")) {
    const m = line.match(/^([a-z_-]+):\s*(.*)$/);
    if (m) fields[m[1]] = m[2].trim().replace(/^(["'])(.*)\1$/, "$2");
  }
  return { fields, body: text.slice(block[0].length) };
}

const wanted = new Map();
const problems = [];
const adapter = readFileSync(join(ROOT, ADAPTER), "utf8");
const users = new Map();

for (const skill of readdirSync(SKILLS).filter((name) => existsSync(join(SKILLS, name, "SKILL.md"))).sort()) {
  const dir = join(SKILLS, skill);
  const path = join(dir, "SKILL.md");
  const text = readFileSync(path, "utf8");
  const used = new Set();
  for (const file of walk(dir).filter((file) => file.endsWith(".md"))) {
    const body = readFileSync(file, "utf8").replace(LINE, "");
    for (const term of TERMS) if (term.re.test(body)) used.add(term.key);
  }
  for (const key of used) users.set(key, [...(users.get(key) ?? []), skill]);

  let next = text.replace(`${LINE}\n\n`, "");
  if (used.size > 0) {
    if (!/^# /m.test(next)) problems.push(`skills/${skill}/SKILL.md uses Claude Code names but has no H1`);
    next = next.replace(/^(# .*)\n+/m, `$1\n\n${LINE}\n\n`);
  }
  wanted.set(relative(ROOT, path), next);

  const yaml = join(dir, "agents", "openai.yaml");
  if (frontmatter(text).fields["disable-model-invocation"] === "true") wanted.set(relative(ROOT, yaml), YAML);
  else if (existsSync(yaml)) wanted.set(relative(ROOT, yaml), null);
}

for (const [key, using] of users) {
  if (!adapter.includes(key)) problems.push(`${ADAPTER} has no row for ${key}, used by ${using.join(", ")}`);
}

const PREAMBLE =
  "You run in Codex. Before any work, read `docs/harness/codex.md` in the pstack folder, the folder that holds the " +
  "`skills/poteto-mode/SKILL.md` your parent named. It maps the Claude Code names below to Codex.\n\n";
const expectedAgents = new Set();
for (const file of readdirSync(AGENTS).filter((name) => name.endsWith(".md")).sort()) {
  const { fields, body } = frontmatter(readFileSync(join(AGENTS, file), "utf8"));
  if (!fields.name || !fields.description) {
    problems.push(`agents/${file} needs name and description`);
    continue;
  }
  const instructions = PREAMBLE + body.trim() + "\n";
  if (instructions.includes("'''")) problems.push(`agents/${file} contains ''', which a TOML literal string cannot hold`);
  const toml =
    `# Generated from agents/${file} by scripts/build-codex.mjs. Do not edit.\n` +
    `name = ${JSON.stringify(fields.name)}\n` +
    `description = ${JSON.stringify(fields.description)}\n` +
    `developer_instructions = '''\n${instructions}'''\n`;
  const out = relative(ROOT, join(CODEX_AGENTS, `${fields.name}.toml`));
  expectedAgents.add(out);
  wanted.set(out, toml);
}
if (existsSync(CODEX_AGENTS)) {
  for (const file of readdirSync(CODEX_AGENTS)) {
    const out = relative(ROOT, join(CODEX_AGENTS, file));
    if (!expectedAgents.has(out)) wanted.set(out, null);
  }
}

// Codex reads the portable root plugin.json and the .codex-plugin compatibility manifest. Both copy the Claude Code one.
const claude = JSON.parse(readFileSync(join(ROOT, ".claude-plugin", "plugin.json"), "utf8"));
const shared = Object.fromEntries(
  ["name", "version", "description", "author", "homepage", "repository", "license", "keywords"]
    .filter((key) => key in claude)
    .map((key) => [key, claude[key]]),
);
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
wanted.set("plugin.json", json({ $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json", ...shared }));
wanted.set(join(".codex-plugin", "plugin.json"), json({ ...shared, skills: "./skills/" }));

for (const problem of problems) console.log(`FAIL ${problem}`);
if (problems.length > 0) process.exit(1);

const drifted = [...wanted].filter(([path, want]) => {
  const full = join(ROOT, path);
  const have = existsSync(full) ? readFileSync(full, "utf8") : null;
  return have !== want;
});

if (CHECK) {
  for (const [path] of drifted) console.log(`out of date: ${path}`);
  if (drifted.length > 0) {
    console.log("Codex files are out of date. Run `node scripts/build-codex.mjs` and commit the result.");
    process.exit(1);
  }
  console.log("Codex files are up to date.");
} else {
  for (const [path, want] of drifted) {
    const full = join(ROOT, path);
    if (want === null) rmSync(full, { force: true });
    else {
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, want);
    }
  }
  console.log(`${drifted.length} files written`);
}
