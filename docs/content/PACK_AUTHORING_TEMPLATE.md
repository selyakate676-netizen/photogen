# Photo Pack Authoring Template

Use this document as a fillable authoring worksheet for one Photo Pack with four Hero Compositions.

`PHOTO_PACK_SPECIFICATION_V1.md` is the only normative source. This template does not add contract fields, change field ownership or define an alternative schema. Text marked **authoring guidance** is editorial working material and must not be serialized as a Photo Pack field or prompt block.

## 1. PACK METADATA

### Required `PACK` fields

- `pack_id`: `[stable unique identifier]`
- `name`: `[human-readable pack name]`
- `package_promise`: `[one concise target use case and expected photographic outcome]`
- `applicability`:
  - `participant_count`: `[single | two | group]`
  - `participant_group`: `[individual | couple | mother_and_adult_daughter | friends | family | parent_and_child | custom_group]`
  - `age_scope`: `[adult | child | mixed | universal]`
  - `gender_scope`: `[female | male | mixed | universal]`
- `series_and_scene`: Defined in section 5.
- `hero_compositions`: `HC-001`, `HC-002`, `HC-003`, `HC-004`

For a pack intended for the current MVP, use `participant_count: single` and `participant_group: individual`.

### Optional `PACK` fields

- `category`: `[catalog grouping, if needed]`
- `catalog_description`: `[user-facing description, without additional prompt constraints]`
- `season_tags`: `[catalog tags, if needed]`
- `authoring_notes`: `[internal non-prompt editorial context, if needed]`

### Authoring guidance — not Photo Pack contract fields

- Workflow status: `[draft | inactive]`
- Commercial purpose: `[what commercial user outcome should this pack serve?]`
- Target audience / JTBD: `[who chooses this pack, in what situation, and for what job?]`
- Number of images: `4`, derived from the ordered `hero_compositions` list.

Do not add `status`, `commercial_purpose`, `target_audience`, `jtbd`, `number_of_images` or `frame_count` to the Photo Pack contract. Compress the commercial purpose and JTBD into `package_promise`; keep workflow status outside prompt content; derive the image count from `hero_compositions`.

## 2. PACK BRIEF

**Authoring guidance — not a serialized contract section.** Use the answers to write `package_promise`, `catalog_description`, `series_concept`, `mood`, `color_palette`, `visual_treatment`, `frame_variation_strategy` and, where necessary, `pack_exclusions`.

- Main idea: `[one sentence]`
- Mood: `[shared emotional atmosphere]`
- Immediate read: `[what must a user understand without explanation?]`
- Emotional intensity: `[restrained | moderate | expressive, with a short rationale]`
- Visual palette: `[colors, materials and tonal relationships]`
- Prohibited style: `[only pack-specific conflicts that would break the product promise]`

**Signature-feature authoring guidance — not a new schema field.** Define one or two recognizable visual features that keep the pack from reading as standard stock photography. Author them only in existing normative destinations: `series_concept`, `environment`, `base_lighting`, HC `framing`, and HC `scene_action` / `prop_interaction`. Suitable features include distinctive directional light, an architectural background, an expressive action, unusual but commercially usable framing, or a recognizable color or object accent. Do not introduce a separate field for signature features.

Brief check:

- `[ ]` The idea describes one coherent photo session, not four unrelated images.
- `[ ]` The brief does not define Persona identity, body, age or questionnaire values.
- `[ ]` The brief contains no provider, model, quality or generic REALISM instructions.
- `[ ]` Every prompt-bearing decision has one normative destination and is not duplicated.

## 3. STABLE ACROSS SERIES

Use the existing stable/variable ownership contract. Author shared creative values once in `SERIES_AND_SCENE`; each HC inherits them.

| Authoring concern | Normative owner or boundary | Fill-in |
|---|---|---|
| Wardrobe | `shared_outfit` | `[garment set, silhouette, material and stable styling]` |
| Footwear | `footwear` | `[shared footwear when visible or relevant | not_applicable]` |
| Jewelry | `accessories` | `[stable jewelry/accessory choice or explicit no-accessories choice]` |
| Makeup | `makeup` | `[shared treatment when applicable]` |
| Natural hair color preservation | Persona/system boundary; not Photo Pack content | `[confirmed: pack does not set or replace natural hair color]` |
| Hairstyle continuity | `shared_hairstyle` | `[one positive hairstyle target independent of reference styling]` |
| Environment | `location` and `environment` | `[shared place, background and environmental qualities]` |
| Lighting | `base_lighting` | `[shared lighting situation and direction]` |
| Recurring props | `shared_props` | `[props recurring across the series]` |
| Color palette | `color_palette` | `[shared palette when conceptually material]` |
| Photographic treatment | `visual_treatment` | `[pack-specific photographic treatment only]` |

**Hairstyle-continuity guidance — not a new schema field.** When `shared_hairstyle` is stable across the series, an HC must not change loose hair into a ponytail, braid, bun or another visibly different hairstyle. Only small natural changes in hair placement are allowed, and they must preserve the same overall hairstyle.

### Persona priority boundary

**Authoring guidance — not prompt-bearing Photo Pack content.** Persona identity, visual age, body proportions, natural hair color and questionnaire data always take priority over the appearance of models in authoring references. A Photo Pack must not restate IDENTITY, PERSONA_APPEARANCE or identity-preservation instructions. If a reference conflicts with Persona appearance, describe only the transferable composition or styling and discard the conflicting appearance characteristic.

Stable-across-series check:

- `[ ]` Shared outfit, footwear, accessories, hairstyle, makeup, environment, lighting, palette and treatment appear only in `SERIES_AND_SCENE`.
- `[ ]` HCs do not repeat or silently override shared creative values.
- `[ ]` `shared_hairstyle` is a positive style target and does not inherit the reference or Persona hairstyle.
- `[ ]` HC hair placement preserves the overall `shared_hairstyle`; it does not introduce a ponytail, braid, bun or another visibly different arrangement.
- `[ ]` Any intentional hairstyle change is declared once in `hairstyle_change_exception` with a bounded rationale.

## 4. REFERENCE AUTHORING RULES

**Authoring guidance — references are not Photo Pack schema fields.**

- Use one visual authoring reference for one HC.
- Use the reference to produce a precise positive textual description of the frame.
- Internet references are not passed to the provider during user generation by default.
- Do not transfer the reference model's face, identity, visual age, body proportions or individual appearance.
- Transfer only the intended composition, pose, action, wardrobe, props, lighting and atmosphere.
- When a reference conflicts with Persona data, Persona has priority.
- Do not store URLs, source-image identifiers or provider reference instructions inside `PACK`, `SERIES_AND_SCENE` or HC fields.
- Do not require pixel-level matching. The reference is evidence for authoring a physically coherent target, not a second identity source.

Per-reference worksheet:

- HC: `[HC-001 | HC-002 | HC-003 | HC-004]`
- Composition to transfer: `[authoring note]`
- Pose/action to transfer: `[authoring note]`
- Wardrobe/prop/light/atmosphere cues to transfer: `[authoring note]`
- Reference-model characteristics to exclude from authored content: `[authoring note]`
- Resulting normative fields completed: `[field names only]`

## 5. SERIES_AND_SCENE

This section contains only creative characteristics shared by the complete series.

### Required fields

- `series_concept`: `[concise shared visual and narrative concept]`
- `mood`: `[shared emotional atmosphere]`
- `location`: `[shared place or location type]`
- `environment`: `[shared background and environmental characteristics]`
- `shared_outfit`: `[stable garment set and silhouette | not_applicable only when clothing genuinely does not apply]`
- `shared_hairstyle`: `[stable positive hairstyle target, independent of reference-image styling]`
- `base_lighting`: `[shared lighting situation and direction]`
- `visual_treatment`: `[pack-specific photographic treatment without generic REALISM/provider instructions]`
- `series_continuity`: `[what makes all four frames one coherent photoshoot]`
- `frame_variation_strategy`: `[how the four HCs differ meaningfully]`

### Optional fields

- `time_of_day`: `[shared time when visually material]`
- `color_palette`: `[shared palette when conceptually material]`
- `footwear`: `[shared footwear when visible or relevant]`
- `accessories`: `[shared accessories or explicit no-accessories choice]`
- `makeup`: `[shared makeup treatment when applicable]`
- `shared_props`: `[props recurring across the series]`
- `pack_exclusions`: `[only pack-specific exclusions necessary to protect package_promise]`
- `hairstyle_change_exception`: `[bounded intentional hairstyle-change rationale, only when required]`

`shared_props` declares recurrence only. Each concrete action, contact, height and placement belongs to the relevant HC `prop_interaction`.

## 6. HERO COMPOSITIONS

Author exactly one concrete frame and one dominant compositional task in each block. Participant left/right always means anatomical left/right; use `camera_left` or `camera_right` for camera-relative directions.

### HC-001 — Main Hero

#### Required fields

- `hero_composition_id`: `HC-001`
- `name`: `[Main Hero frame name]`
- `frame_role`: `[distinct role of the main hero frame]`
- `kinds`: `[one or more: portrait | seated | full-body | over-shoulder | lying | reclining]`
- `framing`: `[positive shot size and visible boundary]`
- `camera_position`: `[camera height, angle and view direction]`
- `expression`: `[concrete positive expression]`
- `gaze`: `[concrete gaze direction and lens-contact intent]`
- `head_turn`: `[direction and degree]`
- `head_tilt`: `[lateral/vertical inclination or explicit neutral position]`
- `torso_pose`: `[torso direction, bend and rotation]`
- `shoulder_pose`: `[shoulder direction, level and torso relationship]`
- `left_arm`: `[position/action | not_visible only when framing justifies it]`
- `right_arm`: `[position/action | not_visible only when framing justifies it]`
- `left_hand`: `[position, visibility and contact | justified not_visible]`
- `right_hand`: `[position, visibility and contact | justified not_visible]`
- `body_pose`: `[overall stance/support relationship]`
- `crop_boundary`: `[intended crop and prohibited accidental joint cuts]`
- `limb_visibility`: `[visible, hidden and outside-frame limbs]`
- `composition_priority`: `[single dominant visual/compositional task]`

#### Optional fields — include only when physically material

- `scene_action`: `[one concrete action]`
- `prop_interaction`: `[prop, responsible limb, contact, height and action]`
- `foreground`: `[frame-specific foreground only]`
- `background`: `[frame-specific selection/emphasis within shared environment]`
- `lighting_note`: `[local adjustment within base_lighting]`
- `hairstyle_arrangement`: `[physical placement of shared hairstyle required by this frame]`
- `hair_parting`: `[parting only when material and compatible with shared hairstyle]`
- `hair_shoulder_placement`: `[placement relative to shoulders only when material]`
- `local_exception`: `[narrow physically justified exception compatible with shared concept]`

#### Conditional anatomy fields — complete every applicable group

**When `kinds` includes `seated`:**

- `support_object`: `[stable support]`
- `pelvis_contact`: `[exact support contact]`
- `left_leg_position`: `[traceable pelvis-to-leg position]`
- `right_leg_position`: `[traceable pelvis-to-leg position]`
- `left_foot_contact`: `[support/contact]`
- `right_foot_contact`: `[support/contact]`
- `weight_distribution`: `[support chain]`

**When `kinds` includes `full-body`:**

- `left_leg_position`: `[position]`
- `right_leg_position`: `[position]`
- `left_foot_visibility`: `[visibility/occlusion]`
- `right_foot_visibility`: `[visibility/occlusion]`
- `weight_bearing`: `[weight-bearing structure]`

**When `kinds` includes `over-shoulder`:**

- `torso_direction`: `[direction]`
- `shoulder_direction`: `[direction]`
- `neck_alignment`: `[continuous plausible alignment]`

**When `kinds` includes `lying` or `reclining`:**

- `support_surface`: `[surface]`
- `back_contact`: `[contact]`
- `pelvis_contact`: `[contact]`
- `left_leg_position`: `[position]`
- `right_leg_position`: `[position]`
- `left_foot_visibility`: `[visibility/occlusion]`
- `right_foot_visibility`: `[visibility/occlusion]`
- `weight_distribution`: `[support chain]`
- `neck_alignment`: `[continuous plausible alignment]`
- Authoring guidance: `[identify the arm, hand or object providing support when reclining]`

#### Anatomy and constraint guidance — not additional HC fields

- `[ ]` Every visible hand has one clear placement or action.
- `[ ]` Every visible leg and foot has a traceable anatomical path and support/contact description.
- `[ ]` `body_pose`, detailed limbs, physical support, contact points, `crop_boundary` and `limb_visibility` agree.
- `[ ]` Targets are positive and concrete; prohibitions do not replace required field values.
- `[ ]` Shared negative constraints belong only in `pack_exclusions`; a narrow frame-only exception may use `local_exception`.
- `[ ]` No `anatomy_safety` or `negative_constraints` field has been invented; system `POSE_ANATOMY_SAFETY` remains outside Photo Pack content.

### HC-002 — Alternate Framing / Pose

#### Required fields

- `hero_composition_id`: `HC-002`
- `name`: `[Alternate Framing / Pose frame name]`
- `frame_role`: `[distinct role of the alternate frame]`
- `kinds`: `[one or more: portrait | seated | full-body | over-shoulder | lying | reclining]`
- `framing`: `[positive shot size and visible boundary]`
- `camera_position`: `[camera height, angle and view direction]`
- `expression`: `[concrete positive expression]`
- `gaze`: `[concrete gaze direction and lens-contact intent]`
- `head_turn`: `[direction and degree]`
- `head_tilt`: `[lateral/vertical inclination or explicit neutral position]`
- `torso_pose`: `[torso direction, bend and rotation]`
- `shoulder_pose`: `[shoulder direction, level and torso relationship]`
- `left_arm`: `[position/action | not_visible only when framing justifies it]`
- `right_arm`: `[position/action | not_visible only when framing justifies it]`
- `left_hand`: `[position, visibility and contact | justified not_visible]`
- `right_hand`: `[position, visibility and contact | justified not_visible]`
- `body_pose`: `[overall stance/support relationship]`
- `crop_boundary`: `[intended crop and prohibited accidental joint cuts]`
- `limb_visibility`: `[visible, hidden and outside-frame limbs]`
- `composition_priority`: `[single dominant visual/compositional task]`

#### Optional fields — include only when physically material

- `scene_action`: `[one concrete action]`
- `prop_interaction`: `[prop, responsible limb, contact, height and action]`
- `foreground`: `[frame-specific foreground only]`
- `background`: `[frame-specific selection/emphasis within shared environment]`
- `lighting_note`: `[local adjustment within base_lighting]`
- `hairstyle_arrangement`: `[physical placement of shared hairstyle required by this frame]`
- `hair_parting`: `[parting only when material and compatible with shared hairstyle]`
- `hair_shoulder_placement`: `[placement relative to shoulders only when material]`
- `local_exception`: `[narrow physically justified exception compatible with shared concept]`

#### Conditional anatomy fields — complete every applicable group

**When `kinds` includes `seated`:**

- `support_object`: `[stable support]`
- `pelvis_contact`: `[exact support contact]`
- `left_leg_position`: `[traceable pelvis-to-leg position]`
- `right_leg_position`: `[traceable pelvis-to-leg position]`
- `left_foot_contact`: `[support/contact]`
- `right_foot_contact`: `[support/contact]`
- `weight_distribution`: `[support chain]`

**When `kinds` includes `full-body`:**

- `left_leg_position`: `[position]`
- `right_leg_position`: `[position]`
- `left_foot_visibility`: `[visibility/occlusion]`
- `right_foot_visibility`: `[visibility/occlusion]`
- `weight_bearing`: `[weight-bearing structure]`

**When `kinds` includes `over-shoulder`:**

- `torso_direction`: `[direction]`
- `shoulder_direction`: `[direction]`
- `neck_alignment`: `[continuous plausible alignment]`

**When `kinds` includes `lying` or `reclining`:**

- `support_surface`: `[surface]`
- `back_contact`: `[contact]`
- `pelvis_contact`: `[contact]`
- `left_leg_position`: `[position]`
- `right_leg_position`: `[position]`
- `left_foot_visibility`: `[visibility/occlusion]`
- `right_foot_visibility`: `[visibility/occlusion]`
- `weight_distribution`: `[support chain]`
- `neck_alignment`: `[continuous plausible alignment]`
- Authoring guidance: `[identify the arm, hand or object providing support when reclining]`

#### Anatomy and constraint guidance — not additional HC fields

- `[ ]` Every visible hand has one clear placement or action.
- `[ ]` Every visible leg and foot has a traceable anatomical path and support/contact description.
- `[ ]` `body_pose`, detailed limbs, physical support, contact points, `crop_boundary` and `limb_visibility` agree.
- `[ ]` Targets are positive and concrete; prohibitions do not replace required field values.
- `[ ]` Shared negative constraints belong only in `pack_exclusions`; a narrow frame-only exception may use `local_exception`.
- `[ ]` No `anatomy_safety` or `negative_constraints` field has been invented; system `POSE_ANATOMY_SAFETY` remains outside Photo Pack content.

### HC-003 — Emotional or Action Moment

#### Required fields

- `hero_composition_id`: `HC-003`
- `name`: `[Emotional or Action Moment frame name]`
- `frame_role`: `[distinct emotional/action role]`
- `kinds`: `[one or more: portrait | seated | full-body | over-shoulder | lying | reclining]`
- `framing`: `[positive shot size and visible boundary]`
- `camera_position`: `[camera height, angle and view direction]`
- `expression`: `[concrete positive expression]`
- `gaze`: `[concrete gaze direction and lens-contact intent]`
- `head_turn`: `[direction and degree]`
- `head_tilt`: `[lateral/vertical inclination or explicit neutral position]`
- `torso_pose`: `[torso direction, bend and rotation]`
- `shoulder_pose`: `[shoulder direction, level and torso relationship]`
- `left_arm`: `[position/action | not_visible only when framing justifies it]`
- `right_arm`: `[position/action | not_visible only when framing justifies it]`
- `left_hand`: `[position, visibility and contact | justified not_visible]`
- `right_hand`: `[position, visibility and contact | justified not_visible]`
- `body_pose`: `[overall stance/support relationship]`
- `crop_boundary`: `[intended crop and prohibited accidental joint cuts]`
- `limb_visibility`: `[visible, hidden and outside-frame limbs]`
- `composition_priority`: `[single dominant visual/compositional task]`

#### Optional fields — include only when physically material

- `scene_action`: `[one concrete action; required when action defines frame_role]`
- `prop_interaction`: `[prop, responsible limb, contact, height and action]`
- `foreground`: `[frame-specific foreground only]`
- `background`: `[frame-specific selection/emphasis within shared environment]`
- `lighting_note`: `[local adjustment within base_lighting]`
- `hairstyle_arrangement`: `[physical placement of shared hairstyle required by this frame]`
- `hair_parting`: `[parting only when material and compatible with shared hairstyle]`
- `hair_shoulder_placement`: `[placement relative to shoulders only when material]`
- `local_exception`: `[narrow physically justified exception compatible with shared concept]`

#### Conditional anatomy fields — complete every applicable group

**When `kinds` includes `seated`:**

- `support_object`: `[stable support]`
- `pelvis_contact`: `[exact support contact]`
- `left_leg_position`: `[traceable pelvis-to-leg position]`
- `right_leg_position`: `[traceable pelvis-to-leg position]`
- `left_foot_contact`: `[support/contact]`
- `right_foot_contact`: `[support/contact]`
- `weight_distribution`: `[support chain]`

**When `kinds` includes `full-body`:**

- `left_leg_position`: `[position]`
- `right_leg_position`: `[position]`
- `left_foot_visibility`: `[visibility/occlusion]`
- `right_foot_visibility`: `[visibility/occlusion]`
- `weight_bearing`: `[weight-bearing structure]`

**When `kinds` includes `over-shoulder`:**

- `torso_direction`: `[direction]`
- `shoulder_direction`: `[direction]`
- `neck_alignment`: `[continuous plausible alignment]`

**When `kinds` includes `lying` or `reclining`:**

- `support_surface`: `[surface]`
- `back_contact`: `[contact]`
- `pelvis_contact`: `[contact]`
- `left_leg_position`: `[position]`
- `right_leg_position`: `[position]`
- `left_foot_visibility`: `[visibility/occlusion]`
- `right_foot_visibility`: `[visibility/occlusion]`
- `weight_distribution`: `[support chain]`
- `neck_alignment`: `[continuous plausible alignment]`
- Authoring guidance: `[identify the arm, hand or object providing support when reclining]`

#### Anatomy and constraint guidance — not additional HC fields

- `[ ]` Every visible hand has one clear placement or action.
- `[ ]` Every visible leg and foot has a traceable anatomical path and support/contact description.
- `[ ]` `body_pose`, detailed limbs, physical support, contact points, `crop_boundary` and `limb_visibility` agree.
- `[ ]` Targets are positive and concrete; prohibitions do not replace required field values.
- `[ ]` Shared negative constraints belong only in `pack_exclusions`; a narrow frame-only exception may use `local_exception`.
- `[ ]` No `anatomy_safety` or `negative_constraints` field has been invented; system `POSE_ANATOMY_SAFETY` remains outside Photo Pack content.

### HC-004 — Full-body or Distinctive Finale

#### Required fields

- `hero_composition_id`: `HC-004`
- `name`: `[Full-body or Distinctive Finale frame name]`
- `frame_role`: `[distinct finale role]`
- `kinds`: `[one or more: portrait | seated | full-body | over-shoulder | lying | reclining]`
- `framing`: `[positive shot size and visible boundary]`
- `camera_position`: `[camera height, angle and view direction]`
- `expression`: `[concrete positive expression]`
- `gaze`: `[concrete gaze direction and lens-contact intent]`
- `head_turn`: `[direction and degree]`
- `head_tilt`: `[lateral/vertical inclination or explicit neutral position]`
- `torso_pose`: `[torso direction, bend and rotation]`
- `shoulder_pose`: `[shoulder direction, level and torso relationship]`
- `left_arm`: `[position/action | not_visible only when framing justifies it]`
- `right_arm`: `[position/action | not_visible only when framing justifies it]`
- `left_hand`: `[position, visibility and contact | justified not_visible]`
- `right_hand`: `[position, visibility and contact | justified not_visible]`
- `body_pose`: `[overall stance/support relationship]`
- `crop_boundary`: `[intended crop and prohibited accidental joint cuts]`
- `limb_visibility`: `[visible, hidden and outside-frame limbs]`
- `composition_priority`: `[single dominant visual/compositional task]`

#### Optional fields — include only when physically material

- `scene_action`: `[one concrete action]`
- `prop_interaction`: `[prop, responsible limb, contact, height and action]`
- `foreground`: `[frame-specific foreground only]`
- `background`: `[frame-specific selection/emphasis within shared environment]`
- `lighting_note`: `[local adjustment within base_lighting]`
- `hairstyle_arrangement`: `[physical placement of shared hairstyle required by this frame]`
- `hair_parting`: `[parting only when material and compatible with shared hairstyle]`
- `hair_shoulder_placement`: `[placement relative to shoulders only when material]`
- `local_exception`: `[narrow physically justified exception compatible with shared concept]`

#### Conditional anatomy fields — complete every applicable group

**When `kinds` includes `seated`:**

- `support_object`: `[stable support]`
- `pelvis_contact`: `[exact support contact]`
- `left_leg_position`: `[traceable pelvis-to-leg position]`
- `right_leg_position`: `[traceable pelvis-to-leg position]`
- `left_foot_contact`: `[support/contact]`
- `right_foot_contact`: `[support/contact]`
- `weight_distribution`: `[support chain]`

**When `kinds` includes `full-body`:**

- `left_leg_position`: `[position]`
- `right_leg_position`: `[position]`
- `left_foot_visibility`: `[visibility/occlusion]`
- `right_foot_visibility`: `[visibility/occlusion]`
- `weight_bearing`: `[weight-bearing structure]`

**When `kinds` includes `over-shoulder`:**

- `torso_direction`: `[direction]`
- `shoulder_direction`: `[direction]`
- `neck_alignment`: `[continuous plausible alignment]`

**When `kinds` includes `lying` or `reclining`:**

- `support_surface`: `[surface]`
- `back_contact`: `[contact]`
- `pelvis_contact`: `[contact]`
- `left_leg_position`: `[position]`
- `right_leg_position`: `[position]`
- `left_foot_visibility`: `[visibility/occlusion]`
- `right_foot_visibility`: `[visibility/occlusion]`
- `weight_distribution`: `[support chain]`
- `neck_alignment`: `[continuous plausible alignment]`
- Authoring guidance: `[identify the arm, hand or object providing support when reclining]`

#### Anatomy and constraint guidance — not additional HC fields

- `[ ]` Every visible hand has one clear placement or action.
- `[ ]` Every visible leg and foot has a traceable anatomical path and support/contact description.
- `[ ]` `body_pose`, detailed limbs, physical support, contact points, `crop_boundary` and `limb_visibility` agree.
- `[ ]` Targets are positive and concrete; prohibitions do not replace required field values.
- `[ ]` Shared negative constraints belong only in `pack_exclusions`; a narrow frame-only exception may use `local_exception`.
- `[ ]` No `anatomy_safety` or `negative_constraints` field has been invented; system `POSE_ANATOMY_SAFETY` remains outside Photo Pack content.

## 7. VARIATION RULES

### Must remain stable across all HCs

- `series_concept`, `mood`, `location`, `environment`;
- `shared_outfit`, and `footwear`, `accessories`, `makeup` when present;
- `shared_hairstyle`, except for an explicit `hairstyle_change_exception`;
- `base_lighting`, `color_palette`, `visual_treatment`;
- recurring `shared_props` and the continuity declared in `series_continuity`.

### May vary between HCs

- `framing` and `camera_position`;
- `expression` and `gaze`;
- `head_turn` and `head_tilt`;
- torso, shoulders, arms, hands, `body_pose`, legs, feet, support and weight distribution;
- `scene_action` and `prop_interaction`;
- frame-specific `foreground`, `background` and `lighting_note` within shared series values;
- `hairstyle_arrangement`, `hair_parting` and `hair_shoulder_placement` only when physically material and compatible with `shared_hairstyle`.

Hair placement and parting are not mandatory sources of variation. Variation must come from a coherent combined frame signature, not from forcing every field to differ.

### Requires a different pack

- a different product promise, audience use case or applicability;
- a different shared outfit or overall styling concept;
- a different location/environment or incompatible base lighting setup;
- a different overall hairstyle without a conceptually justified `hairstyle_change_exception`;
- a different core narrative, mood or photographic treatment that breaks one-session continuity;
- four frames that cannot coexist under one `series_concept` and `series_continuity`.

Variation validation:

- `[ ]` The four HCs are not duplicate or near-duplicate compositions.
- `[ ]` Expression is not identical in every frame.
- `[ ]` Direct gaze is not identical in every frame.
- `[ ]` Head pose and body pose create meaningful differences.
- `[ ]` Hand placement and prop interaction are not repeated without a concept-driven reason.
- `[ ]` No HC contains more than one dominant compositional task.
- `[ ]` `frame_variation_strategy` accurately describes the resulting set.

## 8. VISUAL QA CHECKLIST

Evaluate in this order:

1. `[ ]` Face remains recognizable.
2. `[ ]` Visual age remains credible and consistent with Persona.
3. `[ ]` Natural hair color and hairline remain correct.
4. `[ ]` Real Persona proportions remain credible.
5. `[ ]` Skin remains natural.
6. `[ ]` Pack theme is readable without explanation.
7. `[ ]` Pose looks natural and physically supported.
8. `[ ]` Hands, legs and feet are anatomically plausible.
9. `[ ]` Wardrobe, footwear and recurring props remain continuous.
10. `[ ]` The four frames provide meaningful visual variety.

### Issue classification

**Blocker**

- Identity loss, wrong visual age, altered natural hair color/hairline or obvious body replacement.
- Critical hand, limb, support, contact or crop failure.
- Pack theme is unreadable, or one frame breaks the declared series continuity.
- Wrong/missing essential wardrobe or prop makes `package_promise` fail.
- Duplicate HCs or a composition that does not fulfill its `composition_priority`.

**Acceptable variation**

- Small non-essential changes in fabric folds, prop angle, background detail or expression intensity.
- Minor camera or crop differences that retain the authored `framing`, anatomy and `composition_priority`.
- Natural frame-to-frame variation permitted by `frame_variation_strategy`.

**Cosmetic issue**

- A small styling, background, lighting or retouching imperfection that does not affect identity, anatomy, theme, continuity or commercial usability.
- A non-essential detail that can be noted without blocking pack approval.

## 9. FAST PACK WORKFLOW

1. Choose exactly four authoring references, one per HC.
2. Complete PACK metadata, the brief and stable-across-series decisions.
3. Fill the normative `SERIES_AND_SCENE` fields once.
4. Describe all four structured HCs with positive physical targets and every applicable conditional anatomy field.
5. Save the pack as workflow `draft` / catalog `inactive`; do not publish it into generation prematurely.
6. Validate structure, ownership, conditional anatomy and pack variation.
7. Test only HC-001 first.
8. Allow at most one shared correction cycle for a pack-level problem demonstrated by HC-001.
9. After HC-001 approval, test HC-002, HC-003 and HC-004 one at a time.
10. Do not pursue pixel-level matching with authoring references.
11. Do not change the frozen core, Prompt Assembly, IDENTITY, PERSONA_APPEARANCE, REALISM or provider configuration for one pack.

If an issue belongs only to one HC, correct that HC. If several HCs demonstrate the same pack-owned issue, correct `SERIES_AND_SCENE`. Architecture changes require separate evidence and are outside this workflow.

## 10. DEFINITION OF DONE

A pack is ready when:

- `[ ]` The user's face remains recognizable.
- `[ ]` The theme is readable without explanation.
- `[ ]` All four frames form one coherent series.
- `[ ]` The compositions differ meaningfully.
- `[ ]` There are no critical anatomy errors.
- `[ ]` Wardrobe, footwear and props are coherent.
- `[ ]` The result is commercially usable for the declared `package_promise`.
- `[ ]` All required PACK and `SERIES_AND_SCENE` fields are complete.
- `[ ]` Every HC passes base and conditional anatomy validation.
- `[ ]` The set passes variation validation.
- `[ ]` No Photo Pack content duplicates or overrides system layers.
