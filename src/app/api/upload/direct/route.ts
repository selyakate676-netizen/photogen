import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import { getS3BucketName } from "@/lib/env";
import { s3Client } from "@/lib/s3";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Auth required" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const key = `photoshoots/${user.id}/${Date.now()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await s3Client.send(
      new PutObjectCommand({
        Bucket: getS3BucketName(),
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      }),
    );

    return NextResponse.json({ key });
  } catch (error) {
    console.error("Direct upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}