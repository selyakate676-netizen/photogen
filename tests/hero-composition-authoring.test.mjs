import assert from "node:assert/strict";
import test from "node:test";

import {
  validateHeroCompositionAuthoring,
  validateHeroCompositionPack,
} from "../src/lib/ai/hero-composition-authoring.ts";

const validPortraitFields = {
  expression: "warm open smile with visible teeth",
  gaze: "direct gaze into camera",
  head_turn: "head facing the camera",
  head_tilt: "head upright with no lateral tilt",
  hairstyle_arrangement: "loose low bun",
  hair_parting: "clean center part",
  hair_shoulder_placement: "no hair over either shoulder",
  framing: "chest-up portrait",
  body_pose: "relaxed upright posture with mild shoulder asymmetry",
};

const composition = (overrides = {}, kinds = ["portrait"], id = "HC-001") => ({
  packageId: "SP-TEST",
  heroCompositionId: id,
  kinds,
  fields: { ...validPortraitFields, ...overrides },
});

test("portrait without hairstyle parting is rejected", () => {
  assert.ok(validateHeroCompositionAuthoring(composition({ hair_parting: undefined })).some((issue) => issue.field === "hair_parting"));
});

test("portrait with concrete hairstyle targets passes", () => {
  assert.deepEqual(validateHeroCompositionAuthoring(composition()), []);
});

test("seated without one foot contact is rejected", () => {
  const fields = {
    ...validPortraitFields,
    support_object: "low matte cube",
    pelvis_contact: "pelvis visibly supported by the cube",
    left_leg_position: "left knee bent in front of the cube",
    right_leg_position: "right lower leg extends slightly behind the left",
    left_foot_contact: "left foot flat on floor",
    weight_distribution: "weight shared by pelvis and both feet",
    limb_visibility: "both lower legs visible from knees to ankles",
    crop: "full seated figure including both feet",
  };
  assert.ok(validateHeroCompositionAuthoring(composition(fields, ["seated"])).some((issue) => issue.field === "right_foot_contact"));
});

test("seated with explicit support, legs and feet passes", () => {
  const fields = {
    ...validPortraitFields,
    support_object: "low matte cube",
    pelvis_contact: "pelvis visibly supported by the cube",
    left_leg_position: "left knee bent in front of the cube",
    right_leg_position: "right lower leg slightly behind the left",
    left_foot_contact: "left foot flat on floor",
    right_foot_contact: "right foot flat on floor behind the left",
    weight_distribution: "weight shared by pelvis and both feet",
    limb_visibility: "both lower legs visible from knees to ankles",
    crop: "full seated figure including both feet",
  };
  assert.deepEqual(validateHeroCompositionAuthoring(composition(fields, ["seated"])), []);
});

test("full-body without second foot visibility is rejected", () => {
  const fields = {
    ...validPortraitFields,
    left_leg_position: "left leg straight and weight bearing",
    right_leg_position: "right leg relaxed slightly behind",
    left_foot_visibility: "left foot fully visible",
    weight_bearing: "body weight over left leg",
    crop_boundary: "frame includes the floor below both feet",
  };
  assert.ok(validateHeroCompositionAuthoring(composition(fields, ["full-body"])).some((issue) => issue.field === "right_foot_visibility"));
});

test("over-shoulder without neck alignment is rejected", () => {
  const fields = {
    ...validPortraitFields,
    torso_direction: "torso turned 30 degrees away from camera",
    shoulder_direction: "shoulders follow the torso turn",
  };
  assert.ok(validateHeroCompositionAuthoring(composition(fields, ["over-shoulder"])).some((issue) => issue.field === "neck_alignment"));
});

test("pack with identical expression gaze and head pose is rejected", () => {
  const issues = validateHeroCompositionPack({
    packageId: "SP-TEST",
    compositions: [composition({}, ["portrait"], "HC-001"), composition({}, ["portrait"], "HC-002")],
  });
  assert.ok(issues.some((issue) => issue.code === "PACK_LACKS_VARIATION"));
});

test("pack with explicit frame variation passes", () => {
  const issues = validateHeroCompositionPack({
    packageId: "SP-TEST",
    compositions: [
      composition({}, ["portrait"], "HC-001"),
      composition({
        expression: "calm thoughtful closed-mouth expression",
        gaze: "gaze directed left of camera",
        head_turn: "head turned 20 degrees left",
        head_tilt: "slight tilt toward left shoulder",
        hairstyle_arrangement: "hair in a high ponytail",
        hair_parting: "brushed straight back with no visible parting",
      }, ["portrait"], "HC-002"),
    ],
  });
  assert.deepEqual(issues, []);
});

test("package-locked hairstyle cannot inherit from Persona references", () => {
  const issues = validateHeroCompositionPack({
    packageId: "SP-TEST",
    compositions: [composition({}, ["portrait"], "HC-001"), composition({ expression: "soft smile" }, ["portrait"], "HC-002")],
    hairstylePolicy: "package_locked",
    packageHairstyleTarget: "same as Persona references",
  });
  assert.ok(issues.some((issue) => issue.code === "PACKAGE_HAIRSTYLE_INHERITS_REFERENCE"));
});
