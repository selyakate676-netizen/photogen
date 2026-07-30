import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getS3BucketName } from "@/lib/env";
import { s3Client } from "@/lib/s3";
import {
  createPortraitJpegBuffer,
  createPortraitPostProcessPlan,
  type PortraitPostProcessPlan,
} from "@/lib/ai/pipeline/postprocess";

export interface SavePortraitImageToS3Input {
  imageUrl: string;
  s3Key: string;
  postProcessPlan?: PortraitPostProcessPlan;
}

export async function downloadImageBuffer(imageUrl: string): Promise<Buffer> {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function savePortraitImageUrlToS3({
  imageUrl,
  s3Key,
  postProcessPlan = createPortraitPostProcessPlan(),
}: SavePortraitImageToS3Input): Promise<string> {
  const image = await downloadImageBuffer(imageUrl);
  const body = await createPortraitJpegBuffer({
    image,
    plan: postProcessPlan,
  });

  await s3Client.send(
    new PutObjectCommand({
      Bucket: getS3BucketName(),
      Key: s3Key,
      Body: body,
      ContentType: "image/jpeg",
    }),
  );

  return s3Key;
}
