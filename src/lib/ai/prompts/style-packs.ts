export const LORA_ONLY_GENERATION_SETTINGS = {
  aspect_ratio: "3:4",
  guidance: 3.5,
  output_quality: 100,
  output_format: "jpg",
} as const;

export interface LoraOnlyShotPreset {
  id: string;
  title: string;
  prompt: string;
  negativePrompt: string;
  status?: "main" | "optional" | "risky";
}

export interface LoraOnlyStylePack {
  id: string;
  title: string;
  description: string;
  shots: LoraOnlyShotPreset[];
}

export const BLACK_WHITE_EDITORIAL_NEGATIVE_PROMPT =
  "color, warm color grading, horizontal stretching, wide face, distorted face, elongated torso, extra slim body, too thin, unrealistic body, awkward figure, childlike hands, deformed hands, bad anatomy, extra fingers, hands near face except where specified, glasses, hat, fake smile, exaggerated smile, too many teeth, open mouth except where specified, caricature, painting, plastic skin, old face, harsh wrinkles, glossy overretouching, full body tiny face, fashion illustration";

export const BLACK_WHITE_EDITORIAL_PACK: LoraOnlyStylePack = {
  id: "black_white_editorial",
  title: "Black & White Editorial",
  description:
    "Controlled LoRA-only black and white studio package: realistic face, elegant styling, five proven portrait distances.",
  shots: [
    {
      id: "bw_mid_thigh_blazer_direct",
      title: "Mid-thigh blazer, direct gaze",
      prompt:
        "Photorealistic black and white vertical studio fashion portrait of tok woman, mid-thigh portrait, standing straight and calm, direct eye contact, serious neutral expression, oversized black blazer over a simple light top, sleeves slightly pushed up, hands relaxed low at sides, natural average adult body proportions, normal shoulder width, natural torso length, clean light gray seamless studio background, soft diffused studio light, realistic skin, minimal makeup, straight natural hair over one shoulder, premium editorial portrait photography, true 3:4 vertical composition",
      negativePrompt: BLACK_WHITE_EDITORIAL_NEGATIVE_PROMPT,
    },
    {
      id: "bw_dramatic_shadow_profile_close",
      title: "Fashion beauty shadow portrait",
      prompt:
        "Photorealistic black and white fashion beauty close-up portrait of tok woman, elegant three-quarter side angle, eyes looking to the side away from camera, relaxed beautiful expression, lips softly closed, preserve facial identity, same facial structure, same eye shape, same nose, same jawline, flattering beauty lighting, soft graphic shadow pattern across part of the face, beautiful catchlights in the eyes, smooth youthful skin, polished healthy skin, softly styled hair, clean black studio background, stylish modern beauty photography, refined and elegant, not gloomy, not noir, 85mm lens, true 3:4 vertical composition",
      negativePrompt:
        `${BLACK_WHITE_EDITORIAL_NEGATIVE_PROMPT}, noir, gloomy, funeral portrait, tired face, grey hair, messy hair, harsh skin texture, pores emphasized, deep wrinkles, forehead wrinkles, under eye bags, dramatic aging, harsh shadow covering eyes, crushed facial features, low angle, changed face, different person, altered jaw, altered cheeks`,
      status: "risky",
    },
    {
      id: "bw_soft_beauty_side_gaze_close",
      title: "Soft beauty side-gaze close-up",
      prompt:
        "Photorealistic black and white soft beauty close-up portrait of tok woman, elegant three-quarter angle, eyes looking slightly to the side away from camera, relaxed calm expression, lips gently closed, preserve facial identity, same facial structure, same eye shape, same nose, same jawline, flattering soft beauty lighting, both eyes clearly readable with natural catchlights, smooth healthy skin without harsh texture, youthful natural appearance, softly styled straight hair with light volume, dark gray studio background, minimal polished makeup, refined modern portrait photography, 85mm lens, shallow depth of field, true 3:4 vertical composition",
      negativePrompt:
        `${BLACK_WHITE_EDITORIAL_NEGATIVE_PROMPT}, harsh shadow, deep shadow, noir, gloomy, funeral portrait, tired face, grey hair, messy hair, harsh skin texture, pores emphasized, deep wrinkles, forehead wrinkles, under eye bags, dramatic aging, changed face, different person, altered jaw, altered cheeks`,
      status: "main",
    },
    {
      id: "bw_soft_black_turtleneck_smile",
      title: "Soft black turtleneck smile",
      prompt:
        "Photorealistic black and white close-up studio portrait of tok woman, wearing a black turtleneck, soft natural warm smile with lips mostly closed, direct eye contact, relaxed genuine expression, softly styled straight hair swept to one side, dark black background, soft beauty light with gentle falloff, natural skin, elegant minimal portrait, premium realistic editorial photography, 85mm lens, shallow depth of field, true 3:4 vertical composition",
      negativePrompt: BLACK_WHITE_EDITORIAL_NEGATIVE_PROMPT,
    },
    {
      id: "bw_bright_natural_teeth_smile",
      title: "Bright natural smile with teeth",
      prompt:
        "Photorealistic black and white close-up portrait of tok woman, direct eye contact, gentle natural warm smile with small teeth visible, smiling eyes, relaxed genuine expression, not exaggerated, preserve facial identity, same facial structure, same eye shape, same nose, same jawline, same cheeks, long smooth hair over one shoulder, simple dark top, deep black studio background, soft flattering beauty light, realistic skin and natural facial proportions, premium commercial portrait photography, 85mm lens, true 3:4 vertical composition",
      negativePrompt:
        `${BLACK_WHITE_EDITORIAL_NEGATIVE_PROMPT}, changed face, different person, altered jaw, altered cheeks, exaggerated cheeks, wide grin, wide open mouth, forced advertising smile, excessive teeth`,
    },
    {
      id: "bw_waist_up_blazer_side_gaze",
      title: "Waist-up blazer, side gaze",
      prompt:
        "Photorealistic black and white vertical studio portrait of tok woman, waist-up portrait, body turned slightly to the side, looking past camera with calm confident expression, black tailored blazer buttoned, subtle delicate necklace, one hand in pocket, other arm relaxed, natural average adult body proportions, clean light gray seamless studio background, soft diffused studio lighting, straight natural hair with light volume, minimal polished makeup, premium editorial fashion portrait photography, true 3:4 vertical composition",
      negativePrompt: BLACK_WHITE_EDITORIAL_NEGATIVE_PROMPT,
    },
  ],
};
