import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "@/lib/s3";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    // 1. Проверяем, что пользователь вошел в систему
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
    }

    // 2. Получаем данные о файле из запроса
    const { fileName, fileType } = await request.json();

    if (!fileName || !fileType) {
      return NextResponse.json({ error: "Некорректные данные файла" }, { status: 400 });
    }

    // 3. Формируем путь к файлу в облаке: photoshoots/ID_ПОЛЬЗОВАТЕЛЯ/ВРЕМЯ-ИМЯ
    const key = `photoshoots/${user.id}/${Date.now()}-${fileName}`;

    // 4. Генерируем временную ссылку (действует 15 минут)
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    return NextResponse.json({ uploadUrl, key });
  } catch (error) {
    console.error("Presigned URL error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
