import type { AiPipelineVersion } from "@/lib/ai/pipeline/types";
import {
  DEFAULT_AI_GENERATION_MODEL,
  resolveAiGenerationModel,
  type AiGenerationModel,
} from "@/lib/ai/image-generation-provider";

type EnvName =
  | "NEXT_PUBLIC_SITE_URL"
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "REPLICATE_API_TOKEN"
  | "WEBHOOK_SECRET"
  | "S3_ENDPOINT"
  | "S3_REGION"
  | "S3_BUCKET_NAME"
  | "S3_ACCESS_KEY"
  | "S3_SECRET_KEY"
  | "NEXT_PUBLIC_YANDEX_METRIKA_ID"
  | "AI_PIPELINE_MODE"
  | "AI_GENERATION_MODEL"
  | "OPENAI_API_KEY"
  | "DATABASE_URL";

export const DEFAULT_AI_PIPELINE_MODE: AiPipelineVersion = "legacy-lora-v1";

function cleanEnvValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getEnv(name: EnvName): string {
  const value = cleanEnvValue(process.env[name]);

  if (!value) {
    throw new Error(`[env] Missing required environment variable: ${name}`);
  }

  return value;
}

export function getOptionalEnv(name: EnvName, fallback?: string): string | undefined {
  return cleanEnvValue(process.env[name]) ?? fallback;
}

export function getReplicateApiToken(): string {
  return getEnv("REPLICATE_API_TOKEN");
}

export function getWebhookSecret(): string {
  return getEnv("WEBHOOK_SECRET");
}

export function getS3BucketName(): string {
  return getEnv("S3_BUCKET_NAME");
}

export function getSiteUrl(fallback = "https://photogenlab.ru"): string {
  return getOptionalEnv("NEXT_PUBLIC_SITE_URL", fallback) as string;
}

export function getAiPipelineMode(): AiPipelineVersion {
  const value = getOptionalEnv("AI_PIPELINE_MODE", DEFAULT_AI_PIPELINE_MODE);

  if (value === "legacy-lora-v1" || value === "hybrid-v1") {
    return value;
  }

  console.warn(
    `[env] Unsupported AI_PIPELINE_MODE "${value}". Falling back to ${DEFAULT_AI_PIPELINE_MODE}.`,
  );

  return DEFAULT_AI_PIPELINE_MODE;
}

export function getAiGenerationModel(): AiGenerationModel {
  return resolveAiGenerationModel(
    getOptionalEnv("AI_GENERATION_MODEL", DEFAULT_AI_GENERATION_MODEL),
  );
}

export function getSupabaseServiceRoleConfig(): { url: string; serviceRoleKey: string } {
  return {
    url: getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export function getSupabasePublicConfig(): { url: string; anonKey: string } {
  return {
    url: getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}
