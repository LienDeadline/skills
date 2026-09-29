// Offline checks for the rules that skill directories and plugin reviewers enforce.
// Usage: node scripts/validate.mjs
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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
    const [, key, value] = /^([^:]+):\s*(.*)$/.exec(line) ?? [];
    if (key) fields[key.trim()] = value.trim().replace(/^["']|["']$/g, "");
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
  for (const key of Object.keys(fields)) check(FRONTMATTER_KEYS.has(key), `${where}: unexpected frontmatter key "${key}"`);
  const { name = "", description = "", compatibility } = fields;
  check(name.length >= 1 && name.length <= 64 && NAME.test(name), `${where}: name "${name}" breaks the naming rule`);
  check(name === dir, `${where}: name "${name}" must equal its folder "${dir}"`);
  check(description.length >= 1 && description.length <= 1024, `${where}: description is ${description.length} characters (1-1024)`);
  check(compatibility === undefined || compatibility.length <= 500, `${where}: compatibility exceeds 500 characters`);
  check(text.split("\n").length <= 500, `${where}: keep SKILL.md under 500 lines`);
}

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

// Manifests: one plugin name and version everywhere, and one exactly pinned MCP server release.
const claudePlugin = readJson(".claude-plugin/plugin.json");
const marketplace = readJson(".claude-plugin/marketplace.json");
const agentPlugin = readJson("plugin.json");
const agentMcp = readJson("mcp.json");
const gemini = readJson("gemini-extension.json");

const pluginName = claudePlugin.name;
const version = claudePlugin.version;
check(NAME.test(pluginName), `plugin name "${pluginName}" must be lowercase kebab-case`);
for (const [file, manifest] of [["plugin.json", agentPlugin], ["gemini-extension.json", gemini]]) {
  check(manifest.name === pluginName, `${file}: name must be "${pluginName}"`);
  check(manifest.version === version, `${file}: version ${manifest.version} must equal ${version}`);
}
const reserved = ["agent-skills", "claude-plugins-official", "claude-community", "npm", "github"];
check(!reserved.includes(marketplace.name) && !marketplace.name.startsWith("claudeai-"), `marketplace name "${marketplace.name}" is reserved`);
check(marketplace.owner?.name, "marketplace.json: owner.name is required");
const entry = marketplace.plugins?.find((p) => p.name === pluginName);
check(entry?.source === "./", `marketplace.json: plugin "${pluginName}" must use source "./"`);

check(agentPlugin.$schema === "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json", "plugin.json: unexpected $schema");
const agentPluginKeys = ["$schema", "name", "version", "description", "author", "homepage", "repository", "license", "keywords", "extensions"];
for (const key of Object.keys(agentPlugin)) check(agentPluginKeys.includes(key), `plugin.json: "${key}" is not allowed by Agent Plugins 1.0.0`);
check(agentMcp.$schema === "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json", "mcp.json: unexpected $schema");
for (const key of Object.keys(agentMcp)) check(["$schema", "mcpServers"].includes(key), `mcp.json: "${key}" is not allowed`);

const PIN = /^liendeadline-mcp@\d+\.\d+\.\d+$/;
const pins = new Set();
for (const [file, server] of [
  [".claude-plugin/plugin.json", claudePlugin.mcpServers?.liendeadline],
  ["mcp.json", agentMcp.mcpServers?.liendeadline],
  ["gemini-extension.json", gemini.mcpServers?.liendeadline],
]) {
  if (!server) { errors.push(`${file}: missing the liendeadline MCP server`); continue; }
  check(server.command === "npx", `${file}: command must be the single token "npx"`);
  const pin = (server.args ?? []).find((arg) => arg.startsWith("liendeadline-mcp"));
  check(pin && PIN.test(pin), `${file}: pin liendeadline-mcp to an exact version`);
  if (pin) pins.add(pin);
}
check(agentMcp.mcpServers?.liendeadline?.type === "stdio", "mcp.json: server type must be stdio");
check(pins.size <= 1, `MCP pins differ between manifests: ${[...pins].join(", ")}`);

// Anthropic's directory needs at least 40 words of README prose (code blocks excluded).
const prose = readFileSync(join(root, "README.md"), "utf8").replace(/```[\s\S]*?```/g, "");
check(prose.split(/\s+/).filter(Boolean).length >= 40, "README.md needs at least 40 words outside code blocks");
check(existsSync(join(root, "LICENSE")), "LICENSE is missing");

if (errors.length) {
  console.error(errors.map((e) => `- ${e}`).join("\n"));
  process.exit(1);
}
console.log(`OK: ${skillDirs.length} skill(s), plugin ${pluginName}@${version}, ${[...pins][0]}`);
