export const GENERATION_COUNT_CONFIGURATION_ERROR = "GENERATION_COUNT_CONFIGURATION_ERROR";

export class GenerationCountConfigurationError extends Error {
  readonly code = GENERATION_COUNT_CONFIGURATION_ERROR;

  constructor(message: string) {
    super(message);
    this.name = "GenerationCountConfigurationError";
  }
}

export interface GenerationPlanItem {
  scenePackage: string | null;
}

export function getRequestedImageCount(value: number | null | undefined): number {
  if (!Number.isSafeInteger(value) || (value ?? 0) <= 0) {
    throw new GenerationCountConfigurationError("requested_images_count must be a positive integer.");
  }

  return value as number;
}

export function createGenerationPlan(
  requestedImagesCount: number | null | undefined,
  heroScenePackages: readonly string[] | null,
): GenerationPlanItem[] {
  const count = getRequestedImageCount(requestedImagesCount);

  if (heroScenePackages !== null) {
    if (heroScenePackages.length < count) {
      throw new GenerationCountConfigurationError(
        `Only ${heroScenePackages.length} Hero Compositions are available for ${count} requested images.`,
      );
    }

    return heroScenePackages.slice(0, count).map((scenePackage) => ({ scenePackage }));
  }

  return Array.from({ length: count }, () => ({ scenePackage: null }));
}

export function isExactInternalGenerationResultSet(
  photoshootId: string,
  resultImages: readonly string[],
  requestedImagesCount: number | null | undefined,
): boolean {
  const count = getRequestedImageCount(requestedImagesCount);
  const prefix = `photoshoots/generations/${photoshootId}/`;

  return resultImages.length === count
    && new Set(resultImages).size === count
    && resultImages.every((key) => key.startsWith(prefix));
}
