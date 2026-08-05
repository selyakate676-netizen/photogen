# Business Portrait

> Authoring workflow metadata — not Photo Pack contract fields: `draft`; catalog state `inactive`; four images derived from the ordered `hero_compositions` list.

## PACK

### Required fields

- `pack_id`: `SP-BUSINESS-PORTRAIT-001`
- `name`: Business Portrait
- `package_promise`: A coherent four-frame contemporary professional portrait series for resumes, LinkedIn, Telegram, expert websites, presentations and personal branding, presenting the participant as confident, competent, calm and approachable without stock-corporate clichés.
- `applicability`:
  - `participant_count`: `single`
  - `participant_group`: `individual`
  - `age_scope`: `adult`
  - `gender_scope`: `universal`
- `series_and_scene`: Defined in the SERIES_AND_SCENE section below.
- `hero_compositions`: `HC-001`, `HC-002`, `HC-003`, `HC-004`

### Optional fields

- `category`: business
- `catalog_description`: Four contemporary professional portraits in one minimalist studio session, balancing direct credibility, approachable personal-brand presence and complete tailored styling.
- `season_tags`: `[]`
- `authoring_notes`: Workflow status is draft and catalog state is inactive until visual QA. The four-image count is derived from the ordered Hero Composition list. System-owned Persona identity, visual age, natural hair color and length, questionnaire body proportions and natural skin treatment apply equally to every frame and are not duplicated in pack prompt content. Pack styling must not slim, reshape, rejuvenate or turn the participant into a generic business model. The frozen core, Persona/reference policy and Prompt Assembly remain unchanged.

## SERIES_AND_SCENE

### Required fields

- `series_concept`: A modern professional portrait session that presents one real expert as competent, composed and approachable through four distinct but coherent editorial frames suitable for professional profiles and personal-brand communication. Its two signature features are modern architectural light with clear directional geometry and restrained personal-brand action rather than passive stock posing.
- `mood`: Confident, calm, open and contemporary, with restrained warmth and no aggressive authority performance, staged corporate cheerfulness or distant executive severity.
- `location`: One bright modern studio or minimalist work interior with pale neutral walls, clean architectural lines and generous uncluttered space.
- `environment`: Refined light interior with clean architectural planes that make the directional light geometry visible, one simple chair, a subtle work surface available only when required by a frame and minimal background detail. No boardroom spectacle, office crowd, staged meeting, handshake scene, visible branding or generic stock-office décor.
- `shared_outfit`: One identical modern deep-navy tailored trouser suit with a clean softly structured silhouette over one simple light-neutral matte top. The jacket, trousers, top, fit, color and formality remain unchanged in all four frames.
- `shared_hairstyle`: One identical neat natural loose hairstyle worn down across all four frames, compatible with the participant's real hair length and texture and controlled away from the eyes. It must not become a ponytail, braid, bun or another visibly different hairstyle; only small natural placement changes are allowed.
- `base_lighting`: Modern architectural light with clear directional geometry: one soft directional key from camera-left, gentle frontal fill, natural facial volume, readable eyes and stable believable light-and-shadow lines across all four frames.
- `visual_treatment`: Contemporary editorial business photography with clean composition, realistic perspective, restrained contrast, natural materials and a calm premium finish rather than glossy corporate advertising or stock imagery.
- `series_continuity`: All four frames show one continuous professional session in the same light minimalist interior, with the identical deep-navy suit, light-neutral top, minimalist dark shoes, understated accessories, identical natural loose worn-down hairstyle, natural professional grooming and camera-left architectural lighting direction.
- `frame_variation_strategy`: Progress from a direct chest-up hero to a supported seated three-quarter portrait, then to a warmer restrained notebook interaction rather than passive stock posing, and finish with a complete standing full-body frame. Vary framing, gaze, expression, torso direction, hand placement, support and camera distance while preserving one professional visual story.

### Optional fields

- `time_of_day`: Soft daytime studio ambience.
- `color_palette`: Deep navy, light ivory, pale warm gray, soft stone and restrained natural wood accents.
- `footwear`: The same minimalist dark leather low-profile shoes with a clean unbranded silhouette, unchanged and fully readable wherever the framing includes them.
- `accessories`: The same restrained small everyday professional accessories only; no statement jewelry, oversized watch, visible logo or status symbol.
- `makeup`: Natural camera-ready professional grooming; when makeup is applicable, use light even coverage, softly defined eyes and neutral lips without contour-led facial redesign.
- `shared_props`: `not_applicable`; no working object recurs across the full series.
- `pack_exclusions`: No aggressive power pose, crossed-arm dominance pose, staged handshake, conference-room performance, fake meeting, laptop-wall cliché, visible logo, executive status prop, crowded office, forced broad advertising smile or theatrical authority gesture.

## HERO COMPOSITIONS

### HC-001 — Professional Hero

#### Required fields

- `hero_composition_id`: `HC-001`
- `name`: Professional Hero
- `frame_role`: Main face-led professional portrait establishing direct credibility, calm competence and approachable eye contact.
- `kinds`: `portrait`
- `framing`: Vertical chest-up portrait including the complete head, hairline, shoulders and upper torso, with comfortable space around the head and the suit lapels clearly readable.
- `camera_position`: Eye-level camera placed nearly frontal at a natural portrait working distance with a moderate perspective and no wide-angle facial distortion.
- `expression`: Calm confident expression with relaxed facial muscles and a very subtle closed-lip warmth.
- `gaze`: Direct steady gaze into the camera lens.
- `head_turn`: Head nearly frontal with an approximately five-degree turn toward camera-left.
- `head_tilt`: Head upright with level chin and no lateral tilt.
- `torso_pose`: Torso upright and turned approximately ten degrees toward camera-right while remaining open to the camera.
- `shoulder_pose`: Shoulders relaxed, naturally level and slightly diagonal with the camera-left shoulder marginally forward.
- `left_arm`: Left upper arm rests naturally beside the torso and continues outside the lower crop.
- `right_arm`: Right upper arm rests naturally beside the torso and continues outside the lower crop.
- `left_hand`: `not_visible`; the chest-up crop ends above the naturally lowered left hand.
- `right_hand`: `not_visible`; the chest-up crop ends above the naturally lowered right hand.
- `body_pose`: Stable upright standing portrait with balanced posture, open chest and no lean, crossed arms or dominance gesture.
- `crop_boundary`: Complete head, hairline, shoulders, suit lapels and upper torso remain inside the frame; the crop ends below the chest without cutting the neck or shoulders.
- `limb_visibility`: Head, shoulders, upper torso and upper arms are visible; forearms and hands continue naturally below the intentional crop, while hips, legs and feet remain outside the frame.
- `composition_priority`: Recognizable face, direct eye contact and calm professional presence dominate the frame.

#### Optional fields

- `background`: Clean pale wall with one restrained architectural line and broad negative space; no desk, chair, screen or office decoration competes with the face.
- `lighting_note`: Preserve the shared soft camera-left key with gentle frontal fill and natural catchlights, keeping the face dimensional and the navy suit readable.
- `hairstyle_arrangement`: The shared loose worn-down professional hairstyle remains controlled and clear of both eyes without changing its overall arrangement.
- `hair_shoulder_placement`: Hair falls naturally behind both shoulders or remains above them according to the participant's real length, without covering the suit lapels.

### HC-002 — Supported Seated Portrait

#### Required fields

- `hero_composition_id`: `HC-002`
- `name`: Supported Seated Portrait
- `frame_role`: Seated three-quarter professional portrait demonstrating grounded posture, relaxed hands and approachable competence.
- `kinds`: `seated`
- `framing`: Vertical three-quarter seated portrait including the complete head, torso, chair, both hands, both knees, lower legs and complete shoes with clear margins.
- `camera_position`: Camera at seated upper-torso height, nearly frontal and slightly offset toward camera-left at a natural portrait working distance.
- `expression`: Calm attentive expression with relaxed cheeks and softly closed lips.
- `gaze`: Direct engaged gaze into the camera lens.
- `head_turn`: Head turned approximately five degrees toward camera-right, remaining nearly frontal.
- `head_tilt`: Head upright with level chin and no lateral tilt.
- `torso_pose`: Torso upright with a small natural forward inclination from the hips and no twist or slouch.
- `shoulder_pose`: Shoulders relaxed, level and aligned naturally with the nearly frontal torso.
- `left_arm`: Left forearm descends naturally from the relaxed elbow toward the left thigh.
- `right_arm`: Right forearm descends naturally from the relaxed elbow toward the right thigh.
- `left_hand`: Left hand rests open on the upper left thigh with relaxed separated fingers and a straight wrist.
- `right_hand`: Right hand rests open on the upper right thigh with relaxed separated fingers and a straight wrist.
- `body_pose`: Participant sits near the center-front of one simple armless chair with pelvis fully supported, spine neutral, knees approximately hip-width apart and both feet grounded.
- `crop_boundary`: Complete seated support, hands, knees, lower legs and shoes remain inside the frame without cutting through joints or footwear.
- `limb_visibility`: Both arms, hands, thighs, knees, lower legs, ankles and shoes are separately visible and anatomically connected.
- `composition_priority`: Recognizable face and grounded seated confidence dominate; the support chain and relaxed hands remain naturally readable.

#### Conditional anatomy fields — seated

- `support_object`: One stable simple armless chair with a flat seat and minimal light-neutral upholstery.
- `pelvis_contact`: Pelvis rests fully and visibly on the center-front of the chair seat.
- `left_leg_position`: Left thigh descends naturally from the hip with the knee bent and aligned above the left foot.
- `right_leg_position`: Right thigh descends naturally from the hip with the knee bent and kept clearly separate from the left leg.
- `left_foot_contact`: Complete left shoe rests flat on the floor with heel and toe readable.
- `right_foot_contact`: Complete right shoe rests flat on the floor with heel and toe readable and aligned beneath the right knee.
- `weight_distribution`: Most weight rests through the supported pelvis, balanced evenly by both grounded feet; neither hand carries body weight.

#### Optional fields

- `background`: The same pale minimalist interior with broad negative space and no additional working props.
- `lighting_note`: The shared camera-left key preserves facial volume, with believable contact shadows beneath the chair and shoes.
- `hairstyle_arrangement`: The shared loose worn-down professional hairstyle remains clear of the face during the slight forward inclination without changing its overall arrangement.
- `hair_shoulder_placement`: Hair stays controlled behind both shoulders or in its natural short position without covering the jacket front.

### HC-003 — Approachable Personal-Brand Moment

#### Required fields

- `hero_composition_id`: `HC-003`
- `name`: Approachable Personal-Brand Moment
- `frame_role`: Warmer personal-brand frame adding natural movement and openness without becoming casual, playful or staged.
- `kinds`: `portrait`
- `framing`: Vertical waist-up portrait including the complete head, torso, both elbows and both hands, with one closed notebook visible low in the frame.
- `camera_position`: Eye-level camera positioned approximately fifteen degrees toward camera-right at a natural editorial portrait distance.
- `expression`: Small natural closed-lip smile with relaxed cheeks and alert living eyes.
- `gaze`: Gaze directed slightly past camera-left rather than into the lens.
- `head_turn`: Head turned approximately fifteen degrees toward camera-left following the gaze.
- `head_tilt`: Very slight natural tilt toward camera-right with the chin level.
- `torso_pose`: Torso turned approximately twenty degrees toward camera-right with a neutral spine and a subtle natural forward engagement.
- `shoulder_pose`: Shoulders relaxed and softly diagonal, following the torso turn without lifting or tension.
- `left_arm`: Left elbow stays close to the torso while the forearm bends toward the work surface.
- `right_arm`: Right forearm rests low beside the torso without crossing the body.
- `left_hand`: Left fingertips rest lightly on the closed notebook near the lower camera-left area with a straight relaxed wrist.
- `right_hand`: Right hand rests open near the edge of the work surface, visibly separate from the notebook and left hand.
- `body_pose`: Stable upright stance beside a minimal work surface with a gentle torso turn and no lean, crossed arms or staged presentation pose.
- `crop_boundary`: Complete head, shoulders, torso, both elbows, both hands and the closed notebook remain inside the frame; the lower crop ends below the waist without cutting fingers.
- `limb_visibility`: Both arms and hands are visible and anatomically connected; hips continue naturally below the crop, while legs and feet remain outside the frame.
- `composition_priority`: The recognizable face, warmer expression and natural off-camera attention dominate; the notebook provides one restrained personal-brand action.

#### Optional fields

- `scene_action`: A restrained personal-brand action rather than passive stock posing: a quiet pause while the participant lightly settles one closed notebook on the work surface and looks toward an off-camera colleague.
- `prop_interaction`: The anatomical left fingertips make light contact with one slim unbranded closed notebook at waist height; the notebook remains supported by the work surface and is not presented to the camera.
- `foreground`: A narrow clean edge of the light work surface and the complete closed notebook remain low in the frame without covering the suit or hands.
- `background`: One softly receding architectural line within the same minimalist interior; no screen, shelf styling or additional work object.
- `lighting_note`: Preserve the shared camera-left key and gentle fill while allowing a soft background falloff that separates the turned torso.
- `hairstyle_arrangement`: The shared loose worn-down professional hairstyle follows the small torso turn while remaining controlled and clear of the face without changing its overall arrangement.
- `hair_shoulder_placement`: Hair remains behind both shoulders or in its natural short position, without crossing the notebook interaction or jacket lapels.

### HC-004 — Complete Professional Standing Portrait

#### Required fields

- `hero_composition_id`: `HC-004`
- `name`: Complete Professional Standing Portrait
- `frame_role`: Full-body professional finale showing the complete tailored outfit, consistent footwear and a relaxed credible standing posture.
- `kinds`: `full-body`
- `framing`: Vertical full-body portrait including the complete participant from hair through both shoes with clear space above the head and below the feet.
- `camera_position`: Camera near mid-torso height at a realistic full-body working distance, nearly frontal with a moderate natural perspective and no low-angle authority effect.
- `expression`: Calm approachable closed-lip expression with relaxed facial muscles.
- `gaze`: Direct composed gaze into the camera lens.
- `head_turn`: Head nearly frontal with an approximately five-degree turn toward camera-left.
- `head_tilt`: Head upright with level chin and no lateral tilt.
- `torso_pose`: Torso upright and turned approximately ten degrees toward camera-right with a neutral spine.
- `shoulder_pose`: Shoulders relaxed and slightly diagonal, following the small torso turn.
- `left_arm`: Left arm hangs naturally beside the torso with a soft elbow and no contact with the hip.
- `right_arm`: Right elbow bends gently toward the jacket front without crossing the torso.
- `left_hand`: Left hand hangs relaxed beside the left thigh with naturally separated fingers.
- `right_hand`: Right fingertips lightly touch the lower jacket edge with a straight wrist and no forceful lapel grip.
- `body_pose`: Stable natural standing pose with weight primarily over the left leg, the right leg relaxed slightly forward and no wide stance, hands-on-hips posture or aggressive body expansion.
- `crop_boundary`: Complete head, suit, trousers, legs and both shoes remain inside the frame with clear margins and no crop through hair, fingers, ankles or footwear.
- `limb_visibility`: Both arms, hands, thighs, knees, lower legs, ankles and shoes remain separately visible and anatomically connected.
- `composition_priority`: Recognizable face and complete professional silhouette dominate, with the identical suit and shoes clearly readable as one coherent look.

#### Conditional anatomy fields — full-body

- `left_leg_position`: Left leg remains nearly straight beneath the pelvis with a soft unlocked knee and clear hip-to-ankle alignment.
- `right_leg_position`: Right leg advances slightly from the hip with a gentle natural knee bend and remains separate from the left leg.
- `left_foot_visibility`: Complete left shoe, heel and toe remain visible and unobstructed.
- `right_foot_visibility`: Complete right shoe, heel and toe remain visible and unobstructed.
- `weight_bearing`: Most body weight passes through the left leg and fully grounded left foot; the right foot provides light secondary balance.

#### Optional fields

- `background`: The same bright minimalist interior with one subtle vertical architectural element and no desk, chair or working prop.
- `lighting_note`: Preserve the shared camera-left key across face and full suit, with realistic floor contact shadows beneath both shoes.
- `hairstyle_arrangement`: The shared loose worn-down professional hairstyle remains controlled and clear of the face in the complete standing frame without changing its overall arrangement.
- `hair_shoulder_placement`: Hair stays behind both shoulders or in its natural short position so the jacket silhouette remains readable.
