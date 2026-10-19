import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Source-derived synthetic fixtures, not a second calculation engine or live acceptance.
// Captured with a fixed 2026-06-01 clock from liendeadline-api main
// eb38fc78c791fe10db1b44eb2b0d44306c02d0cd, api/services/supplier_deadlines.py;
// api/test_supplier_event_questions.py checks the same v2 review branches.
const sharedFacts = {
  contract_version: "supplier-events-v2",
  role: "supplier",
  first_delivery_date: "2026-06-01",
  last_delivery_date: "2026-08-14",
  project_type: "commercial",
  hired_by: "contractor",
  deliveries_complete: true,
};
const sourceCases = {
  fl_known_no: {
    state: "FL",
    answers: { florida_final_payment_status: "no", florida_termination_status: "no" },
    result: { status: "calculated", preliminary_notice: ["calculated", "2026-07-16"], lien_filing: ["calculated", "2026-11-12"] },
  },
  fl_payment_unknown: {
    state: "FL",
    answers: { florida_final_payment_status: "unknown", florida_termination_status: "no" },
    result: { status: "review_required", preliminary_notice: ["review_required", null], lien_filing: ["calculated", "2026-11-12"] },
  },
  fl_termination_yes: {
    state: "FL",
    answers: { florida_final_payment_status: "no", florida_termination_status: "yes" },
    result: { status: "review_required", preliminary_notice: ["calculated", "2026-07-16"], lien_filing: ["review_required", null] },
  },
  ks_known_no: {
    state: "KS",
    answers: { kansas_extension_status: "no" },
    result: { status: "calculated", preliminary_notice: ["not_required", null], lien_filing: ["calculated", "2026-11-14"] },
  },
  ks_extension_unknown: {
    state: "KS",
    answers: { kansas_extension_status: "unknown" },
    result: { status: "review_required", preliminary_notice: ["not_required", null], lien_filing: ["review_required", null] },
  },
  ks_extension_yes: {
    state: "KS",
    answers: { kansas_extension_status: "yes" },
    result: { status: "review_required", preliminary_notice: ["not_required", null], lien_filing: ["review_required", null] },
  },
};

function readExamples() {
  const skill = readFileSync(new URL("../skills/liendeadline/SKILL.md", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const match = /## Same-facts examples \(synthetic\)[\s\S]*?```json\n([\s\S]*?)\n```/.exec(skill);
  assert.ok(match, "the skill must include the checked synthetic v2 examples");
  return JSON.parse(match[1]);
}

function documentedResult(result) {
  const deadline = ([status, date]) => date === null ? { status, deadline: null } : { status };
  return {
    status: result.status,
    preliminary_notice: deadline(result.preliminary_notice),
    lien_filing: deadline(result.lien_filing),
  };
}

test("same delivery facts produce exact v2 requests without the blanket review flag", () => {
  const examples = readExamples();
  assert.deepEqual(examples.shared_facts, sharedFacts);
  assert.deepEqual(examples.cases.map(({ id }) => id).sort(), Object.keys(sourceCases).sort());
  for (const sample of examples.cases) {
    const checked = sourceCases[sample.id];
    assert.equal(sample.state, checked.state, sample.id);
    assert.deepEqual(sample.answers, checked.answers, sample.id);
    const outgoing = { ...examples.shared_facts, state: sample.state, ...sample.answers };
    assert.deepEqual(outgoing, { ...sharedFacts, state: checked.state, ...checked.answers }, sample.id);
    assert.equal(Object.hasOwn(outgoing, "special_events_reviewed"), false, sample.id);
    assert.equal(Object.hasOwn(outgoing, "florida_final_payment_date"), false, sample.id);
    assert.equal(Object.hasOwn(outgoing, "florida_termination_date"), false, sample.id);
  }
});

test("the documented per-deadline outcomes match fixed API source fixtures", () => {
  for (const sample of readExamples().cases) {
    const result = sourceCases[sample.id].result;
    assert.deepEqual(sample.expected, documentedResult(result), sample.id);
    for (const name of ["preliminary_notice", "lien_filing"]) {
      const [status, date] = result[name];
      if (status === "review_required" || status === "not_required") {
        assert.equal(date, null, `${sample.id} ${name} must not carry a date`);
        assert.equal(sample.expected[name].deadline, null, `${sample.id} ${name} must document no date`);
      } else {
        assert.match(date, /^\d{4}-\d{2}-\d{2}$/, `${sample.id} ${name}`);
      }
    }
  }
});
