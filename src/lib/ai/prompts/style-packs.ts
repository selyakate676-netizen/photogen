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
      title: "Soft side-light artistic portrait",
      prompt:
        "Photorealistic black and white soft side-light portrait of tok woman, close-up to chest-up portrait, gentle three-quarter angle, eyes looking slightly to the side away from camera, calm elegant expression, lips closed, preserve facial identity, same facial structure, same eye shape, same nose, same jawline, flattering soft directional light from one side with gentle fill light, both eyes readable with natural catchlights, smooth natural skin without harsh texture, youthful natural appearance, dark gray studio background, softly styled hair, minimal polished makeup, elegant artistic studio photography, 85mm lens, true 3:4 vertical composition",
      negativePrompt:
        `${BLACK_WHITE_EDITORIAL_NEGATIVE_PROMPT}, deep shadow, dramatic aging, tired face, grey hair, harsh wrinkles, forehead wrinkles, under eye bags, harsh shadow covering eyes, crushed facial features, low angle, changed face, different person, altered jaw, altered cheeks`,
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
