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
import { reachMetricaGoal } from '@/components/YandexMetrica';

export default function NewPhotoshootPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedKeys, setUploadedKeys] = useState<string[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  
  // Questionnaire states
  const [bodyType, setBodyType] = useState('average');
  const [eyeColor, setEyeColor] = useState('brown');
  const [hairColor, setHairColor] = useState('dark');
  
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

    reachMetricaGoal('CREATE_PHOTOSHOOT');
    setIsSubmitting(true);
    try {
      const result = await createPhotoshoot({
        styleId: selectedStyle,
        imageKeys: uploadedKeys,
        bodyType,
        eyeColor,
        hairColor
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
                <span className={styles.stepNumber}>Шаг 1 из 3</span>
                <h2>Загрузите ваши фотографии</h2>
                <p>Для лучшего результата нам нужно 10–20 ваших фото</p>
              </div>

              <PhotoUpload 
                files={files} 
                setFiles={setFiles} 
                onUploadComplete={(keys) => setUploadedKeys(prev => [...prev, ...keys])}
              />
            </section>

            {/* Шаг 2: Ваша внешность (Анкета) */}
            <section className={styles.step}>
              <div className={styles.stepHeader}>
                <span className={styles.stepNumber}>Шаг 2 из 3</span>
                <h2>Особенности вашей внешности</h2>
                <p>Нейросеть создаст портреты с максимальным сходством, опираясь на эти данные</p>
              </div>

              <div className={styles.questionnaireGrid}>
                 <div className={styles.qGroup}>
                    <label className={styles.qLabel}>Телосложение</label>
                    <select value={bodyType} onChange={e => setBodyType(e.target.value)} className={styles.qSelect}>
                       <option value="slim">Астеничная, тонкая</option>
                       <option value="average">Обычное, среднее</option>
                       <option value="athletic">Плотная, спортивная</option>
                       <option value="curvy">Женственная, аппетитная</option>
                    </select>
                 </div>

                 <div className={styles.qGroup}>
                    <label className={styles.qLabel}>Цвет глаз</label>
                    <select value={eyeColor} onChange={e => setEyeColor(e.target.value)} className={styles.qSelect}>
                       <option value="brown">Карие</option>
                       <option value="blue">Голубые</option>
                       <option value="green">Зеленые</option>
                       <option value="grey">Серые</option>
                    </select>
                 </div>

                 <div className={styles.qGroup}>
                    <label className={styles.qLabel}>Цвет волос</label>
                    <select value={hairColor} onChange={e => setHairColor(e.target.value)} className={styles.qSelect}>
                       <option value="dark">Брюнетка / Темный шатен</option>
                       <option value="blonde">Блонд</option>
                       <option value="brown">Светлый шатен / Русые</option>
                       <option value="red">Рыжие / Медные</option>
                    </select>
                 </div>
              </div>
            </section>

            {/* Шаг 3: Выбор стиля */}
            <div className={styles.stepHeader} style={{ marginTop: 'var(--space-2xl)' }}>
                <span className={styles.stepNumber}>Шаг 3 из 3</span>
            </div>
            <StylesGrid 
                selected={selectedStyle}
                onSelect={setSelectedStyle}
            />

            <div className={styles.finalAction}>
                <div className={styles.hintBox}>
                    {uploadedKeys.length < 10 ? (
                        <p className={styles.hintWarning}>
                            ⚠️ {files.length >= 10 ? `Загружаем файлы... (${uploadedKeys.length}/10)` : `Добавьте ещё ${10 - uploadedKeys.length} фото`}
                        </p>
                    ) : !selectedStyle ? (
                        <p className={styles.hintWarning}>✨ Теперь выберите стиль выше</p>
                    ) : (
                        <p className={styles.hintSuccess}>✅ Все готово для запуска!</p>
                    )}
                </div>
                <button 
                    className={`btn btn-primary btn-lg ${styles.submitBtn}`}
                    onClick={handleStart}
                    disabled={uploadedKeys.length < 10 || !selectedStyle || isSubmitting}
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
