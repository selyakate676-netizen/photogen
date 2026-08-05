# Photo Pack Quick Authoring Template

Use this compact form to draft one four-frame Photo Pack in one pass. The complete normative authoring reference is [`PACK_AUTHORING_TEMPLATE.md`](./PACK_AUTHORING_TEMPLATE.md).

- This quick form does not replace `PHOTO_PACK_SPECIFICATION_V1.md` or create a second schema.
- If instructions conflict, the frozen specification takes priority, followed by the full template.
- Fill only conditional anatomy fields activated by the current HC `kinds`.
- Do not copy the frozen identity core, PERSONA_APPEARANCE, REALISM or provider instructions into a pack file.
- Labels marked **authoring guidance** are working notes, not serialized contract fields.

## 1. PACK

- `pack_id`: `[stable unique identifier]`
- `name`: `[pack name]`
- Workflow status — **authoring guidance**: `draft`
- Catalog status — **authoring guidance**: `inactive`
- `applicability`: `participant_count: [single | two | group]`; `participant_group: [individual | couple | mother_and_adult_daughter | friends | family | parent_and_child | custom_group]`; `age_scope: [adult | child | mixed | universal]`; `gender_scope: [female | male | mixed | universal]`
- Commercial purpose / JTBD — **authoring guidance**: `[user, situation and desired outcome; compress into package_promise]`
- `package_promise`: `[one concise target use case and expected photographic outcome]`
- `series_and_scene`: `[combine the SERIES_AND_SCENE-owned fields collected here and in section 2]`
- `hero_compositions`: `HC-001`, `HC-002`, `HC-003`, `HC-004`
- `series_concept`: `[one coherent session concept; owned by SERIES_AND_SCENE]`
- `mood`: `[shared emotional atmosphere; owned by SERIES_AND_SCENE]`
- `color_palette`: `[shared visual palette when material; owned by SERIES_AND_SCENE]`
- `pack_exclusions`: `[pack-specific exclusions only; owned by SERIES_AND_SCENE]`
- Optional PACK metadata: `category: [value]`; `catalog_description: [value]`; `season_tags: [values]`; `authoring_notes: [non-prompt notes]`

The last four series fields are collected here for one-pass direction setting; do not duplicate them in section 2 or change their `SERIES_AND_SCENE` ownership. The number of images is derived from `hero_compositions`; do not add `number_of_images` or `frame_count` fields.

**Signature-feature authoring guidance — not a new schema field:** define one or two recognizable visual features that distinguish the pack from standard stock photography. Express them only through existing `series_concept`, `environment`, `base_lighting`, HC `framing`, and HC `scene_action` / `prop_interaction`. Examples include directional light, architectural background, expressive action, commercially usable distinctive framing, or a recognizable color/object accent. Do not add a signature-feature field.

## 2. SERIES_AND_SCENE

Complete these once for the whole series and combine them with `series_concept`, `mood`, `color_palette` and `pack_exclusions` from section 1.

- `location`: `[shared place or location type]`
- `environment`: `[shared background and environment]`
- `shared_outfit`: `[stable wardrobe, garment set and silhouette]`
- `footwear`: `[stable footwear when visible/relevant]`
- `accessories`: `[stable jewelry/accessories or explicit none]`
- `makeup`: `[shared treatment when applicable]`
- `shared_hairstyle`: `[positive hairstyle continuity target]`
- `base_lighting`: `[shared lighting situation and direction]`
- `shared_props`: `[recurring props | not_applicable]`
- `visual_treatment`: `[pack-specific photographic treatment, without generic REALISM]`
- `time_of_day`: `[shared time when material; otherwise omit]`
- `series_continuity`: `[what remains coherent across all four frames]`
- `frame_variation_strategy`: `[how the four HCs differ meaningfully]`
- `hairstyle_change_exception`: `[bounded rationale only when needed; otherwise omit]`

**Persona boundary — authoring guidance:** Persona identity, visual age, natural hair color and questionnaire body data always take priority. Natural hair color is not a pack field. Pack styling must not reshape the body or turn the participant into a reference model. Do not serialize this boundary as a replacement for frozen system layers.

**Hairstyle continuity — authoring guidance:** when `shared_hairstyle` is stable, HCs must not switch loose hair to a ponytail, braid, bun or another visibly different hairstyle. Allow only small natural placement changes that preserve the same overall hairstyle.

## 3. REFERENCE NOTES

**Authoring guidance — not Photo Pack schema fields.** One visual authoring reference maps to one HC and is used to write positive textual targets; by default it is not passed to the provider.

- Reference 1: `reference_id: [working id]`; HC mapping: `HC-001`; transfer: `[composition/pose/action/styling/light]`; do not transfer: `[identity/age/body/reference-model traits]`; critical details: `[notes]`
- Reference 2: `reference_id: [working id]`; HC mapping: `HC-002`; transfer: `[composition/pose/action/styling/light]`; do not transfer: `[identity/age/body/reference-model traits]`; critical details: `[notes]`
- Reference 3: `reference_id: [working id]`; HC mapping: `HC-003`; transfer: `[composition/pose/action/styling/light]`; do not transfer: `[identity/age/body/reference-model traits]`; critical details: `[notes]`
- Reference 4: `reference_id: [working id]`; HC mapping: `HC-004`; transfer: `[composition/pose/action/styling/light]`; do not transfer: `[identity/age/body/reference-model traits]`; critical details: `[notes]`

## 4. HERO COMPOSITIONS

Include only anatomy groups applicable to this composition. Do not copy unused standing, seated, floor, hand-held prop or multi-person groups. The normative conditional groups are only seated, full-body, over-shoulder and lying/reclining; a standing HC uses the base fields and adds the full-body group only when `kinds` includes `full-body`.

Conditional anatomy field picker:

- Seated: `support_object`, `pelvis_contact`, `left_leg_position`, `right_leg_position`, `left_foot_contact`, `right_foot_contact`, `weight_distribution`.
- Full-body: `left_leg_position`, `right_leg_position`, `left_foot_visibility`, `right_foot_visibility`, `weight_bearing`.
- Over-shoulder: `torso_direction`, `shoulder_direction`, `neck_alignment`.
- Lying/reclining: `support_surface`, `back_contact`, `pelvis_contact`, `left_leg_position`, `right_leg_position`, `left_foot_visibility`, `right_foot_visibility`, `weight_distribution`, `neck_alignment`; identify the supporting arm/hand/object in the applicable base field.
- `POSE_ANATOMY_SAFETY` is system-owned and selected from `kinds`; do not add an `anatomy_safety` field.

### HC-001 — Main Hero

- `hero_composition_id`: `HC-001`
- `name`: `[frame name]`; `frame_role`: `[distinct Main Hero role]`; `kinds`: `[normative kinds]`
- `framing`: `[positive shot size/boundary]`; `camera_position`: `[height, angle, direction]`
- `expression`: `[positive target]`; `gaze`: `[direction/lens contact]`
- `head_turn`: `[direction/degree]`; `head_tilt`: `[inclination/neutral]`
- `torso_pose`: `[direction/bend/rotation]`; `shoulder_pose`: `[direction/level]`; `body_pose`: `[overall arrangement/support]`
- `left_arm`: `[position/action]`; `right_arm`: `[position/action]`
- `left_hand`: `[placement/contact/visibility]`; `right_hand`: `[placement/contact/visibility]`
- `scene_action`: `[when action defines frame_role; otherwise omit]`; `prop_interaction`: `[prop, limb, contact, height, action; otherwise omit]`
- `crop_boundary`: `[crop and joint boundaries]`; `limb_visibility`: `[visible/hidden/outside-frame limbs]`
- Conditional anatomy: `[insert only applicable exact fields from the picker]`
- `composition_priority`: `[one dominant compositional task]`
- Optional local fields: `foreground`, `background`, `lighting_note`, `hairstyle_arrangement`, `hair_parting`, `hair_shoulder_placement`, `local_exception` — include only when physically material. Use `local_exception` only for a narrow frame-specific conflict; do not invent `negative_constraints`.

### HC-002 — Alternate Pose

- `hero_composition_id`: `HC-002`
- `name`: `[frame name]`; `frame_role`: `[distinct Alternate Pose role]`; `kinds`: `[normative kinds]`
- `framing`: `[positive shot size/boundary]`; `camera_position`: `[height, angle, direction]`
- `expression`: `[positive target]`; `gaze`: `[direction/lens contact]`
- `head_turn`: `[direction/degree]`; `head_tilt`: `[inclination/neutral]`
- `torso_pose`: `[direction/bend/rotation]`; `shoulder_pose`: `[direction/level]`; `body_pose`: `[overall arrangement/support]`
- `left_arm`: `[position/action]`; `right_arm`: `[position/action]`
- `left_hand`: `[placement/contact/visibility]`; `right_hand`: `[placement/contact/visibility]`
- `scene_action`: `[when action defines frame_role; otherwise omit]`; `prop_interaction`: `[prop, limb, contact, height, action; otherwise omit]`
- `crop_boundary`: `[crop and joint boundaries]`; `limb_visibility`: `[visible/hidden/outside-frame limbs]`
- Conditional anatomy: `[insert only applicable exact fields from the picker]`
- `composition_priority`: `[one dominant compositional task]`
- Optional local fields: `foreground`, `background`, `lighting_note`, `hairstyle_arrangement`, `hair_parting`, `hair_shoulder_placement`, `local_exception` — include only when physically material. Use `local_exception` only for a narrow frame-specific conflict; do not invent `negative_constraints`.

### HC-003 — Emotional / Action

- `hero_composition_id`: `HC-003`
- `name`: `[frame name]`; `frame_role`: `[distinct Emotional / Action role]`; `kinds`: `[normative kinds]`
- `framing`: `[positive shot size/boundary]`; `camera_position`: `[height, angle, direction]`
- `expression`: `[positive target]`; `gaze`: `[direction/lens contact]`
- `head_turn`: `[direction/degree]`; `head_tilt`: `[inclination/neutral]`
- `torso_pose`: `[direction/bend/rotation]`; `shoulder_pose`: `[direction/level]`; `body_pose`: `[overall arrangement/support]`
- `left_arm`: `[position/action]`; `right_arm`: `[position/action]`
- `left_hand`: `[placement/contact/visibility]`; `right_hand`: `[placement/contact/visibility]`
- `scene_action`: `[required when action defines frame_role]`; `prop_interaction`: `[prop, limb, contact, height, action; otherwise omit]`
- `crop_boundary`: `[crop and joint boundaries]`; `limb_visibility`: `[visible/hidden/outside-frame limbs]`
- Conditional anatomy: `[insert only applicable exact fields from the picker]`
- `composition_priority`: `[one dominant compositional task]`
- Optional local fields: `foreground`, `background`, `lighting_note`, `hairstyle_arrangement`, `hair_parting`, `hair_shoulder_placement`, `local_exception` — include only when physically material. Use `local_exception` only for a narrow frame-specific conflict; do not invent `negative_constraints`.

### HC-004 — Full-body / Distinctive Finale

- `hero_composition_id`: `HC-004`
- `name`: `[frame name]`; `frame_role`: `[distinct finale role]`; `kinds`: `[normative kinds]`
- `framing`: `[positive shot size/boundary]`; `camera_position`: `[height, angle, direction]`
- `expression`: `[positive target]`; `gaze`: `[direction/lens contact]`
- `head_turn`: `[direction/degree]`; `head_tilt`: `[inclination/neutral]`
- `torso_pose`: `[direction/bend/rotation]`; `shoulder_pose`: `[direction/level]`; `body_pose`: `[overall arrangement/support]`
- `left_arm`: `[position/action]`; `right_arm`: `[position/action]`
- `left_hand`: `[placement/contact/visibility]`; `right_hand`: `[placement/contact/visibility]`
- `scene_action`: `[when action defines frame_role; otherwise omit]`; `prop_interaction`: `[prop, limb, contact, height, action; otherwise omit]`
- `crop_boundary`: `[crop and joint boundaries]`; `limb_visibility`: `[visible/hidden/outside-frame limbs]`
- Conditional anatomy: `[insert only applicable exact fields from the picker]`
- `composition_priority`: `[one dominant compositional task]`
- Optional local fields: `foreground`, `background`, `lighting_note`, `hairstyle_arrangement`, `hair_parting`, `hair_shoulder_placement`, `local_exception` — include only when physically material. Use `local_exception` only for a narrow frame-specific conflict; do not invent `negative_constraints`.

## 5. VARIATION

- Locked across series: `[shared_outfit, footwear, accessories, makeup, shared_hairstyle, location, environment, base_lighting, palette, treatment and recurring props]`
- Variable by HC: `[framing, camera_position, expression, gaze, head pose, body/limb arrangement, support, action, prop interaction and physically material hair placement]`
- Requires a separate pack: `[different promise/applicability, shared styling, location, incompatible lighting, narrative, mood or treatment]`

## 6. FAST QA

1. `[ ]` Identity remains recognizable.
2. `[ ]` Visual age remains credible.
3. `[ ]` Natural hair color remains correct.
4. `[ ]` Persona body proportions remain credible.
5. `[ ]` Skin remains natural.
6. `[ ]` Pack theme reads without explanation.
7. `[ ]` Every pose is natural and physically supported.
8. `[ ]` Hands, legs and feet are anatomically plausible.
9. `[ ]` Stable wardrobe, footwear, environment and props remain continuous.
10. `[ ]` Four HCs provide meaningful diversity.

- Blocker: `[identity/age/body failure, critical anatomy, unreadable theme, broken continuity or failed composition_priority]`
- Acceptable variation: `[small non-essential change that preserves the authored frame]`
- Cosmetic issue: `[minor imperfection with no effect on identity, anatomy, continuity or commercial use]`

## 7. DEFINITION OF DONE

- `[ ]` Theme is immediately readable.
- `[ ]` Face remains recognizable.
- `[ ]` Four frames form one coherent series.
- `[ ]` HCs differ meaningfully.
- `[ ]` No critical anatomy issue remains.
- `[ ]` Stable traits are preserved.
- `[ ]` Pack remains workflow `draft` / catalog `inactive` until visual QA approval.
