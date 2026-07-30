import type { PhotoshootGender } from "@/types/database";

export const LEGACY_LORA_PIPELINE_VERSION = "legacy-lora-v1";
export const LEGACY_LORA_MODEL_ID = "selyakate676-netizen/photogen_models";

export const LEGACY_LORA_NEGATIVE_PROMPT =
  "acne, pimples, skin blemishes, spots, fat face, chubby cheeks, overweight, double chin, bloated face, distorted face, cartoon, cgi, deformed anatomy, extra fingers, mutated hands, bad proportions";

interface LegacyLoraPromptInput {
  styleId: string;
  gender: PhotoshootGender;
  bodyType: string;
  eyeColor: string;
  hairColor: string;
}

function getBodyDescription(bodyType: string): string {
  if (bodyType === "slim") return "slim and thin";
  if (bodyType === "athletic") return "toned and athletic";
  if (bodyType === "curvy") return "curvy and voluptuous feminine";
  return "average";
}

function getEyeDescription(eyeColor: string): string {
  if (eyeColor === "blue") return "blue";
  if (eyeColor === "green") return "green";
  if (eyeColor === "grey") return "grey";
  return "brown";
}

function getHairDescription(hairColor: string): string {
  if (hairColor === "blonde") return "blonde";
  if (hairColor === "brown") return "brown";
  if (hairColor === "red") return "red";
  return "dark";
}

function getSubjectDescription(input: LegacyLoraPromptInput): string {
  const bodyDesc = getBodyDescription(input.bodyType);

  if (input.styleId.toLowerCase() === "bw") {
    return `tok ${input.gender} with ${bodyDesc} body shape`;
  }

  return `tok ${input.gender} with ${bodyDesc} body shape, ${getEyeDescription(input.eyeColor)} eyes, and ${getHairDescription(input.hairColor)} hair`;
}

const BASE_PROMPTS: Record<string, string> = {
  career:
    "Professional editorial portrait of a tok person wearing high-end tailored business attire, modern corporate office background. High-resolution medium shot, Phase One XF IQ4, 85mm f/1.4 lens, beautifully balanced Rembrandt lighting, extremely sharp focus, ultra-realistic skin texture, pores, candid and natural facial proportions, unedited photography, 8k.",
  dating:
    "Natural unedited candid photo of a tok person for a dating profile, casual but stylish clothing, bright sunny outdoor environment. 50mm lens f/2.0, soft natural sunlight, shallow depth of field, real skin textures with slight imperfections, effortless charisma, highly photorealistic, taken on Fujifilm XT4.",
  social:
    "Medium shot of a tok person sitting at a high-end minimalist cafe. Wearing stylish casual fashionable clothes. Lifestyle photography, taken on Sony A7R iv, 35mm f/1.8, cinematic depth of field, natural soft window lighting, highly detailed unedited face, authentic proportions, hyper-realistic.",
  neon:
    "Cinematic portrait of a tok person in a dark cyberpunk city alley. Vibrant neon rim-lighting illuminating the face, deep moody shadows. Shot on Arri Alexa 65, anamorphic lens, beautiful cinematic grain, highly realistic skin reflection, 8k raw.",
  bw:
    "Striking fine art pure black and white portrait of a tok person. High-contrast monochromatic photography, strictly greyscale, no colors, Tri-X 400 film stock, dramatic natural light and deep shadows, emphasizing symmetrical beautiful facial structure, flawless skin, highly detailed, realistic.",
};

function getBlackAndWhitePrompts(gender: PhotoshootGender): string[] {
  return [
    `Stunning glamour close-up portrait of a tok ${gender} looking directly into camera with a warm soft smile. Dark dramatic studio background. Beautiful Rembrandt split lighting, strong contrast, 85mm f/1.2 lens. Black and white. High fashion editorial.`,
    `Elegant beauty portrait of a tok ${gender}, head turned 3/4 toward camera, sophisticated serene expression, slight smile. Beautiful chiaroscuro studio lighting, deep shadows, bright highlights on cheekbones. Black and white. 85mm f/1.4, magazine quality.`,
    `Dramatic cinematic close-up of a tok ${gender} with a magnetic confident gaze and subtle smile. Strong directional key light from above creating beautiful shadows. Dark background. Black and white high contrast, 85mm lens. Ultra sharp.`,
    `Radiant beauty shot of a tok ${gender} with a natural soft smile, head slightly tilted. Butterfly lighting setup, beautiful catch light in eyes. Studio background. Black and white. 85mm f/1.4, ultra flattering angle.`,
  ];
}

const STUDIO_PROMPTS = [
  "A tok person. Professional color studio portrait, close up face shot. Looking directly at the camera. Long hair styled in soft waves below shoulders. Flawless smooth retouched skin, magazine cover aesthetic, healthy glowing skin. Dark grey seamless background. Rembrandt lighting, 85mm lens.",
  "A tok person. Professional color studio portrait, chest up shot. Looking slightly away thoughtfully. Long hair styled in soft waves below shoulders. Flawless smooth retouched skin, glamorous fashion editorial, rich cinematic colors. Dark grey seamless background. Soft moody lighting, 50mm lens.",
  "A tok person. Professional color studio portrait, waist up shot. Standing relaxed. Long hair styled in soft waves below shoulders. Slight natural smile. Flawless smooth retouched skin. Dark grey seamless background. Soft diffused lighting, 50mm lens.",
  "A tok person. Professional color studio portrait, 3/4 body shot. Standing with body slightly angled, no hands visible. Long hair styled in soft waves below shoulders. Flawless smooth retouched skin, elegant outfit. Dark grey seamless background. Rim lighting, 50mm lens.",
];

export function getLegacyLoraPrompts(input: LegacyLoraPromptInput): string[] {
  const style = input.styleId.toLowerCase();
  const subjectDescription = getSubjectDescription(input);

  let prompts: string[];
  if (style === "studio") {
    prompts = STUDIO_PROMPTS;
  } else if (style === "bw") {
    prompts = getBlackAndWhitePrompts(input.gender);
  } else {
    const fallback = BASE_PROMPTS[style] || BASE_PROMPTS.social;
    prompts = [fallback, fallback, fallback, fallback];
  }

  return prompts.map((prompt) => prompt.replace(/tok person/gi, subjectDescription));
}
