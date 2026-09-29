import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import { getS3BucketName } from "@/lib/env";
import { s3Client } from "@/lib/s3";
import { ImageUploadValidationError, validateImageUpload } from "@/lib/uploads/image";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const image = await validateImageUpload(file);
    const key = `photoshoots/${user.id}/${randomUUID()}.${image.extension}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: getS3BucketName(),
      Key: key,
      Body: image.body,
      ContentType: image.contentType,
      ACL: "private",
    }));

    return NextResponse.json({ key });
  } catch (error) {
    if (error instanceof ImageUploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Direct upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
