import { S3Client } from "@aws-sdk/client-s3";
import { getOptionalEnv } from "@/lib/env";

const s3AccessKey = getOptionalEnv("S3_ACCESS_KEY", "") ?? "";
const s3SecretKey = getOptionalEnv("S3_SECRET_KEY", "") ?? "";

if (!s3AccessKey || !s3SecretKey) {
  // Мы не выбрасываем ошибку сразу, чтобы сайт не падал при сборке, 
  // но в консоли предупредим.
  console.warn("Внимание: S3 ключи не найдены в переменных окружения");
}

export const s3Client = new S3Client({
  region: getOptionalEnv("S3_REGION", "ru-1") ?? "ru-1",
  endpoint: getOptionalEnv("S3_ENDPOINT", "https://s3.ru1.storage.beget.cloud") ?? "https://s3.ru1.storage.beget.cloud",
  credentials: {
    accessKeyId: s3AccessKey,
    secretAccessKey: s3SecretKey,
  },
  forcePathStyle: true, // Важно для Beget и большинства S3-провайдеров
});
