# Experiment Notes

## 2026-07-01: MVP Formula freeze

Current MVP Formula is frozen for product-flow work:

- `openai/gpt-image-2` via Replicate;
- `IDENTITY_v2` with `gaze-balance` wording;
- `BODY_v2`;
- `AGE_v1`;
- `REALISM_v1`;
- current realistic/editorial Style;
- Character Layer remains Deferred for MVP.

Decisions:

- Identity research is closed for the current MVP stage.
- General Gaze wording research is closed for the current MVP stage.
- Gaze and expression should be controlled by Scene prompts, not by changing the Base Formula.
- Moment is useful as a scene-level enhancer for portrait and premium scenes.
- Moment is not part of the Base Formula.
- Big Facial Character remains scene-specific only.
- `gaze-choice` is rejected as a universal replacement.

Scene prompt rule for premium/editorial scenes:

```text
Premium/editorial should mean professional photography quality, not fashion-model transformation.

Keep the same real body proportions, natural face, realistic age cues and personal appearance.

Avoid fashion-model body reshaping, excessive slimming, glossy retouching, artificial perfection or generic luxury-advertising look.
```

Next focus:

Move from AI Identity/Gaze research to MVP product flow.

## 2026-07-01: Gaze wording variants

Base MVP formula:

- `IDENTITY_v2` with `gaze-balance` wording;
- `BODY_v2`;
- `AGE_v1`;
- `REALISM_v1`;
- current Style;
- Character Layer remains Deferred for MVP.

Decision:

The current MVP baseline remains `gaze-balance`.

### Rejected as universal replacement: gaze-choice

Why it was tested:

- direct eye contact was too rare in the baseline;
- the hypothesis was that the gaze block was too cautious.

What improved:

- direct gaze appeared in cafe and home scenes;
- reference-copy did not return;
- glasses and glare did not return.

Why it is rejected:

- likeness became weaker;
- face became smoother and more universal;
- some results felt closer to ordinary portrait/selfie than paid photoshoot;
- photoshoot quality decreased in some scenes.

Conclusion:

Do not promote `gaze-choice` to the MVP baseline.

### Scene-specific option: big Facial Character

Big Facial Character remains a promising scene-specific option for portrait-heavy scenes.

Use only as an experimental scene-level variant, not as the universal MVP formula.

Why:

- it can improve recognizability in some scenes;
- it can help direct gaze;
- it did not bring back reference-copy, glasses or glare;
- but it is not stable across lifestyle scenes and can make the face more generic or glossy.

## 2026-07-30: AI quality baseline after Identity Input v2 diagnostics

Provider decision:

- `SP-005 / HC-001` remains enabled. The distant top-down full-body result passed the MVP check: identity remained recognizable, there was no obvious different-person effect, legs and feet were correct, and the composition was usable for MVP.
- Face-centric crops showed potential value for distant identity, but are not adopted in production. The tested coordinates were manually fixed for A1+A2 only, there is no universal automatic crop mechanism for user photos, and braid/parting copying was not removed consistently.
- Only `SP-007 / HC-003` is temporarily excluded from the MVP generation set because over-shoulder behavior remained unstable and one result contained an unnatural head turn.
- All other Hero Compositions remain enabled.

Frozen AI baseline:

- current Prompt Assembly;
- Hero Composition Authoring Contract;
- complete 28-item production Hero Composition catalog;
- pose-specific anatomy safety;
- current reference policy and provider parameters.

No prompt changes, reference-policy changes or Identity Input v2 production adoption are approved by this decision. Further provider tests or prompt, HC and crop iterations require a separate decision.

## 2026-07-30: Nano Banana benchmark and final identity consistency baseline

Final decision:

- The accepted primary model candidate for PhotoGen is google/nano-banana-2.
- The strengthened common identity contract below is the production AI baseline.
- The production provider is not switched automatically by this decision.
- SP-007 / HC-003 remains excluded from the MVP generation set until a separate decision.

Frozen model and request configuration:

- model: google/nano-banana-2;
- model version: d1be8b5fc0931a253d417e12a484ac01ee9ccbc6daffd4792151377d5e5ff55f;
- schema SHA-256: cc310951747bb4ce3cf532dec28da2e0c70fe6dbc4fbe615e8e2c33e5a47fcea;
- aspect ratio: 2:3;
- resolution: 1K;
- output format: jpg;
- image search: disabled;
- Google search: disabled;
- price used for the benchmark: USD 0.067 per successful image;
- references: production crops A1 followed by A2, without face-centric crops;
- A1 SHA-256: c20ab07318f0e99c18b7f59bcd050af48b0aff10cdcfb08b538d86d55fe3090c;
- A2 SHA-256: 491694665321d133f69a323b83d0882d6cd7108dcdc67319b8e8687c0b78f135.

Accepted common identity contract:

    IDENTITY PRESERVATION

    Preserve the exact identity of the person shown in the reference images.

    Maintain the same recognizable facial anatomy and individual facial proportions:
    face shape, forehead, eyebrow shape, eye shape and spacing, nose shape,
    cheek structure, lips, jawline, chin, natural skin tone and visual age.

    Do not beautify, idealize, average, rejuvenate, stylize or redesign the face.
    Do not replace the person with a similar-looking person.
    Do not alter distinctive facial features, even in medium shots,
    full-body compositions or unusual camera angles.

    Expression, gaze, head direction, head tilt, hairstyle, hair arrangement,
    hair parting and makeup are variable attributes of the current composition.
    They must follow the current Hero Composition without changing
    the person's identity or facial anatomy.

Benchmark record:

- The first comparison used the same Persona, production crops A1 to A2, prompts, structured Hero Composition contracts and 2:3 output across google/nano-banana, google/nano-banana-2 and google/nano-banana-pro.
- google/nano-banana completed 4/4 generations at USD 0.039 per image, total USD 0.156, and was not selected.
- google/nano-banana-2 completed 4/4 generations at USD 0.067 per image, total USD 0.268, and was selected as the best quality/cost candidate.
- google/nano-banana-pro completed 4/4 generations at USD 0.15 per image, total USD 0.60, but was rejected: identity was not better than Nano Banana 2, one frame contained an anatomical hand-connectivity defect, and the higher price was not justified.

Final identity consistency run:

- test ID: nano-banana-2-identity-consistency-2026-07-30;
- production code SHA-256: ae6e64571c09b39c2bab27e858189d0cf9b6139cf120e9bf84268ed06871854e;
- 4 provider POST attempts, 4 successful predictions, 0 retries;
- total cost: USD 0.268;
- identity preservation: accepted;
- facial-expression diversity: accepted;
- hairstyle changes following the current Hero Composition: accepted;
- distant full-body identity recognizability: accepted;
- overall result: visually accepted by the user.

Consistency prediction IDs:

- SP-009 / HC-001 Portrait: 9bxw1zk64nrmy0czpf49f6hv0w;
- SP-009 / HC-002 Seated: dzrrajyawdrmw0czpf4b0qqks4;
- SP-005 / HC-001 Full-body distant: ks693rj031rmw0czpf4s019f80;
- SP-007 / HC-003 Over-shoulder stress control: grdwm6nrhdrmy0czpf4rdwkyv0.

Stop rule:

- Model comparison, provider smoke testing and prompt iteration are closed.
- Do not run new models, provider tests, retries or additional prompt iterations without a new explicit product decision.
- Do not adopt face-centric crops or alter references, production crops, Hero Compositions, anatomy safety, lifecycle, payment, Persona, SQL or frontend as part of this baseline decision.
