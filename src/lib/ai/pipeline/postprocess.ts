export const FINAL_PORTRAIT_WIDTH = 1024;
export const FINAL_PORTRAIT_HEIGHT = 1365;
export const FINAL_PORTRAIT_ASPECT_RATIO = "3:4";

export interface PortraitPostProcessPlan {
  aspectRatio: typeof FINAL_PORTRAIT_ASPECT_RATIO;
  width: typeof FINAL_PORTRAIT_WIDTH;
  height: typeof FINAL_PORTRAIT_HEIGHT;
  fit: "cover";
  position: "attention";
  outputFormat: "jpg";
  quality: number;
}

export function createPortraitPostProcessPlan(): PortraitPostProcessPlan {
  return {
    aspectRatio: FINAL_PORTRAIT_ASPECT_RATIO,
    width: FINAL_PORTRAIT_WIDTH,
    height: FINAL_PORTRAIT_HEIGHT,
    fit: "cover",
    position: "attention",
    outputFormat: "jpg",
    quality: 95,
  };
}

export function shouldPostProcessToPortrait(input: {
  width?: number | null;
  height?: number | null;
}): boolean {
  if (!input.width || !input.height) {
    return true;
  }

  return input.width * FINAL_PORTRAIT_HEIGHT !== input.height * FINAL_PORTRAIT_WIDTH;
}

export async function createPortraitJpegBuffer(input: {
  image: Buffer | ArrayBuffer | Uint8Array;
  plan?: PortraitPostProcessPlan;
}): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const plan = input.plan ?? createPortraitPostProcessPlan();

  return sharp(input.image)
    .resize({
      width: plan.width,
      height: plan.height,
      fit: plan.fit,
      position: plan.position,
    })
    .jpeg({ quality: plan.quality })
    .toBuffer();
}
