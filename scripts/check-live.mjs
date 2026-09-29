// Network checks run on a schedule: the website serves the same SKILL.md as this repository,
// and the MCP server release pinned by the plugins exists on npm.
// Usage: node scripts/check-live.mjs
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const errors = [];

const local = readFileSync(join(root, "skills/liendeadline/SKILL.md"), "utf8");
const siteUrl = "https://liendeadline.com/skills/liendeadline/SKILL.md";
const site = await fetch(siteUrl, { redirect: "error" });
if (!site.ok) errors.push(`${siteUrl} returned ${site.status}`);
else if ((await site.text()) !== local) {
  errors.push(`${siteUrl} differs from skills/liendeadline/SKILL.md; update the website's public/skills copy`);
}

const pin = JSON.parse(readFileSync(join(root, "mcp.json"), "utf8"))
  .mcpServers.liendeadline.args.find((arg) => arg.startsWith("liendeadline-mcp@"));
const version = pin.split("@")[1];
const npm = await fetch(`https://registry.npmjs.org/liendeadline-mcp/${version}`);
if (!npm.ok) errors.push(`npm has no ${pin} (HTTP ${npm.status}); the plugins cannot start the MCP server`);

if (errors.length) {
  console.error(errors.map((e) => `- ${e}`).join("\n"));
  process.exit(1);
}
console.log(`OK: website copy matches; ${pin} is on npm`);
