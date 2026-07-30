export const MAX_PERSONA_REFERENCE_IMAGES = 2;

export const IDENTITY_REFERENCE_POLICY = [
  "The uploaded images are identity references only.",
  "Extract only the person's stable identity: facial structure, individual facial features, eye color, skin tone, approximate age, natural hair color and hairline.",
  "Do not use the reference images as composition, pose, expression, gaze, hairstyle, lighting, framing or wardrobe references.",
  "For head angle, gaze, expression, hairstyle, pose and composition, follow the current scene instructions exclusively.",
].join(" ");

export function selectPersonaReferenceKeys(keys: string[], requestedLimit?: number): string[] {
  const uniqueKeys = [...new Set(keys.filter((key) => key.length > 0))];
  const normalizedLimit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(MAX_PERSONA_REFERENCE_IMAGES, Math.trunc(requestedLimit as number)))
    : MAX_PERSONA_REFERENCE_IMAGES;

  return uniqueKeys.slice(0, normalizedLimit);
}
