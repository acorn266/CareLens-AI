// Regression tests for emergency detection (run with `npm test`).
// All examples are fictional.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { emergencyIntelligence } from "../lib/emergency-intelligence.ts";

const detect = (text) => emergencyIntelligence.detectEmergency(text);

const expectNoAlert = (text) =>
  assert.equal(detect(text), null, `expected no alert for: ${text}`);

const expectAlert = (text, severity, symptom) => {
  const alert = detect(text);
  assert.ok(alert, `expected an alert for: ${text}`);
  assert.equal(alert.severity, severity, `severity for: ${text}`);
  if (symptom) assert.deepEqual(alert.symptoms, [symptom], `symptom for: ${text}`);
  return alert;
};

test("no alert for mild symptoms", () => {
  expectNoAlert("I have a mild headache.");
  expectNoAlert("I've had a runny nose and a slight cough since Monday.");
});

test("no alert for general-information questions", () => {
  expectNoAlert("What are the warning signs of a head injury?");
  expectNoAlert("What are the side effects of ibuprofen?");
  expectNoAlert("Can a head injury cause headaches later?");
  expectNoAlert("How do doctors treat a stroke?");
  expectNoAlert("Tell me about the symptoms of a heart attack.");
});

test("no alert when the user denies a symptom", () => {
  expectNoAlert("I do not have chest pain.");
  expectNoAlert("I don't have any chest pain.");
  expectNoAlert("No chest pain or trouble breathing.");
  expectNoAlert("I've never had a seizure.");
  expectNoAlert("My cough is better, without any chest pain.");
  expectNoAlert("I'm not sure why, but I don't think I have chest pain.");
});

test("critical alert for severe chest pain and difficulty breathing", () => {
  const alert = expectAlert(
    "I have severe chest pain and difficulty breathing.",
    "CRITICAL",
    "chest pain"
  );
  assert.equal(alert.type, "MEDICAL");
  assert.ok(alert.recommendations.some((r) => r.includes("911")));
});

test("critical alert for stroke signs without the word 'stroke'", () => {
  const alert = expectAlert(
    "I suddenly cannot speak properly and one side of my face is drooping.",
    "CRITICAL",
    "stroke symptoms"
  );
  assert.equal(alert.locationRequired, true);
  expectAlert("My speech is slurred and I have weakness on one side.", "CRITICAL");
  expectAlert("I think I'm having a stroke", "CRITICAL", "stroke");
});

test("negation only applies to its own clause", () => {
  expectAlert("No chest pain, but I can't breathe.", "CRITICAL", "difficulty breathing");
  expectAlert(
    "I don't have chest pain but I have difficulty breathing.",
    "CRITICAL",
    "difficulty breathing"
  );
  expectAlert(
    "I'm not sure, but I think I'm having a heart attack.",
    "CRITICAL",
    "heart attack"
  );
});

test("worried questions about the user's own situation still alert", () => {
  expectAlert("Is this a heart attack?", "CRITICAL", "heart attack");
  expectAlert("Am I having a stroke?", "CRITICAL", "stroke");
});

test("real reports still alert when mixed with questions or third parties", () => {
  expectAlert("What should I do? My face is drooping.", "CRITICAL", "stroke symptoms");
  expectAlert("My dad just collapsed and is unconscious.", "CRITICAL", "unconscious");
  expectAlert("I can’t breathe", "CRITICAL", "difficulty breathing");
});

test("high-priority alert for personal, non-critical concerns", () => {
  expectAlert("I'm having side effects from my new medication.", "HIGH", "side effects");
  expectAlert("I have the worst headache of my life.", "HIGH", "intense headache");
});

test("mental health crises always surface crisis resources", () => {
  const alert = expectAlert("I want to die.", "CRITICAL", "want to die");
  assert.equal(alert.type, "MENTAL_HEALTH");
  assert.ok(alert.recommendations.some((r) => r.includes("988")));

  // Still shown for questions, by design
  const question = expectAlert("What are the warning signs of suicide?", "CRITICAL");
  assert.equal(question.type, "MENTAL_HEALTH");

  const ending = expectAlert("I've been thinking about ending it all.", "CRITICAL");
  assert.equal(ending.type, "MENTAL_HEALTH");
});

test("API routes only run emergency detection on the user's own input", () => {
  // AI responses list warning signs as safety advice ("seek care if you have a
  // head injury"), so routes must never pass model output to detectEmergency.
  const apiDir = join(import.meta.dirname, "..", "app", "api");
  const allowedArguments = new Set(["message", "transcript"]);

  for (const route of readdirSync(apiDir)) {
    const file = join(apiDir, route, "route.ts");
    let source;
    try {
      source = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const [, argument] of source.matchAll(/detectEmergency\(\s*([^)]*?)\s*\)/g)) {
      assert.ok(
        allowedArguments.has(argument),
        `app/api/${route}/route.ts passes "${argument}" to detectEmergency; only user input is allowed`
      );
    }
  }
});
