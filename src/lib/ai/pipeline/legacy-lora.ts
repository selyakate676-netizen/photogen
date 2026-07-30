import Replicate from "replicate";
import type { WebhookEventType } from "replicate";
import {
  LEGACY_LORA_MODEL_ID,
  LEGACY_LORA_NEGATIVE_PROMPT,
  getLegacyLoraPrompts,
} from "@/lib/ai/prompts/legacy-lora";
import type { Photoshoot } from "@/types/database";

interface StartLegacyLoraPredictionsInput {
  replicate: Replicate;
  prompts: string[];
  webhookUrl: string;
}

type LegacyLoraPromptPhotoshoot = Pick<
  Photoshoot,
  "style_id" | "gender" | "body_type" | "eye_color" | "hair_color"
>;

const completedEvents: WebhookEventType[] = ["completed"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getLatestLegacyLoraVersionId(replicate: Replicate): Promise<string | null> {
  try {
    const [modelOwner, modelName] = LEGACY_LORA_MODEL_ID.split("/") as [string, string];
    const modelInfo = await replicate.models.get(modelOwner, modelName);
    return modelInfo?.latest_version?.id || null;
  } catch (err) {
    console.error("Could not get latest legacy LoRA model version; falling back to model id:", err);
    return null;
  }
}

export function getLegacyLoraPromptsForPhotoshoot(
  photoshoot: LegacyLoraPromptPhotoshoot | null,
): string[] {
  return getLegacyLoraPrompts({
    styleId: photoshoot?.style_id || "business",
    gender: photoshoot?.gender === "man" ? "man" : "woman",
    bodyType: photoshoot?.body_type || "average",
    eyeColor: photoshoot?.eye_color || "brown",
    hairColor: photoshoot?.hair_color || "dark",
  });
}

export function extractLegacyLoraUrlFromTrainingPayload(payload: unknown): string | null {
  if (!isRecord(payload) || !isRecord(payload.output)) {
    return null;
  }

  const weights = payload.output.weights;
  const loraOutput = weights || payload.output;

  if (!loraOutput) {
    return null;
  }

  return typeof loraOutput === "string" ? loraOutput : JSON.stringify(loraOutput);
}

export async function startLegacyLoraPredictions({
  replicate,
  prompts,
  webhookUrl,
}: StartLegacyLoraPredictionsInput): Promise<string[]> {
  const versionId = await getLatestLegacyLoraVersionId(replicate);
  const predictionIds: string[] = [];

  console.log(`Starting ${prompts.length} legacy LoRA generation jobs...`);

  for (let i = 0; i < prompts.length; i++) {
    const predictionBase = {
      input: {
        prompt: prompts[i],
        negative_prompt: LEGACY_LORA_NEGATIVE_PROMPT,
        num_outputs: 1,
        aspect_ratio: "3:4",
        output_format: "jpg",
        guidance: 3.5,
        num_inference_steps: 30,
        output_quality: 100,
        lora_scale: 1.15,
      },
      webhook: webhookUrl,
      webhook_events_filter: completedEvents,
    };

    const predictionPayload: Parameters<typeof replicate.predictions.create>[0] = versionId
      ? { ...predictionBase, version: versionId }
      : { ...predictionBase, model: LEGACY_LORA_MODEL_ID };

    const prediction = await replicate.predictions.create(predictionPayload);
    predictionIds.push(prediction.id);

    if (i < prompts.length - 1) {
      console.log("Waiting 10s to avoid rate limits before next legacy LoRA prediction...");
      await delay(10000);
    }
  }

  return predictionIds;
}
