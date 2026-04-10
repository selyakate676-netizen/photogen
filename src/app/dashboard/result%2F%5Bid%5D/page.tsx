import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "@/lib/s3";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import styles from "./result.module.css";

export default async function ResultPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const { data: photoshoot, error } = await supabase
    .from("photoshoots")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !photoshoot) {
    return redirect("/dashboard");
  }

  // Если еще не готово, возвращаем на дашборд
  if (photoshoot.status !== "completed") {
    return redirect("/dashboard");
  }

  const resultKeys = photoshoot.result_images || [];
  
  // Генерируем временные ссылки для каждого изображения (на 24 часа)
  const imageUrls = await Promise.all(
    resultKeys.map(async (key: string) => {
      try {
        const command = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: key,
        });
        return await getSignedUrl(s3Client, command, { expiresIn: 86400 });
      } catch (err) {
        console.error("Error signing result image:", err);
        return null;
      }
    })
  );

  const validUrls = imageUrls.filter((url): url is string => url !== null);

  return (
    <>
      <Navbar />
      <main className={styles.wrapper}>
        <div className={styles.container}>
          <header className={styles.header}>
            <Link href="/dashboard" className={styles.backLink}>← Вернуться в кабинет</Link>
            <h1 className={styles.title}>Ваша фотосессия готова ✨</h1>
            <p className={styles.subtitle}>
              Стиль: <strong>{photoshoot.style_id}</strong> • Сгенерировано: {validUrls.length} фото
            </p>
          </header>

          <div className={styles.gallery}>
            {validUrls.map((url, idx) => (
              <div key={idx} className={styles.imageCard}>
                <Image 
                  src={url} 
                  alt={`Result ${idx + 1}`} 
                  width={600} 
                  height={800} 
                  className={styles.image}
                  priority={idx < 2}
                />
                <a href={url} download={`result_${idx + 1}.jpg`} className={styles.downloadBtn}>
                  Скачать оригинал
                </a>
              </div>
            ))}
          </div>

          <div className={styles.nextSteps}>
            <h3>Понравился результат?</h3>
            <p>Вы можете создать новую фотосессию в другом стиле!</p>
            <Link href="/dashboard/new" className="btn btn-primary btn-lg">
              Создать новую фотосессию
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
