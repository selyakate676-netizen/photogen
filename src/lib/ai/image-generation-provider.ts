export const GPT_IMAGE_MODEL_ID = "openai/gpt-image-2";
export const NANO_BANANA_2_MODEL_ID = "google/nano-banana-2";
export const DEFAULT_AI_GENERATION_MODEL = GPT_IMAGE_MODEL_ID;

export type AiGenerationModel =
  | typeof GPT_IMAGE_MODEL_ID
  | typeof NANO_BANANA_2_MODEL_ID;

export type ReplicateImageInput = Readonly<Record<string, unknown>>;

export const MAX_PROVIDER_IMAGE_BYTES = 25 * 1024 * 1024;

const ALLOWED_PROVIDER_IMAGE_TYPES = new Set(["image/jpeg"]);

export type ProviderOutputErrorCode =
  | "MALFORMED_PROVIDER_OUTPUT"
  | "INVALID_PROVIDER_OUTPUT_URI"
  | "PROVIDER_OUTPUT_DOWNLOAD_FAILED"
  | "INVALID_PROVIDER_OUTPUT_TYPE"
  | "PROVIDER_OUTPUT_TOO_LARGE"
  | "EMPTY_PROVIDER_OUTPUT";

export class ProviderOutputError extends Error {
  readonly code: ProviderOutputErrorCode;

  constructor(code: ProviderOutputErrorCode) {
    super(code);
    this.code = code;
    this.name = "ProviderOutputError";
  }
}

export function resolveAiGenerationModel(value: string | undefined): AiGenerationModel {
  const normalized = value?.trim() || DEFAULT_AI_GENERATION_MODEL;

  if (normalized === GPT_IMAGE_MODEL_ID || normalized === NANO_BANANA_2_MODEL_ID) {
    return normalized;
  }

  throw new Error(`[env] Unsupported AI_GENERATION_MODEL: ${normalized}`);
}

export function buildReplicateImageInput(
  model: AiGenerationModel,
  prompt: string,
  referenceUrls: readonly string[],
): ReplicateImageInput {
  if (model === NANO_BANANA_2_MODEL_ID) {
    return {
      prompt,
      image_input: [...referenceUrls],
      resolution: "1K",
      aspect_ratio: "2:3",
      output_format: "jpg",
    };
  }

  return {
    prompt,
    input_images: [...referenceUrls],
    aspect_ratio: "2:3",
    quality: "high",
    output_format: "jpeg",
    number_of_images: 1,
    output_compression: 95,
  };
}

function getRawOutputUrls(output: unknown): string[] {
  if (typeof output === "string") {
    return [output];
  }

  if (Array.isArray(output)) {
    return output.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "url" in item && typeof item.url === "string") {
        return item.url;
      }
      throw new ProviderOutputError("MALFORMED_PROVIDER_OUTPUT");
    });
  }

  if (output && typeof output === "object" && "url" in output && typeof output.url === "string") {
    return [output.url];
  }

  if (output === null || output === undefined) {
    return [];
  }

  throw new ProviderOutputError("MALFORMED_PROVIDER_OUTPUT");
}

export function assertReplicateOutputUrl(value: string): string {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new ProviderOutputError("INVALID_PROVIDER_OUTPUT_URI");
  }

  const hostname = parsed.hostname.toLowerCase();
  const isReplicateDelivery =
    hostname === "replicate.delivery" || hostname.endsWith(".replicate.delivery");

  if (parsed.protocol !== "https:" || !isReplicateDelivery || parsed.username || parsed.password) {
    throw new ProviderOutputError("INVALID_PROVIDER_OUTPUT_URI");
  }

  return parsed.toString();
}

export function normalizeReplicateOutputUrls(output: unknown): string[] {
  return getRawOutputUrls(output).map(assertReplicateOutputUrl);
}

export async function downloadReplicateImage(
  url: string,
  fetcher: (input: string) => Promise<Response> = fetch,
): Promise<{ buffer: Buffer; contentType: string }> {
  const safeUrl = assertReplicateOutputUrl(url);
  const response = await fetcher(safeUrl);

  if (!response.ok) {
    throw new ProviderOutputError("PROVIDER_OUTPUT_DOWNLOAD_FAILED");
  }

  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (!contentType || !ALLOWED_PROVIDER_IMAGE_TYPES.has(contentType)) {
    throw new ProviderOutputError("INVALID_PROVIDER_OUTPUT_TYPE");
  }

  const declaredSize = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_PROVIDER_IMAGE_BYTES) {
    throw new ProviderOutputError("PROVIDER_OUTPUT_TOO_LARGE");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) {
    throw new ProviderOutputError("EMPTY_PROVIDER_OUTPUT");
  }
  if (buffer.length > MAX_PROVIDER_IMAGE_BYTES) {
    throw new ProviderOutputError("PROVIDER_OUTPUT_TOO_LARGE");
  }

  return { buffer, contentType };
}
