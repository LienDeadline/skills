# LienDeadline agent skills

[![skills.sh](https://skills.sh/b/liendeadline/skills)](https://skills.sh/liendeadline/skills)

Agent skills and plugins for [LienDeadline](https://liendeadline.com): mechanics lien and
preliminary notice deadlines for US construction material suppliers.

| Skill | What it does |
| --- | --- |
| [`liendeadline`](skills/liendeadline/SKILL.md) | Asks for delivery facts and explicit Florida or Kansas event answers, calls the public supplier-events-v2 API through the LienDeadline MCP server or direct HTTPS, and explains each result with its statute sources. |

## Coverage

1. **Lien guides:** all 50 states and DC.
2. **Available supplier calculations:** Florida and Kansas private projects through
   `supplier-events-v2`. Other states and public projects return `review_required`.
   Missing or unresolved event facts keep the affected deadline under review.
3. **Research progress:** as of October 6, 2026, the [human-review tracker](https://github.com/LienDeadline/liendeadline-api/issues/327)
   accepts Peter's conditional decisions for 19 jurisdictions across all six private supplier
   scopes. This research count includes Florida and Kansas and DC; it is not a count of
   available calculations. Additional coverage requires implemented rules and release acceptance.

Results are not legal advice.

## Install

Any agent that reads [Agent Skills](https://agentskills.io) (Claude Code, Codex, Cursor, Gemini
CLI, GitHub Copilot and others), with the [skills CLI](https://skills.sh):

```bash
npx skills add LienDeadline/skills
```

Claude Code plugin, which adds the skill and connects to the hosted LienDeadline MCP server:

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

Codex plugin (skill and MCP server):

```bash
codex plugin marketplace add LienDeadline/skills
codex plugin add liendeadline@liendeadline
```

## What runs and what is sent

| Part | What it is | What it sends |
| --- | --- | --- |
| Skill | Instructions only, no code | The agent sends the project facts and event answers to LienDeadline's public supplier-events-v2 API, through the MCP server or a direct HTTPS tool. No account or key; the API does not save them. |
| MCP server (Claude plugin) | The hosted endpoint `https://mcp.liendeadline.com/mcp`, the same server as LienDeadline's [Claude connector](https://claude.ai/directory/connectors/liendeadline). Nothing is installed or run locally. | The facts and answers go to that endpoint, which forwards them to `secure-api-v1.liendeadline.com` and stores nothing between requests. Its state guides are editorial references. |
| MCP server (Codex, Cursor and Gemini manifests) | [`liendeadline-mcp`](https://github.com/LienDeadline/liendeadline-mcp), started locally with `npx -y liendeadline-mcp@0.4.2`. It sends supplier-events-v2 with the explicit event answers, and its published `npm-shrinkwrap.json` locks every dependency version. | The same facts and answers, to `secure-api-v1.liendeadline.com` only. No direct telemetry from the local MCP process; the API may count request metadata as described below. |

The public supplier endpoint needs no key, and the plugins configure none. See LienDeadline's [privacy policy](https://liendeadline.com/privacy).

The hosted connector and API may collect aggregate usage through PostHog: operation or tool name,
outcome and duration, without project inputs, outputs, IP addresses or account credentials.
The direct HTTP skill path supplies a constant `X-LienDeadline-Client: skill` marker when supported.
Calls through MCP count as MCP use. Fetching the skill document does not prove installation or use.

The Claude plugin uses the hosted endpoint, so it works in Claude Code, Cowork and the Claude apps. The Codex, Cursor and
Gemini manifests start the server locally over stdio. Elsewhere, add `https://mcp.liendeadline.com/mcp` as a custom
connector, or let the skill use a direct HTTPS tool. `scripts/` holds developer checks that CI runs; the plugin never
runs them.

## Layout

| Path | Used by |
| --- | --- |
| `skills/liendeadline/SKILL.md` | Every agent; follows the Agent Skills specification |
| `skills/liendeadline/agents/openai.yaml` | Codex: the skill's display name and icon. Codex reads skill icons only from the skill folder, so `assets/icon.svg` there is a copy of `.claude-plugin/icon.svg`. |
| `.claude-plugin/plugin.json` | Claude Code, Copilot CLI |
| `.claude-plugin/marketplace.json` | Claude Code, Codex, Copilot CLI |
| `.claude-plugin/icon.svg` | The plugin icon in Claude's plugin directory, Codex and Cursor |
| `plugin.json`, `mcp.json` | Agent Plugins 1.0.0 clients, including Codex. The Codex and Cursor manifests reuse `mcp.json`. |
| `.codex-plugin/plugin.json` | Codex: the plugin's name, icon and links. Older Codex releases read it instead of `plugin.json`. |
| `.cursor-plugin/plugin.json` | Cursor |
| `gemini-extension.json` | Gemini CLI |

The same `SKILL.md` is served at https://liendeadline.com/skills/liendeadline/SKILL.md. Run
`node scripts/validate.mjs` before committing; CI runs it on every change.

## Support

Questions and bug reports: [support@liendeadline.com](mailto:support@liendeadline.com) or an issue
in this repository. Report security issues privately as described in [SECURITY.md](SECURITY.md).

## Not legal advice

Statutes change and facts vary between projects. Verify critical deadlines with qualified counsel
before relying on them. LienDeadline is not a law firm and does not file anything on your behalf.

## License

MIT

The skill also supports the additive supplier-events-v3 discovery interface when the connected server exposes it. It discovers exact scope support and questions before collecting facts, binds calculations to returned source identities, and preserves review-required outcomes. This client capability does not claim that additional jurisdictions are live.


## Pending release candidate

Plugin metadata is prepared for 1.4.0. The Codex, Cursor and Gemini package pins remain
`liendeadline-mcp@0.4.2`, the existing published package. MCP 0.5.0 adds the v3 discovery and
calculation tools; update those pins only after 0.5.0 is published and verified, following
[the MCP release procedure](https://github.com/LienDeadline/liendeadline-mcp/blob/main/RELEASING.md).
Hosted MCP deployment is separate from package publication. The skill discovers available
tools and uses the v3 interface only when available; this candidate does not claim additional
live jurisdictions or a completed publication.
