'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import StylesGrid from './StylesGrid';
import PhotoUpload from './PhotoUpload';
import styles from './NewPhotoshoot.module.css';
import { createPhotoshoot } from './actions';

export default function NewPhotoshootPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedKeys, setUploadedKeys] = useState<string[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleStart = async () => {
    if (uploadedKeys.length < 10) {
      alert('Подождите, пока загрузится минимум 10 фото');
      return;
    }
    if (!selectedStyle) {
      alert('Выберите стиль');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createPhotoshoot({
        styleId: selectedStyle,
        imageKeys: uploadedKeys
      });

      if (result.error) throw new Error(result.error);

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.header}>
            <Link href="/dashboard" className={styles.backLink}>← Назад в кабинет</Link>
            <h1 className={styles.title}>Создание фотосессии</h1>
          </div>

          <div className={styles.wizard}>
            {/* Шаг 1: Загрузка */}
            <section className={styles.step}>
              <div className={styles.stepHeader}>
                <span className={styles.stepNumber}>Шаг 1 из 2</span>
                <h2>Загрузите ваши фотографии</h2>
                <p>Для лучшего результата нам нужно 10–20 ваших селфи</p>
              </div>

              <PhotoUpload 
                files={files} 
                setFiles={setFiles} 
                onUploadComplete={(keys) => setUploadedKeys(prev => [...prev, ...keys])}
              />
            </section>

            {/* Шаг 2: Выбор стиля */}
            <StylesGrid 
                selected={selectedStyle}
                onSelect={setSelectedStyle}
            />

            <div className={styles.finalAction}>
                <p className={styles.disclaimer}>
                    Нажимая кнопку «Начать», вы подтверждаете согласие с правилами сервиса
                </p>
                <button 
                    className={`btn btn-primary btn-lg ${styles.submitBtn}`}
                    onClick={handleStart}
                    disabled={files.length < 10 || !selectedStyle || isSubmitting}
                >
                    {isSubmitting ? 'Создание...' : 'Начать фотосессию'}
                </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
