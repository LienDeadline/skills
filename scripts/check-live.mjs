// Developer/CI check, not part of the plugin's runtime. It reads no environment variables and
// sends nothing: it downloads the website's published copy of the skill from a fixed public URL
// and compares it with this repository's copy.
// Usage: node scripts/check-live.mjs
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const SITE_COPY = "https://liendeadline.com/skills/liendeadline/SKILL.md";
const root = resolve(import.meta.dirname, "..");
const repoCopy = readFileSync(join(root, "skills/liendeadline/SKILL.md"), "utf8");

const response = await fetch(SITE_COPY, { redirect: "error" });
if (!response.ok) {
  console.error(`- ${SITE_COPY} returned HTTP ${response.status}`);
  process.exit(1);
}
if ((await response.text()) !== repoCopy) {
  console.error(`- ${SITE_COPY} differs from skills/liendeadline/SKILL.md; update the website's public/skills copy`);
  process.exit(1);
}
console.log("OK: the website serves the same SKILL.md");
