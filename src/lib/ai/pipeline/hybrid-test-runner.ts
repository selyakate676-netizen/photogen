import Replicate from "replicate";
import {
  createFaceSwapIntegrationPlan,
  createFluxLoraIdentityInput,
  createLoraIdentityReference,
  startFluxLoraIdentityPrediction,
  startFaceSwapPrediction,
} from "@/lib/ai/pipeline/hybrid";
import type { Photoshoot } from "@/types/database";

interface StartHybridIdentitySmokeTestInput {
  replicate: Replicate;
  loraUrl: string;
  gender: Photoshoot["gender"];
}

interface RunHybridFaceSwapSmokeTestInput {
  replicate: Replicate;
  loraUrl: string;
  identityImageUrl: string;
  compositionImageUrl: string;
}

export interface HybridIdentitySmokeTestResult {
  identityInput: ReturnType<typeof createFluxLoraIdentityInput>;
  identityPredictionId: string;
}

export interface HybridFaceSwapSmokeTestResult {
  faceSwapPredictionId: string;
}

export interface ReplicatePredictionOutput {
  id: string;
  status: string;
  outputUrl: string | null;
  error: string | null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFirstOutputUrl(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output) && typeof output[0] === "string") return output[0];
  return null;
}

export async function waitForReplicatePrediction(input: {
  replicate: Replicate;
  predictionId: string;
  intervalMs?: number;
  maxAttempts?: number;
}): Promise<ReplicatePredictionOutput> {
  const intervalMs = input.intervalMs ?? 5000;
  const maxAttempts = input.maxAttempts ?? 60;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const prediction = await input.replicate.predictions.get(input.predictionId);

    if (prediction.status === "succeeded" || prediction.status === "failed" || prediction.status === "canceled") {
      return {
        id: prediction.id,
        status: prediction.status,
        outputUrl: getFirstOutputUrl(prediction.output),
        error: prediction.error ? String(prediction.error) : null,
      };
    }

    await delay(intervalMs);
  }

  return {
    id: input.predictionId,
    status: "timeout",
    outputUrl: null,
    error: "Prediction polling timed out",
  };
}

export async function startHybridIdentitySmokeTest({
  replicate,
  loraUrl,
  gender,
}: StartHybridIdentitySmokeTestInput): Promise<HybridIdentitySmokeTestResult> {
  const identityInput = createFluxLoraIdentityInput({ loraUrl, gender });
  const identityPredictionId = await startFluxLoraIdentityPrediction({
    replicate,
    loraUrl,
    gender,
  });

  return {
    identityInput,
    identityPredictionId,
  };
}

export async function runHybridFaceSwapSmokeTest({
  replicate,
  loraUrl,
  identityImageUrl,
  compositionImageUrl,
}: RunHybridFaceSwapSmokeTestInput): Promise<HybridFaceSwapSmokeTestResult> {
  const identityReference = createLoraIdentityReference({
    imageUrl: identityImageUrl,
    loraUrl,
  });
  const faceSwapPlan = createFaceSwapIntegrationPlan({
    compositionImageUrl,
    identityReference,
  });
  const faceSwapPredictionId = await startFaceSwapPrediction({
    replicate,
    plan: faceSwapPlan,
  });

  return {
    faceSwapPredictionId,
  };
}
