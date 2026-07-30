import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  IDENTITY_REFERENCE_POLICY,
  selectPersonaReferenceKeys,
} from "../src/lib/ai/persona-reference-policy.ts";

test("selects one reference when Persona has one photo", () => {
  assert.deepEqual(selectPersonaReferenceKeys(["photo-1"]), ["photo-1"]);
});

test("selects two references when Persona has two photos", () => {
  assert.deepEqual(selectPersonaReferenceKeys(["photo-1", "photo-2"]), ["photo-1", "photo-2"]);
});

test("limits three or more Persona photos to two references", () => {
  assert.deepEqual(selectPersonaReferenceKeys(["photo-1", "photo-2", "photo-3"]), ["photo-1", "photo-2"]);
});

test("removes duplicate keys while preserving deterministic order", () => {
  assert.deepEqual(selectPersonaReferenceKeys(["photo-2", "photo-2", "photo-1"]), ["photo-2", "photo-1"]);
});

test("returns an empty list for an empty Persona snapshot", () => {
  assert.deepEqual(selectPersonaReferenceKeys([]), []);
});

test("identity policy keeps scene-controlled attributes out of references", () => {
  for (const attribute of ["head angle", "gaze", "expression", "hairstyle", "pose", "composition"]) {
    assert.match(IDENTITY_REFERENCE_POLICY, new RegExp(attribute, "i"));
  }
  assert.match(IDENTITY_REFERENCE_POLICY, /identity references only/i);
  assert.match(IDENTITY_REFERENCE_POLICY, /scene instructions exclusively/i);
});

test("photoshoot creation no longer sends a hardcoded dark hair color", async () => {
  const source = await readFile(new URL("../src/app/dashboard/new/actions.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /p_hair_color\s*:\s*["']dark["']/);
});
