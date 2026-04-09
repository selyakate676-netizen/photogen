import { S3Client } from "@aws-sdk/client-s3";

if (!process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY) {
  // Мы не выбрасываем ошибку сразу, чтобы сайт не падал при сборке, 
  // но в консоли предупредим.
  console.warn("Внимание: S3 ключи не найдены в .env.local");
}

export const s3Client = new S3Client({
  region: process.env.S3_REGION || "ru-1",
  endpoint: process.env.S3_ENDPOINT || "https://s3.ru1.storage.beget.cloud",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
  forcePathStyle: true, // Важно для Beget и большинства S3-провайдеров
});
