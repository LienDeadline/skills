# Contributing

Thanks for helping improve the LienDeadline agent skill and plugins. This guide covers the
repository layout, how each package runs the LienDeadline MCP server, the checks to run before a
pull request, and the manifest rules that each agent enforces.

Questions and bug reports are welcome as [issues](https://github.com/LienDeadline/skills/issues).
Report security issues privately as described in [SECURITY.md](SECURITY.md), never in a public
issue or pull request.

## Repository layout

| Path | Used by |
| --- | --- |
| `skills/liendeadline/SKILL.md` | Every agent. Follows the [Agent Skills specification](https://agentskills.io). |
| `skills/liendeadline/agents/openai.yaml` | Codex: the skill's display name and icon |
| `skills/liendeadline/assets/icon.svg` | Codex: a byte-for-byte copy of `.claude-plugin/icon.svg` |
| `.claude-plugin/plugin.json` | Claude Code and Copilot CLI |
| `.claude-plugin/marketplace.json` | Claude Code, Codex and Copilot CLI |
| `.claude-plugin/icon.svg` | The plugin icon in Claude's plugin directory, Codex and Cursor |
| `plugin.json`, `mcp.json` | Agent Plugins 1.0.0 clients, including Codex. The Codex and Cursor manifests reuse `mcp.json`. |
| `.codex-plugin/plugin.json` | Codex: the plugin's listing (name, icon, links and default prompts) |
| `.cursor-plugin/plugin.json` | Cursor |
| `gemini-extension.json` | Gemini CLI |
| `scripts/` | Local source checks and the explicit website parity check. No plugin runs them. |
| `AGENTS.md` | Local check default and Ops runner ownership |

## How each package runs the MCP server

| Package | MCP server |
| --- | --- |
| Claude Code plugin | The hosted endpoint `https://mcp.liendeadline.com/mcp` over Streamable HTTP. Nothing is installed or run locally, so the plugin also works in Cowork and the Claude apps. |
| Codex, Cursor and Gemini CLI | [`liendeadline-mcp`](https://github.com/LienDeadline/liendeadline-mcp), started locally over stdio with `npx -y liendeadline-mcp@<version>`. `mcp.json` and `gemini-extension.json` pin one exact release, and the package's published `npm-shrinkwrap.json` locks every dependency version. |
| The skill on its own | Any LienDeadline MCP server the user has connected, or a direct HTTPS call to the public API |

The plugins contain no API-key values. Supplier discovery and calculations through MCP or direct API require a dedicated caller key; completed calculations consume API plan allowance. State guides remain public. The Website's ordinary anonymous calculation allowance is separate.

## Editing the skill

- Report only what the API returns. A state guide, a research note or a plan is never a
  calculated date, and the skill must keep "needs review" results intact rather than filling them in.
- Don't add coverage claims, such as new states or state counts, until the API calculates them.
- Keep the `supplier-events-v2` request table in `SKILL.md` aligned with the serving contract.
  `scripts/validate.mjs` checks its fields, and `scripts/supplier-v2-contract.test.mjs` checks the
  synthetic examples.
- The same `SKILL.md` is published at https://liendeadline.com/skills/liendeadline/SKILL.md.
  Maintainers update that copy when the skill changes, and an explicitly requested live check reports any
  difference.

## Checks

Run these before every commit:

```bash
bash scripts/check-local.sh
```

`scripts/validate.mjs` runs offline: it reads no environment variables and makes no network
requests. The local entrypoint runs it and `node --test scripts/validate.test.mjs`,
then `git diff --check`. It accepts `NODE_EXECUTABLE`; no dependency installation is needed.
The [Ops runner](../liendeadline-ops/docs/local-ci.md) supplies its locked Node runtime and
records isolated local results. GitHub Actions and their schedule are removed. The validator checks:

- **The skill:** only Agent Skills frontmatter keys; `name` matches its folder; a description of
  1 to 1,024 characters; a compatibility note of at most 500 characters; `SKILL.md` under 500 lines.
- **The `supplier-events-v2` request table:** every required field, yes, no and unknown answers
  that keep unknown facts review-required, and no v1 blanket review flag. It also runs the
  synthetic contract examples.
- **Layout:** no root `SKILL.md`, which hides other skills from the skills CLI; no top-level `bin/`,
  which claude.ai refuses; no `.DS_Store` files.
- **Manifests:** one plugin name and version in every manifest; the Claude plugin's server is
  exactly the hosted endpoint; `mcp.json` and `gemini-extension.json` pin the same exact
  `liendeadline-mcp` release, 0.3.0 or later.
- **Listing details:** a square SVG icon of at least 128 px; https listing URLs in
  `.claude-plugin/plugin.json`; at least 40 words of README prose outside code blocks, which
  Anthropic's directory requires.

`node scripts/check-live.mjs` compares the website's copy of `SKILL.md` with this repository's.
Run it only for an explicitly authorized live parity task; it is excluded from the default
source gate. It fetches the fixed public website URL without customer credentials. There is no
automatic schedule or GitHub failure alert. The current script does not query npm; release pins
are checked statically by the offline validator.

### Former jobs

| Former workflow/job | Local replacement | Execution |
| --- | --- | --- |
| `validate.yml` / `validate` | `bash scripts/check-local.sh` | Default offline source gate |
| `validate.yml` / `live` | `node scripts/check-live.mjs` | Explicit live website parity task |

The old live job title also mentioned the pinned MCP release, but its script only fetched the
website copy. The offline validator continues to enforce exact matching MCP release pins.
No dependency install, formatter, audit or secret-scan job was defined here.

## Manifest notes

### Claude Code

- The server entry must stay exactly `{ "type": "http", "url": "https://mcp.liendeadline.com/mcp" }`.
  Claude's plugin directory holds any version whose plugin runs an npx package for manual review.
- Claude's directory reads `documentationUrl`, `supportUrl`, `privacyPolicyUrl` and
  `termsOfServiceUrl` from `.claude-plugin/plugin.json`; Claude Code ignores them.
- The marketplace name must not be a reserved name, and the plugin entry uses `"source": "./"`.

### Codex

- Codex loads the plugin from the root `plugin.json` and `mcp.json`, which declare the Agent
  Plugins `$schema`. Keep `plugin.json` to the fields Agent Plugins 1.0.0 allows.
- `.codex-plugin/plugin.json` adds the listing; older Codex releases read it instead of
  `plugin.json`. A wrongly typed field in it disables the whole plugin: `interface.defaultPrompt`
  is a list of at most three strings of up to 128 characters, and the other `interface` fields are
  strings.
- Paths must start with `./` and stay inside the repository. Codex ignores any others.
- Codex shows skill icons only from the skill's own `assets/` folder, so
  `skills/liendeadline/assets/icon.svg` must stay a byte-for-byte copy of `.claude-plugin/icon.svg`.

### Cursor

- Cursor reads `.cursor-plugin/plugin.json` and silently falls back to `.claude-plugin/plugin.json`
  when that file is invalid.
- Its schema allows only its listed fields, and only `name` and `email` for the author, so there is
  no `author.url` and no `$schema`.
- `logo` must be an existing path inside the repository, and `mcpServers` points at `./mcp.json`,
  which holds the pin.

## Versions and releases

Every manifest carries the same version, and `scripts/validate.mjs` enforces it. Claude Code
updates an installed plugin only when that version changes. Maintainers handle version bumps,
updates to the MCP pin and releases.
