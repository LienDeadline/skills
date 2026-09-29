# LienDeadline agent skills

[![skills.sh](https://skills.sh/b/liendeadline/skills)](https://skills.sh/liendeadline/skills)

Agent skills and plugins for [LienDeadline](https://liendeadline.com): US mechanics lien and
preliminary notice deadline baselines for construction material suppliers.

| Skill | What it does |
| --- | --- |
| [`liendeadline`](skills/liendeadline/SKILL.md) | Collects a supplier's delivery facts, calculates the preliminary notice and lien filing baselines with LienDeadline's public supplier-events API or MCP server, checks the result, and routes anything it cannot calculate to qualified review. |

Reviewed date baselines cover Florida and Kansas private projects. Other states, public projects
and unreviewed special events return a review-required result instead of a date. Results are
calculated baselines, not legal advice.

## Install

Any agent that reads [Agent Skills](https://agentskills.io) (Claude Code, Codex, Cursor, Gemini
CLI, GitHub Copilot and others), with the [skills CLI](https://skills.sh):

```bash
npx skills add LienDeadline/skills
```

Claude Code plugin, which adds the skill and the LienDeadline MCP server:

```bash
claude plugin marketplace add LienDeadline/skills
claude plugin install liendeadline@liendeadline
```

Inside a Claude Code session, the same is `/plugin marketplace add LienDeadline/skills` followed
by `/plugin install liendeadline@liendeadline`.

Gemini CLI extension (skill and MCP server):

```bash
gemini extensions install https://github.com/LienDeadline/skills
```

GitHub CLI:

```bash
gh skill install LienDeadline/skills liendeadline
```

Codex reads the same marketplace with `codex plugin marketplace add LienDeadline/skills`.

## What runs and what is sent

- **The skill** tells the agent to collect project facts from the user and either call the MCP
  server's `calculate_supplier_deadlines` tool or POST the facts to
  `https://secure-api-v1.liendeadline.com/api/v1/supplier-deadlines`. That endpoint is public and
  stateless: it needs no account or key and does not save the submitted facts.
- **The plugins** (Claude Code, Gemini CLI and the Agent Plugins manifest) also start the
  open-source [LienDeadline MCP server](https://github.com/LienDeadline/liendeadline-mcp) with
  `npx -y liendeadline-mcp@0.2.0`, pinned to an exact version. It runs locally over stdio, has
  no telemetry, and only calls `https://secure-api-v1.liendeadline.com`.
- **Nothing to pay or configure.** The MCP server's optional customer tools need a customer key
  in the server's environment; these plugins do not ask for one or read it.

LienDeadline's [privacy policy](https://liendeadline.com/privacy) covers the API.

## Layout

| Path | Used by |
| --- | --- |
| `skills/liendeadline/SKILL.md` | Every agent; follows the Agent Skills specification |
| `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` | Claude Code, Codex, Copilot CLI |
| `plugin.json`, `mcp.json` | Agent Plugins 1.0.0 clients |
| `gemini-extension.json` | Gemini CLI |

The same `SKILL.md` is served at https://liendeadline.com/skills/liendeadline/SKILL.md. Run
`node scripts/validate.mjs` before committing; CI runs it on every change.

## Not legal advice

Statutes change and facts vary between projects. Verify critical deadlines with qualified counsel
before relying on them. LienDeadline is not a law firm and does not file anything on your behalf.

## License

MIT
