import type {
  HeroCompositionAuthoringInput,
  HeroCompositionField,
  HeroCompositionKind,
} from "./hero-composition-authoring";

type Fields = HeroCompositionAuthoringInput["fields"];

const frame = (
  expression: string,
  gaze: string,
  headTurn: string,
  headTilt: string,
  hairstyle: string,
  parting: string,
  shoulderPlacement: string,
  framing: string,
  bodyPose: string,
): Fields => ({
  expression,
  gaze,
  head_turn: headTurn,
  head_tilt: headTilt,
  hairstyle_arrangement: hairstyle,
  hair_parting: parting,
  hair_shoulder_placement: shoulderPlacement,
  framing,
  body_pose: bodyPose,
});

const seated = (
  supportObject: string,
  pelvisContact: string,
  leftLeg: string,
  rightLeg: string,
  leftFoot: string,
  rightFoot: string,
  weight: string,
  visibility: string,
  crop: string,
): Fields => ({
  support_object: supportObject,
  pelvis_contact: pelvisContact,
  left_leg_position: leftLeg,
  right_leg_position: rightLeg,
  left_foot_contact: leftFoot,
  right_foot_contact: rightFoot,
  weight_distribution: weight,
  limb_visibility: visibility,
  crop,
});

const fullBody = (
  leftLeg: string,
  rightLeg: string,
  leftFoot: string,
  rightFoot: string,
  weight: string,
  crop: string,
): Fields => ({
  left_leg_position: leftLeg,
  right_leg_position: rightLeg,
  left_foot_visibility: leftFoot,
  right_foot_visibility: rightFoot,
  weight_bearing: weight,
  crop_boundary: crop,
});

const overShoulder = (
  torso: string,
  shoulders: string,
  neck: string,
): Fields => ({
  torso_direction: torso,
  shoulder_direction: shoulders,
  neck_alignment: neck,
});

const hc = (
  packageId: string,
  heroCompositionId: string,
  kinds: readonly HeroCompositionKind[],
  ...fieldGroups: readonly Fields[]
): HeroCompositionAuthoringInput => ({
  packageId,
  heroCompositionId,
  kinds,
  fields: Object.assign({}, ...fieldGroups),
});

export const PRODUCTION_HERO_COMPOSITION_CONTRACTS: readonly HeroCompositionAuthoringInput[] = [
  hc("SP-004", "HC-001", ["seated"],
    frame("neutral relaxed expression with closed lips", "direct gaze into the camera", "head facing camera", "head upright with no lateral tilt", "soft straight blowout", "side part to the subject's left", "hair behind both shoulders", "close portrait with face and upper shoulders visible", "upright seated posture on a cafe chair with relaxed shoulders"),
    seated("visible cafe chair", "pelvis rests securely on the chair seat", "left knee bends naturally below the table", "right knee bends parallel to the left", "left foot rests flat on the cafe floor", "right foot rests flat on the cafe floor", "body weight rests mainly through the pelvis with both feet stabilizing", "both legs remain anatomically connected below the close crop", "intentional close crop excludes knees and feet while preserving a believable seated chain")),
  hc("SP-004", "HC-002", ["seated"],
    frame("subtle playful closed-lip smile", "gaze downward toward the dessert and spoon", "mild turn to camera right", "slight downward tilt", "low loose bun", "clean center part", "no hair over either shoulder", "medium portrait from chest to waist", "seated at the cafe table with torso angled toward the dessert"),
    seated("visible cafe chair", "pelvis visibly rests on the center of the chair seat", "left knee bends under the table", "right knee bends slightly behind the left", "left foot stays flat on the floor", "right forefoot and heel contact the floor", "weight rests on the pelvis with a small forward shift toward the table", "both thighs, knees and lower legs form continuous seated anatomy", "waist crop intentionally excludes feet while their floor contacts remain defined")),
  hc("SP-004", "HC-003", ["seated"],
    frame("warm open smile with visible teeth", "gaze slightly to camera left", "three-quarter turn to camera left", "subtle tilt toward the left shoulder", "loose polished waves", "clean center part", "hair over the left shoulder only", "three-quarter portrait framed to the knees", "relaxed seated cafe pose with torso open to the room"),
    seated("cafe chair at the table", "pelvis rests on the front half of the chair", "left leg bends forward with knee visible", "right leg angles slightly to the side", "left foot lies flat on the floor", "right foot contacts the floor slightly behind the left", "weight is shared between pelvis and left foot", "both knees, lower legs and ankles remain readable", "frame reaches the knees and preserves the implied continuation to both floor contacts")),
  hc("SP-004", "HC-004", ["portrait"],
    frame("thoughtful calm expression with closed lips", "gaze toward the cafe window", "mild turn to camera left", "head upright with no lateral tilt", "high ponytail", "brushed straight back with no visible parting", "hair falling naturally behind the back", "controlled wide knee-length environmental portrait", "standing near the cafe window with weight relaxed over the left leg")),

  hc("SP-005", "HC-001", ["full-body"],
    frame("light relaxed closed-lip smile", "gaze upward away from the camera with eyes softly narrowed against sunlight", "mild turn to the subject's right", "head resting level on the board", "loose wet waves", "clean center part", "hair spread behind the shoulders along the board", "top-down full-body aerial frame", "lying supine and aligned with the paddleboard"),
    fullBody("left leg extended naturally along the board", "right leg parallel to the left with slight knee relaxation", "entire left foot visible through the toes", "entire right foot visible through the toes", "body weight is supported by the back and hips on the board", "full body from head to both toes remains inside the board and frame")),
  hc("SP-005", "HC-002", ["portrait"],
    frame("focused confident expression with closed lips", "direct gaze into the camera", "head facing camera", "head upright with no lateral tilt", "wet hair brushed straight back", "brushed straight back with no visible parting", "no hair over either shoulder", "extreme close beauty portrait with face occupying 60-70 percent", "shoulders remain level at the waterline")),
  hc("SP-005", "HC-003", ["portrait"],
    frame("neutral relaxed editorial expression", "direct gaze into the camera", "mild turn to camera left", "slight tilt toward the lowered shoulder", "high ponytail", "side part to the subject's left", "hair falling behind the back", "medium portrait beside the vertical paddleboard", "standing beside the board with relaxed shoulders and weight over the right leg")),
  hc("SP-005", "HC-004", ["seated"],
    frame("warm open smile with visible teeth", "gaze slightly to camera right", "three-quarter turn to camera right", "head upright with no lateral tilt", "low loose bun", "side part to the subject's right", "no hair over either shoulder", "medium lifestyle portrait on the paddleboard", "upright cross-legged seated pose fully contained on the board"),
    seated("stable paddleboard surface", "pelvis rests visibly at the center of the board", "left leg folds cross-legged in front of the pelvis", "right leg folds beneath and beside the left", "left foot and ankle rest fully on the board surface", "right foot and ankle rest fully on the board surface", "weight rests through the pelvis and both folded legs", "both knees, ankles and feet remain visible and contained on the board", "medium crop includes the complete cross-legged pose")),

  hc("SP-006", "HC-001", ["seated"],
    frame("warm closed-lip smile", "direct gaze into the camera", "head facing camera", "head upright with no lateral tilt", "loose polished waves", "clean center part", "hair over the right shoulder only", "relaxed floor sitting portrait", "floor-seated with both knees folded to the subject's left"),
    seated("studio floor", "pelvis and left hip visibly contact the floor", "left knee bends outward to the left", "right knee folds behind the left leg", "left foot rests along its outer edge on the floor", "right foot and toes contact the floor behind the left calf", "weight rests through pelvis and left hip with one hand available for balance", "both legs remain separately readable from hips to feet", "frame includes both folded legs and feet")),
  hc("SP-006", "HC-002", ["seated"],
    frame("neutral relaxed expression with closed lips", "gaze slightly to camera left", "mild turn to camera left", "slight downward tilt", "low loose bun", "side part to the subject's left", "no hair over either shoulder", "medium seated studio portrait", "upright seated pose on the low cube with relaxed torso"),
    seated("neutral low studio cube", "pelvis rests visibly on the front half of the cube", "left knee bends in front of the cube", "right knee bends slightly behind the left", "left foot lies flat on the studio floor", "right forefoot and heel contact the floor beside the cube", "most weight rests on pelvis and left foot", "both knees, lower legs, ankles and feet remain connected and readable", "frame includes both feet completely")),
  hc("SP-006", "HC-003", ["portrait"],
    frame("warm open smile with visible teeth", "direct gaze into the camera", "mild turn to camera right", "head upright with no lateral tilt", "soft straight blowout", "clean center part", "hair behind both shoulders", "close portrait with face occupying about 60 percent", "upright portrait posture with shoulders softly visible")),
  hc("SP-006", "HC-004", ["seated"],
    frame("thoughtful calm expression with closed lips", "gaze slightly past camera right", "three-quarter turn to camera right", "subtle tilt toward the right shoulder", "high ponytail", "brushed straight back with no visible parting", "hair falling naturally behind the back", "relaxed floor sitting portrait", "floor-seated with left knee raised slightly and torso naturally angled"),
    seated("studio floor", "pelvis and right hip visibly contact the floor", "left knee bends upward in front of the torso", "right leg folds loosely beside the body", "left foot stays flat on the floor", "right foot rests along its outer edge on the floor", "weight rests through pelvis, right hip and left foot", "both legs remain separately readable from hips to ankles", "frame includes both knees, lower legs and feet")),

  hc("SP-007", "HC-001", ["portrait"],
    frame("warm closed-lip smile", "gaze slightly past the camera", "mild turn to camera right", "head upright with no lateral tilt", "low loose ponytail", "side part to the subject's left", "hair falling naturally behind the back", "medium portrait while walking near the water", "gentle walking step with torso open and shoulders relaxed")),
  hc("SP-007", "HC-002", ["portrait"],
    frame("subtle playful smile", "direct gaze into the camera", "head facing camera", "slight tilt toward the left shoulder", "loose textured waves", "clean center part", "hair behind both shoulders with a few wind-touched strands", "close wind portrait", "upright close portrait posture with hands outside the frame")),
  hc("SP-007", "HC-003", ["over-shoulder"],
    frame("thoughtful calm expression with a soft closed-lip smile", "gaze naturally back toward the photographer", "head turns moderately back toward camera left", "head remains upright with no lateral tilt", "low loose bun", "side part to the subject's right", "hair falls behind the back and does not cover the near shoulder", "three-quarter over-shoulder portrait", "standing near the water with a mild turn away from the camera"),
    overShoulder("torso turned 35 degrees away from the camera", "both shoulders follow the torso without twisting", "neck forms a natural continuous line with the upper spine during the return turn")),
  hc("SP-007", "HC-004", ["seated"],
    frame("thoughtful relaxed expression with closed lips", "gaze toward the horizon", "three-quarter turn to camera left", "slight upward tilt", "loose polished waves", "clean center part", "hair behind both shoulders", "relaxed sitting portrait near the shore", "seated near the shore with both hands supporting the torso behind the hips"),
    seated("firm shore rock or dry ground", "pelvis rests visibly on the stable shore surface", "left knee bends upward toward the torso", "right leg extends diagonally toward the water", "left foot lies flat on the ground", "right heel and sole contact the ground", "weight rests through pelvis and both supporting hands", "both legs remain readable from hips through ankles and feet", "frame includes both legs and both feet without a full-body distant crop")),

  hc("SP-008", "HC-001", ["portrait"],
    frame("focused serious expression with closed lips", "direct gaze into the camera", "head facing camera", "head upright with no lateral tilt", "soft straight blowout", "side part to the subject's left", "hair behind both shoulders", "medium-close city portrait", "upright portrait posture beside the stone wall with a small torso turn")),
  hc("SP-008", "HC-002", ["portrait"],
    frame("warm closed-lip smile", "gaze slightly to camera right", "mild turn to camera right", "subtle tilt toward the raised shoulder", "low loose bun", "clean center part", "no hair over either shoulder", "medium city portrait at the cafe facade", "relaxed standing lean with one hand in the jeans pocket")),
  hc("SP-008", "HC-003", ["seated"],
    frame("thoughtful calm expression with closed lips", "gaze into the distance along the canal", "three-quarter turn to camera left", "slight downward tilt", "high ponytail", "brushed straight back with no visible parting", "hair falling naturally behind the back", "medium seated embankment portrait", "half-sideways seated posture on the granite parapet"),
    seated("wide stable granite parapet", "pelvis rests visibly on the dry inner edge of the parapet", "left knee bends on the walkway side", "right leg lowers freely toward the walkway", "left foot lies flat on the walkway", "right foot contacts the walkway below the parapet", "weight rests through pelvis and supporting left hand", "both thighs, knees, lower legs and feet remain anatomically traceable", "medium crop keeps both leg continuations and floor contacts readable")),
  hc("SP-008", "HC-004", ["portrait"],
    frame("neutral confident expression with closed lips", "gaze slightly past camera left", "mild turn to camera left", "head upright with no lateral tilt", "loose polished waves", "side part to the subject's right", "hair over the left shoulder only", "vertical medium to three-quarter architectural portrait", "standing beside the columns with weight over the rear leg and a small side turn")),

  hc("SP-009", "HC-001", ["portrait"],
    frame("neutral confident expression with closed lips", "direct gaze into the camera", "head facing camera", "head upright with no lateral tilt", "soft straight blowout", "side part to the subject's left", "hair behind both shoulders", "chest-up editorial portrait", "upright chest-up posture with mild shoulder asymmetry")),
  hc("SP-009", "HC-002", ["seated"],
    frame("warm closed-lip smile", "gaze slightly to camera left", "mild turn to camera left", "slight downward tilt", "low loose bun", "clean center part", "no hair over either shoulder", "seated editorial portrait including both feet", "relaxed seated posture on a low matte cube with natural asymmetry"),
    seated("low matte studio cube", "pelvis visibly rests on the front half of the cube", "left knee bends naturally in front of the body", "right knee bends and sits slightly behind the left", "left foot lies flat on the floor in front of the cube", "right forefoot and toes contact the floor beside the cube", "most body weight rests on the pelvis and left foot", "both knees, lower legs, ankles and feet remain connected and readable", "frame includes both feet completely")),
  hc("SP-009", "HC-003", ["seated"],
    frame("focused serious expression with closed lips", "direct gaze into the camera", "mild turn to camera right", "head upright with no lateral tilt", "high ponytail", "brushed straight back with no visible parting", "hair falling naturally behind the back", "medium seated sofa portrait", "upright seated pose on the dark leather sofa with shoulders open"),
    seated("dark leather sofa seat", "pelvis rests fully against the sofa cushion", "left leg bends forward with knee aligned over the ankle", "right leg angles slightly outward from the sofa", "left foot stays flat on the floor", "right foot stays flat on the floor beside the left", "weight rests through pelvis and both feet with back lightly supported", "both legs remain separately visible from hips to feet", "medium frame includes both floor contacts")),
  hc("SP-009", "HC-004", ["seated"],
    frame("thoughtful calm expression with closed lips", "gaze slightly past camera right", "three-quarter turn to camera right", "subtle tilt toward the right shoulder", "loose polished waves", "side part to the subject's right", "hair over the right shoulder only", "luxury seated sofa editorial portrait", "seated deeper in the light designer sofa with elegant crossed legs"),
    seated("large light designer sofa", "pelvis rests deeply and visibly in the sofa cushion", "left leg crosses over the right at the knee", "right knee bends forward and supports the crossed pose", "left foot hangs naturally clear of the floor with ankle visible", "right foot rests flat on the floor", "weight rests through pelvis, sofa back and right foot", "both thighs, knees, lower legs and feet remain separately traceable", "frame includes the complete crossed-leg pose and both feet")),

  hc("SP-010", "HC-001", ["portrait"],
    frame("focused serious expression with closed lips", "direct gaze into the camera", "head facing camera", "head upright with no lateral tilt", "loose textured curls", "clean center part", "hair behind both shoulders", "tight close portrait with face occupying about 60 percent", "upright close portrait posture with hands outside frame")),
  hc("SP-010", "HC-002", ["portrait"],
    frame("neutral confident expression with closed lips", "gaze slightly to camera left", "mild turn to camera left", "subtle tilt toward the left shoulder", "low loose bun", "side part to the subject's left", "no hair over either shoulder", "standing three-quarter portrait", "standing with relaxed shoulders and weight over the left leg")),
  hc("SP-010", "HC-003", ["seated"],
    frame("thoughtful calm expression with closed lips", "gaze downward toward the red apple", "three-quarter turn to camera right", "slight downward tilt", "soft straight blowout", "clean center part", "hair behind both shoulders", "three-quarter seated chair portrait", "upright seated posture holding one red apple at lap level"),
    seated("simple studio chair", "pelvis rests visibly on the center of the chair seat", "left knee bends forward under the apple", "right knee angles slightly to the side", "left foot lies flat on the studio floor", "right foot lies flat on the floor slightly behind the left", "weight rests through pelvis and both feet", "both legs and feet remain separately readable beneath the dress", "three-quarter crop includes both lower legs and feet")),
  hc("SP-010", "HC-004", ["seated"],
    frame("warm closed-lip smile", "gaze slightly past camera right", "mild turn to camera right", "head upright with no lateral tilt", "loose polished waves", "side part to the subject's right", "hair over the left shoulder only", "editorial sitting portrait with the dress spread around", "floor-seated on a low dark podium with the dress arranged around both legs"),
    seated("low dark podium or studio floor", "pelvis and both hips rest visibly on the stable podium surface", "left leg folds diagonally beneath the dress", "right leg bends outward under a separate section of fabric", "left foot rests on the podium beneath the dress hem", "right foot rests on the podium beneath a separate dress fold", "weight rests through pelvis and both hips", "both leg paths remain anatomically separate and readable through the fabric drape", "wide seated crop contains the complete dress spread and both concealed foot positions")),
] as const;

const contractByKey = new Map(
  PRODUCTION_HERO_COMPOSITION_CONTRACTS.map((contract) => [`${contract.packageId}/${contract.heroCompositionId}`, contract]),
);

export function getHeroCompositionContract(packageId: string, heroCompositionId: string): HeroCompositionAuthoringInput {
  const contract = contractByKey.get(`${packageId}/${heroCompositionId}`);
  if (!contract) throw new Error(`Hero Composition contract not found: ${packageId}/${heroCompositionId}`);
  return contract;
}

export function renderHeroCompositionContract(packageId: string, heroCompositionId: string): string {
  const contract = getHeroCompositionContract(packageId, heroCompositionId);
  const fields = Object.keys(contract.fields) as HeroCompositionField[];
  return [
    "structured_contract_authoritative: all earlier legacy alternatives or prohibitions about expression, gaze, head pose, hairstyle arrangement, parting, hair shoulder placement, framing, body pose and anatomy are superseded and must be ignored; only the following positive frame targets apply",
    ...fields.map((field) => `${field}: ${contract.fields[field]}`),
  ].join(". ") + ".";
}
