# LienDeadline agent skills

[![skills.sh](https://skills.sh/b/liendeadline/skills)](https://skills.sh/liendeadline/skills)

Agent skills and plugins for [LienDeadline](https://liendeadline.com): mechanics lien and
preliminary notice deadlines for US construction material suppliers.

| Skill | What it does |
| --- | --- |
| [`liendeadline`](skills/liendeadline/SKILL.md) | Asks for delivery facts and explicit Florida or Kansas event answers, calls the public supplier-events-v2 API through the LienDeadline MCP server or direct HTTPS, and explains each result with its statute sources. |

## Coverage

- **Lien guides:** all 50 states and DC.
- **Calculated supplier deadlines:** Florida and Kansas private projects, the states whose supplier
  rules have been reviewed so far. For other states, public projects, or when unusual
  project events are unknown, the affected deadline needs qualified review instead of a
  guessed date.

Results are not legal advice.

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

| Part | What it is | What it sends |
| --- | --- | --- |
| Skill | Instructions only, no code | The agent sends the project facts and event answers to LienDeadline's public supplier-events-v2 API, through the MCP server or a direct HTTPS tool. No account or key; the API does not save them. |
| MCP server (plugin manifests) | [`liendeadline-mcp`](https://github.com/LienDeadline/liendeadline-mcp), started locally with `npx -y liendeadline-mcp@0.3.0`. It sends supplier-events-v2 with the explicit event answers. | The same facts and answers, to `secure-api-v1.liendeadline.com` only. No telemetry. Its state guides are editorial references. |

The public supplier endpoint needs no key. When you enable the Claude Code plugin, it offers an optional, masked field for a LienDeadline customer API key, which only the MCP server's customer invoice tools use; leave it empty for the free tools. The plugin never reads a key from your environment. See LienDeadline's [privacy policy](https://liendeadline.com/privacy).

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
