// Developer/CI check, not part of the plugin's runtime: offline checks for the rules that skill
// directories and plugin reviewers enforce. It reads no environment variables and makes no network requests.
// Usage: node scripts/validate.mjs
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const errors = [];
const check = (ok, message) => { if (!ok) errors.push(message); };
const readJson = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));

// Agent Skills specification: only these frontmatter keys; claude.ai and skills-ref reject others.
const FRONTMATTER_KEYS = new Set(["name", "description", "license", "compatibility", "metadata", "allowed-tools"]);
const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function frontmatter(path) {
  const text = readFileSync(path, "utf8");
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) return { fields: null, text };
  const fields = {};
  for (const line of match[1].split("\n")) {
    if (/^\s/.test(line) || line.trim() === "") continue; // nested metadata values
    const [, field, value] = /^([^:]+):\s*(.*)$/.exec(line) ?? [];
    if (field) fields[field.trim()] = value.trim().replace(/^["']|["']$/g, "");
  }
  return { fields, text };
}

const skillsDir = join(root, "skills");
const skillDirs = readdirSync(skillsDir).filter((d) => statSync(join(skillsDir, d)).isDirectory());
check(skillDirs.length > 0, "skills/ contains no skills");
for (const dir of skillDirs) {
  const path = join(skillsDir, dir, "SKILL.md");
  const where = relative(root, path);
  if (!existsSync(path)) { errors.push(`${where} is missing`); continue; }
  const { fields, text } = frontmatter(path);
  if (!fields) { errors.push(`${where} has no YAML frontmatter`); continue; }
  for (const field of Object.keys(fields)) check(FRONTMATTER_KEYS.has(field), `${where}: unexpected frontmatter field "${field}"`);
  const { name = "", description = "", compatibility } = fields;
  check(name.length >= 1 && name.length <= 64 && NAME.test(name), `${where}: name "${name}" breaks the naming rule`);
  check(name === dir, `${where}: name "${name}" must equal its folder "${dir}"`);
  check(description.length >= 1 && description.length <= 1024, `${where}: description is ${description.length} characters (1-1024)`);
  check(compatibility === undefined || compatibility.length <= 500, `${where}: compatibility exceeds 500 characters`);
  check(text.split("\n").length <= 500, `${where}: keep SKILL.md under 500 lines`);
}

// The public skill is an API consumer. Keep its field table aligned with the
// serving supplier-events-v2 contract, including facts that block one deadline.
const supplierSkill = readFileSync(join(skillsDir, "liendeadline", "SKILL.md"), "utf8");
const requestTable = supplierSkill.split("## Request fields (`supplier-events-v2`)")[1]?.split("\n## ")[0] ?? "";
const requestRows = new Map(
  [...requestTable.matchAll(/^\| `([a-z_]+)` \|([^\n]*)$/gm)].map(([, field, details]) => [field, details]),
);
check(requestTable.length > 0, "liendeadline skill must document the supplier-events-v2 request");
check((requestRows.get("contract_version") ?? "").includes('"supplier-events-v2"'),
  "liendeadline skill must send supplier-events-v2, not a v1 request");
for (const field of [
  "contract_version", "state", "first_delivery_date", "last_delivery_date",
  "project_type", "hired_by", "deliveries_complete", "florida_final_payment_status",
  "florida_termination_status", "kansas_extension_status",
]) {
  check(requestRows.has(field), `liendeadline skill is missing the v2 ${field} request field`);
}
check(!requestRows.has("special_events_reviewed"), "liendeadline skill must not send the v1 blanket review flag");
for (const field of ["florida_final_payment_status", "florida_termination_status", "kansas_extension_status"]) {
  const details = requestRows.get(field) ?? "";
  check(["yes", "no", "unknown"].every((answer) => details.includes(`\`${answer}\``)),
    `${field} must document yes/no/unknown answers`);
  check(/unknown|omitted/.test(details) && /review_required/.test(details),
    `${field} must keep unknown facts review-required`);
}
for (const field of ["florida_final_payment_date", "florida_termination_date"]) {
  check(/matching `yes`/.test(requestRows.get(field) ?? ""), `${field} needs a matching yes answer`);
}
check(/direct HTTP/i.test(supplierSkill), "liendeadline skill must keep the direct HTTP v2 path");
check(/`calculate_supplier_deadlines` tool when its inputs include `florida_final_payment_status`/.test(supplierSkill) &&
    /lacks those event-answer inputs/.test(supplierSkill),
  "liendeadline skill may route deadline dates to the MCP calculator only when it accepts the v2 event answers");

// Layout rules: a root SKILL.md hides every other skill from the skills CLI; claude.ai refuses a
// top-level bin/; directory reviews reject .DS_Store files.
check(!existsSync(join(root, "SKILL.md")), "remove the root SKILL.md; skills belong in skills/<name>/");
check(!existsSync(join(root, "bin")), "remove the top-level bin/ directory");
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === ".git" || entry === "node_modules") continue;
    const path = join(dir, entry);
    check(entry !== ".DS_Store", `remove ${relative(root, path)}`);
    if (statSync(path).isDirectory()) walk(path);
  }
})(root);

// Manifests: one plugin name and version everywhere. Claude's plugin uses the hosted MCP server; the other
// manifests pin one exact release of liendeadline-mcp.
const claudePlugin = readJson(".claude-plugin/plugin.json");
const marketplace = readJson(".claude-plugin/marketplace.json");
const agentPlugin = readJson("plugin.json");
const agentMcp = readJson("mcp.json");
const gemini = readJson("gemini-extension.json");
const codexPlugin = readJson(".codex-plugin/plugin.json");
const cursorPlugin = readJson(".cursor-plugin/plugin.json");

const pluginName = claudePlugin.name;
const version = claudePlugin.version;
check(NAME.test(pluginName), `plugin name "${pluginName}" must be lowercase kebab-case`);
for (const [file, manifest] of [
  ["plugin.json", agentPlugin], ["gemini-extension.json", gemini],
  [".codex-plugin/plugin.json", codexPlugin], [".cursor-plugin/plugin.json", cursorPlugin],
]) {
  check(manifest.name === pluginName, `${file}: name must be "${pluginName}"`);
  check(manifest.version === version, `${file}: version ${manifest.version} must equal ${version}`);
}
const reserved = ["agent-skills", "claude-plugins-official", "claude-community", "npm", "github"];
check(!reserved.includes(marketplace.name) && !marketplace.name.startsWith("claudeai-"), `marketplace name "${marketplace.name}" is reserved`);
check(marketplace.owner?.name, "marketplace.json: owner.name is required");
const entry = marketplace.plugins?.find((p) => p.name === pluginName);
check(entry?.source === "./", `marketplace.json: plugin "${pluginName}" must use source "./"`);

check(agentPlugin.$schema === "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json", "plugin.json: unexpected $schema");
const agentPluginFields = ["$schema", "name", "version", "description", "author", "homepage", "repository", "license", "keywords", "extensions"];
for (const field of Object.keys(agentPlugin)) check(agentPluginFields.includes(field), `plugin.json: "${field}" is not allowed by Agent Plugins 1.0.0`);
check(agentMcp.$schema === "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json", "mcp.json: unexpected $schema");
for (const field of Object.keys(agentMcp)) check(["$schema", "mcpServers"].includes(field), `mcp.json: "${field}" is not allowed`);

// Claude's plugin connects to the hosted endpoint, which works in Claude Code, Cowork and the Claude
// apps. Claude's directory holds every version that runs an npx package for manual review.
const HOSTED = "https://mcp.liendeadline.com/mcp";
const claudeServer = claudePlugin.mcpServers?.liendeadline ?? {};
check(claudeServer.type === "http" && claudeServer.url === HOSTED && Object.keys(claudeServer).length === 2,
  `.claude-plugin/plugin.json: the liendeadline server must be exactly { "type": "http", "url": "${HOSTED}" }`);
// Anthropic's directory reads these listing fields from plugin.json; Claude Code ignores them.
for (const field of ["documentationUrl", "supportUrl", "privacyPolicyUrl", "termsOfServiceUrl"]) {
  check(/^https:\/\/\S+$/.test(claudePlugin[field] ?? ""), `.claude-plugin/plugin.json: ${field} must be an https:// URL`);
}

// The Agent Plugins and Gemini manifests start the server locally, pinned to one exact release.
const PIN = /^liendeadline-mcp@\d+\.\d+\.\d+$/;
const pins = new Set();
for (const [file, server] of [
  ["mcp.json", agentMcp.mcpServers?.liendeadline],
  ["gemini-extension.json", gemini.mcpServers?.liendeadline],
]) {
  if (!server) { errors.push(`${file}: missing the liendeadline MCP server`); continue; }
  check(server.command === "npx", `${file}: command must be exactly "npx"`);
  const pin = (server.args ?? []).find((arg) => arg.startsWith("liendeadline-mcp"));
  check(pin && PIN.test(pin), `${file}: pin liendeadline-mcp to an exact version`);
  if (pin) pins.add(pin);
}
check(agentMcp.mcpServers?.liendeadline?.type === "stdio", "mcp.json: server type must be stdio");
for (const [file, manifest] of [[".codex-plugin/plugin.json", codexPlugin], [".cursor-plugin/plugin.json", cursorPlugin]]) {
  check(manifest.mcpServers === "./mcp.json", `${file}: mcpServers must be "./mcp.json", which holds the pin`);
}
const pinList = Array.from(pins).join(", ");
check(pins.size <= 1, `MCP pins differ between manifests: ${pinList}`);
// The skill routes deadline dates to this pin, and releases before 0.3.0 send supplier-events-v1.
for (const pin of pins) {
  const [major, minor] = pin.split("@")[1].split(".").map(Number);
  check(major > 0 || minor >= 3, `${pin} sends supplier-events-v1; pin liendeadline-mcp 0.3.0 or later`);
}

// Claude's plugin directory shows .claude-plugin/icon.svg: a square SVG of at least 128 px.
const icon = existsSync(join(root, ".claude-plugin/icon.svg")) ? readFileSync(join(root, ".claude-plugin/icon.svg"), "utf8") : "";
const [, iconWidth, iconHeight] = /<svg[^>]*\bwidth="(\d+)"[^>]*\bheight="(\d+)"/.exec(icon) ?? [];
check(icon.startsWith("<svg") && iconWidth === iconHeight && Number(iconWidth) >= 128,
  ".claude-plugin/icon.svg must be a square SVG of at least 128 x 128 px");

// Codex takes the plugin from plugin.json and mcp.json and its listing from the
// .codex-plugin/plugin.json overlay, which older Codex releases read in their place. A wrongly
// typed overlay field disables the whole plugin, and Codex ignores paths that do not start with
// "./" or that leave the repository.
for (const [field, path] of Object.entries({
  skills: codexPlugin.skills,
  "interface.composerIcon": codexPlugin.interface?.composerIcon,
  "interface.logo": codexPlugin.interface?.logo,
})) {
  check(typeof path === "string" && path.startsWith("./") && !path.includes("..") && existsSync(join(root, path)),
    `.codex-plugin/plugin.json: ${field} must be an existing "./" path inside the repository`);
}
for (const [field, value] of Object.entries(codexPlugin.interface ?? {})) {
  const isList = ["defaultPrompt", "capabilities", "screenshots"].includes(field);
  check(isList ? Array.isArray(value) && value.every((item) => typeof item === "string") : typeof value === "string",
    `.codex-plugin/plugin.json: interface.${field} must be ${isList ? "a list of strings" : "a string"}`);
}
const prompts = Array.isArray(codexPlugin.interface?.defaultPrompt) ? codexPlugin.interface.defaultPrompt : [];
check(prompts.length <= 3 && prompts.every((prompt) => prompt.length <= 128),
  ".codex-plugin/plugin.json: Codex keeps at most 3 default prompts of at most 128 characters");

// Codex shows a skill's agents/openai.yaml icons only from that skill's own assets/ folder, so
// the icon there stays a byte-for-byte copy of .claude-plugin/icon.svg.
const openaiYamlPath = join(skillsDir, "liendeadline", "agents", "openai.yaml");
const openaiYaml = existsSync(openaiYamlPath) ? readFileSync(openaiYamlPath, "utf8") : "";
check(/^\s+display_name: \S/m.test(openaiYaml) && /^\s+short_description: \S/m.test(openaiYaml),
  "skills/liendeadline/agents/openai.yaml needs interface.display_name and short_description");
for (const [, field, path] of openaiYaml.matchAll(/^\s+(icon_small|icon_large): "?(.*?)"?$/gm)) {
  const copy = join(skillsDir, "liendeadline", path);
  check(/^(\.\/)?assets\//.test(path) && !path.includes("..") && existsSync(copy) && readFileSync(copy, "utf8") === icon,
    `openai.yaml: ${field} must point at a copy of .claude-plugin/icon.svg in the skill's assets/ folder`);
}

// Cursor reads .cursor-plugin/plugin.json and silently falls back to .claude-plugin/plugin.json
// when it is invalid. Cursor's plugin schema allows only these fields, and only a name and an
// email for the author.
const CURSOR_FIELDS = [
  "name", "displayName", "description", "version", "minClientVersions", "author", "publisher", "homepage", "repository",
  "license", "logo", "keywords", "category", "tags", "commands", "agents", "skills", "rules", "hooks", "variables", "mcpServers",
];
for (const field of Object.keys(cursorPlugin)) check(CURSOR_FIELDS.includes(field), `.cursor-plugin/plugin.json: "${field}" is not in Cursor's plugin schema`);
for (const field of Object.keys(cursorPlugin.author ?? {})) check(["name", "email"].includes(field), `.cursor-plugin/plugin.json: author.${field} is not in Cursor's plugin schema`);
for (const field of ["homepage", "repository"]) check(/^https:\/\/\S+$/.test(cursorPlugin[field] ?? ""), `.cursor-plugin/plugin.json: ${field} must be a URL`);
const cursorLogo = cursorPlugin.logo ?? "";
check(cursorLogo !== "" && !cursorLogo.startsWith("/") && !cursorLogo.includes("..") && existsSync(join(root, cursorLogo)),
  ".cursor-plugin/plugin.json: logo must be an existing path inside the repository");

// Anthropic's directory needs at least 40 words of README prose (code blocks excluded).
const prose = readFileSync(join(root, "README.md"), "utf8").replace(/```[\s\S]*?```/g, "");
check(prose.split(/\s+/).filter(Boolean).length >= 40, "README.md needs at least 40 words outside code blocks");
check(existsSync(join(root, "LICENSE")), "LICENSE is missing");

const supplierContractTest = spawnSync(
  process.execPath, ["--test", join(root, "scripts", "supplier-v2-contract.test.mjs")],
  { encoding: "utf8" },
);
if (supplierContractTest.status !== 0) {
  errors.push("supplier-events-v2 synthetic contract examples failed:\n" + supplierContractTest.stdout + supplierContractTest.stderr);
}

if (errors.length) {
  console.error(errors.map((e) => `- ${e}`).join("\n"));
  process.exit(1);
}
console.log(`OK: ${skillDirs.length} skill(s), plugin ${pluginName}@${version}, ${pinList}`);
