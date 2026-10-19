import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const SKILL_PATH = new URL("../skills/liendeadline/SKILL.md", import.meta.url);


test("v3 skill reports only verified returned action targets while retaining review and v2 no-date guidance", () => {
  const skill = readFileSync(SKILL_PATH, "utf8");
  const v3 = skill.split("## Jurisdiction-specific discovery (`supplier-events-v3`)")[1].split("## Existing delivery-event workflow")[0];
  for (const invariant of [
    "only when it is explicitly returned in a verified v3 outcome", "`status=review_required`",
    "`reason_code=conservative_action_date`", "valid `YYYY-MM-DD`", "no later than every returned raw candidate",
    "nonempty source attribution", "complete nonempty `candidate_deadlines`",
    "`deadline`, `days_from_now` and `required` must remain `null`",
    "**Conservative action date**", "**Qualified review required**", "`critical_warnings`",
    "statutory deadline remains unresolved", "Do not show a statutory countdown",
    "offer a deadline-summary PDF", "Never infer an action date from candidates, guides or memory",
    "If `action_by` is absent, no action date is available", "verification error",
  ]) assert.ok(v3.includes(invariant), invariant);
  const v2 = skill.split("## Existing delivery-event workflow")[1];
  assert.ok(v2.includes("`review_required` (no date; `description` says why)"));
  assert.ok(v2.includes("Never fill a failed or `review_required` result with dates from a state guide or from memory"));
});
