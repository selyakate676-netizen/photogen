import type { PhotoshootGender } from "@/types/database";

export const NANO_BANANA_MODEL_ID = "google/nano-banana";
export const NANO_BANANA_COMPOSITION_PROMPT_VERSION = "nano-banana-composition-v1";

interface NanoBananaCompositionPromptInput {
  styleId: string;
  gender: PhotoshootGender;
}

const STYLE_CONTEXT: Record<string, string> = {
  career: "modern professional outfit, polished business portrait, premium office background",
  dating: "stylish relaxed outfit, warm natural expression, bright lifestyle background",
  social: "fashionable casual outfit, editorial lifestyle portrait, modern cafe or city background",
  neon: "cinematic outfit, neon city background, dramatic colored rim light",
  bw: "elegant black outfit, pure black and white portrait, dramatic studio background",
  studio: "minimal elegant outfit, dark seamless studio background, soft Rembrandt lighting",
};

function getStyleContext(styleId: string): string {
  return STYLE_CONTEXT[styleId.toLowerCase()] || STYLE_CONTEXT.social;
}

export function getNanoBananaCompositionPrompts(input: NanoBananaCompositionPromptInput): string[] {
  const subject = input.gender === "man" ? "man" : "woman";
  const styleContext = getStyleContext(input.styleId);

  return [
    `RAW photorealistic portrait of a ${subject}, ${styleContext}, natural confident expression, realistic skin texture with visible pores, professional photography, 85mm lens, shallow depth of field, not AI, not illustration`,
    `Editorial photo of a ${subject}, ${styleContext}, natural pose, balanced body proportions, realistic hands, cinematic light, high detail, real camera look, not digital art`,
    `Premium lifestyle portrait of a ${subject}, ${styleContext}, flattering pose, believable clothing folds, natural face expression, realistic skin and hair detail, professional studio quality`,
    `High-end magazine portrait of a ${subject}, ${styleContext}, clean composition, realistic anatomy, natural smile, soft shadows, sharp focus, photographic realism`,
  ];
}
