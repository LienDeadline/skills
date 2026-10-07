import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");

for (const [name, newline] of [["LF", "\n"], ["CRLF", "\r\n"]]) {
  test(`offline validation accepts ${name} and still rejects invalid skill content`, (t) => {
    const copy = mkdtempSync(join(tmpdir(), "liendeadline-skills-"));
    t.after(() => rmSync(copy, { recursive: true, force: true }));
    cpSync(root, copy, { recursive: true, filter: (path) => ![".git", "node_modules"].includes(path.split(/[\\/]/).at(-1)) });
    const skillPath = join(copy, "skills/liendeadline/SKILL.md");
    const original = readFileSync(skillPath, "utf8").replace(/\r\n/g, "\n");
    const run = (content) => {
      writeFileSync(skillPath, content.replace(/\n/g, newline));
      // Let the validator launch its own node:test process outside this test runner.
      const env = { ...process.env };
      delete env.NODE_TEST_CONTEXT;
      const result = spawnSync(process.execPath, [join(copy, "scripts/validate.mjs")], { encoding: "utf8", env });
      assert.ifError(result.error);
      return result;
    };

    const valid = run(original);
    assert.equal(valid.status, 0, valid.stdout + valid.stderr);
    assert.match(valid.stdout, /OK: 1 skill\(s\)/);

    const invalidName = run(original.replace("name: liendeadline", "name: invalid_name"));
    assert.equal(invalidName.status, 1);
    assert.match(invalidName.stderr, /breaks the naming rule/);

    const invalidExample = run(original.replace('"id": "fl_known_no"', '"id": "unknown_case"'));
    assert.equal(invalidExample.status, 1);
    assert.match(invalidExample.stderr, /synthetic contract examples failed/);
  });
}
