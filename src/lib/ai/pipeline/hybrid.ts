import Replicate from "replicate";
import type { WebhookEventType } from "replicate";
import { LEGACY_LORA_MODEL_ID } from "@/lib/ai/prompts/legacy-lora";
import {
  NANO_BANANA_MODEL_ID,
  getNanoBananaCompositionPrompts,
} from "@/lib/ai/prompts/nano-banana";
import type { AiFaceIntegrationMethod } from "@/lib/ai/pipeline/types";
import type { Photoshoot } from "@/types/database";

const FACE_SWAP_MODEL_VERSION_ID = "278a81e7ebb22db98bcba54de985d22cc1abeead2754eb1f2af717247be69b34";
const REQUIRED_FINAL_ASPECT_RATIO = "3:4";

type HybridPromptPhotoshoot = Pick<Photoshoot, "style_id" | "gender">;

interface NanoBananaCompositionInput {
  prompt: string;
  image_input: string[];
  aspect_ratio: "3:4";
  output_format: "jpg";
}

interface StartNanoBananaCompositionPredictionsInput {
  replicate: Replicate;
  referenceImageUrls: string[];
  prompts: string[];
  webhookUrl?: string;
}

interface LoraImg2ImgInput {
  image: string;
  prompt: string;
  hf_lora: string;
  lora_scale: number;
  prompt_strength: number;
  num_outputs: 1;
  output_format: "jpg";
  output_quality: number;
  guidance_scale: number;
  num_inference_steps: number;
}

interface FluxLoraIdentityInput {
  prompt: string;
  hf_lora: string;
  lora_scale: number;
  num_outputs: 1;
  aspect_ratio: "1:1";
  output_format: "jpg";
  output_quality: number;
  guidance: number;
  num_inference_steps: number;
}

interface FaceSwapInput {
  input_image: string;
  swap_image: string;
}

export interface LoraIdentityReference {
  source: "flux-lora-identity-reference";
  imageUrl: string;
  s3Key?: string;
  loraUrl: string;
}

export interface FaceIntegrationPlan {
  method: AiFaceIntegrationMethod;
  compositionImageUrl: string;
  identityReference: LoraIdentityReference;
  loraUrl?: string;
  promptStrength?: number;
  requiredFinalAspectRatio?: typeof REQUIRED_FINAL_ASPECT_RATIO;
  requiresPostProcessAspectRatio?: boolean;
}

const completedEvents: WebhookEventType[] = ["completed"];

async function getLatestNanoBananaVersionId(replicate: Replicate): Promise<string | null> {
  try {
    const [modelOwner, modelName] = NANO_BANANA_MODEL_ID.split("/") as [string, string];
    const modelInfo = await replicate.models.get(modelOwner, modelName);
    return modelInfo?.latest_version?.id || null;
  } catch (err) {
    console.error("Could not get latest Nano Banana model version:", err);
    return null;
  }
}

async function getLatestFluxLoraIdentityVersionId(replicate: Replicate): Promise<string | null> {
  try {
    const [modelOwner, modelName] = LEGACY_LORA_MODEL_ID.split("/") as [string, string];
    const modelInfo = await replicate.models.get(modelOwner, modelName);
    return modelInfo?.latest_version?.id || null;
  } catch (err) {
    console.error("Could not get latest Flux LoRA identity model version:", err);
    return null;
  }
}

export function getHybridNanoBananaPromptsForPhotoshoot(
  photoshoot: HybridPromptPhotoshoot | null,
): string[] {
  return getNanoBananaCompositionPrompts({
    styleId: photoshoot?.style_id || "social",
    gender: photoshoot?.gender === "man" ? "man" : "woman",
  });
}

export function createNanoBananaCompositionInputs(
  referenceImageUrls: string[],
  prompts: string[],
): NanoBananaCompositionInput[] {
  return prompts.map((prompt) => ({
    prompt,
    image_input: referenceImageUrls,
    aspect_ratio: "3:4",
    output_format: "jpg",
  }));
}

export function createFluxLoraIdentityInput(input: {
  loraUrl: string;
  gender: Photoshoot["gender"];
}): FluxLoraIdentityInput {
  const subject = input.gender === "man" ? "man" : "woman";

  return {
    prompt: `tok ${subject}, centered photorealistic face portrait, neutral expression, direct eye contact, natural skin texture, clean studio light, no heavy makeup, no accessories, face identity reference`,
    hf_lora: input.loraUrl,
    lora_scale: 1.15,
    num_outputs: 1,
    aspect_ratio: "1:1",
    output_format: "jpg",
    output_quality: 100,
    guidance: 3.5,
    num_inference_steps: 30,
  };
}

export async function startFluxLoraIdentityPrediction(input: {
  replicate: Replicate;
  loraUrl: string;
  gender: Photoshoot["gender"];
}): Promise<string> {
  const versionId = await getLatestFluxLoraIdentityVersionId(input.replicate);

  if (!versionId) {
    throw new Error("Flux LoRA identity model version is not available");
  }

  const prediction = await input.replicate.predictions.create({
    version: versionId,
    input: createFluxLoraIdentityInput({
      loraUrl: input.loraUrl,
      gender: input.gender,
    }),
  });

  return prediction.id;
}

export function createLoraIdentityReference(input: {
  imageUrl: string;
  s3Key?: string;
  loraUrl: string;
}): LoraIdentityReference {
  return {
    source: "flux-lora-identity-reference",
    imageUrl: input.imageUrl,
    s3Key: input.s3Key,
    loraUrl: input.loraUrl,
  };
}

export function createLoraImg2ImgFaceIntegrationPlan(input: {
  compositionImageUrl: string;
  identityReference: LoraIdentityReference;
  loraUrl: string;
  promptStrength?: number;
}): FaceIntegrationPlan {
  return {
    method: "lora-img2img",
    compositionImageUrl: input.compositionImageUrl,
    identityReference: input.identityReference,
    loraUrl: input.loraUrl,
    promptStrength: input.promptStrength ?? 0.5,
    requiredFinalAspectRatio: REQUIRED_FINAL_ASPECT_RATIO,
    requiresPostProcessAspectRatio: true,
  };
}

export function createFaceSwapIntegrationPlan(input: {
  compositionImageUrl: string;
  identityReference: LoraIdentityReference;
}): FaceIntegrationPlan {
  return {
    method: "face-swap",
    compositionImageUrl: input.compositionImageUrl,
    identityReference: input.identityReference,
  };
}

export function createFaceSwapInput(plan: FaceIntegrationPlan): FaceSwapInput {
  if (plan.method !== "face-swap") {
    throw new Error("Face swap input requires method=face-swap");
  }

  return {
    input_image: plan.compositionImageUrl,
    swap_image: plan.identityReference.imageUrl,
  };
}

export function createFaceSwapPredictionPayload(
  plan: FaceIntegrationPlan,
): Parameters<Replicate["predictions"]["create"]>[0] {
  return {
    version: FACE_SWAP_MODEL_VERSION_ID,
    input: createFaceSwapInput(plan),
  };
}

export async function startFaceSwapPrediction(input: {
  replicate: Replicate;
  plan: FaceIntegrationPlan;
}): Promise<string> {
  const prediction = await input.replicate.predictions.create(
    createFaceSwapPredictionPayload(input.plan),
  );

  return prediction.id;
}

export function createLoraImg2ImgInput(plan: FaceIntegrationPlan): LoraImg2ImgInput {
  if (plan.method !== "lora-img2img" || !plan.loraUrl) {
    throw new Error("LoRA img2img face integration requires method=lora-img2img and loraUrl");
  }

  return {
    image: plan.compositionImageUrl,
    prompt:
      "tok person, ultra photorealistic portrait, natural skin texture, realistic face identity, professional photography, soft cinematic light, sharp focus",
    hf_lora: plan.loraUrl,
    lora_scale: 1,
    prompt_strength: plan.promptStrength ?? 0.5,
    num_outputs: 1,
    output_format: "jpg",
    output_quality: 95,
    guidance_scale: 3.5,
    num_inference_steps: 30,
  };
}

export async function startNanoBananaCompositionPredictions({
  replicate,
  referenceImageUrls,
  prompts,
  webhookUrl,
}: StartNanoBananaCompositionPredictionsInput): Promise<string[]> {
  const versionId = await getLatestNanoBananaVersionId(replicate);

  if (!versionId) {
    throw new Error("Nano Banana model version is not available");
  }

  const predictionIds: string[] = [];
  const compositionInputs = createNanoBananaCompositionInputs(referenceImageUrls, prompts);

  for (const input of compositionInputs) {
    const predictionPayload: Parameters<typeof replicate.predictions.create>[0] = {
      version: versionId,
      input,
      ...(webhookUrl
        ? {
            webhook: webhookUrl,
            webhook_events_filter: completedEvents,
          }
        : {}),
    };

    const prediction = await replicate.predictions.create(predictionPayload);
    predictionIds.push(prediction.id);
  }

  return predictionIds;
}
