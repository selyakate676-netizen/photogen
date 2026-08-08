'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Footer from '@/components/Footer';
import { getPhotoPack, type PhotoPack } from '@/lib/photoPacks';
import { trackAnalyticsGoal } from '@/lib/analytics';
import StylesGrid from './StylesGrid';
import styles from './NewPhotoshoot.module.css';
import { createPhotoshoot } from './actions';

type PersonaPhoto = {
  id: string;
  personaId: string;
  url: string;
  createdAt: string;
};

type PersonaOption = {
  id: string;
  name: string;
  isDefault: boolean;
  status: 'draft' | 'active';
  photos: PersonaPhoto[];
};

const MAX_OTHER_THUMBNAILS = 3;

export default function NewPhotoshootPage() {
  const [personas, setPersonas] = useState<PersonaOption[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(true);
  const [personaError, setPersonaError] = useState('');
  const [styleError, setStyleError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const requestedStyleId = searchParams.get('style');
    const requestedPersonaId = searchParams.get('personaId');
    const requestedPack = requestedStyleId ? getPhotoPack(requestedStyleId) : undefined;

    if (requestedPack) setSelectedStyle(requestedPack.id);
    else if (requestedStyleId) setStyleError('Фотопак не найден. Выберите доступный вариант.');

    const controller = new AbortController();
    const loadPersonas = async () => {
      try {
        const response = await fetch('/api/personas', { cache: 'no-store', signal: controller.signal });
        const payload = await response.json() as { personas?: Omit<PersonaOption, 'photos'>[] };
        if (!response.ok) throw new Error('PERSONAS_LOAD_FAILED');

        const activePersonas = (payload.personas ?? []).filter((persona) => persona.status === 'active');
        const withPhotos = await Promise.all(activePersonas.map(async (persona) => {
          const photoResponse = await fetch(`/api/personas/${persona.id}/photos`, {
            cache: 'no-store',
            signal: controller.signal,
          });
          if (!photoResponse.ok) throw new Error('PERSONA_PHOTOS_LOAD_FAILED');
          const photoPayload = await photoResponse.json() as { photos?: PersonaPhoto[] };
          return { ...persona, photos: photoPayload.photos ?? [] };
        }));

        const readyPersonas = withPhotos.filter((persona) => persona.photos.length > 0);
        setPersonas(readyPersonas);
        const initialPersona = readyPersonas.find((persona) => persona.id === requestedPersonaId)
          ?? readyPersonas.find((persona) => persona.isDefault)
          ?? readyPersonas[0];

        if (initialPersona) setSelectedPersonaId(initialPersona.id);
        else setPersonaError('Нет активной Persona с фотографиями. Добавьте фотографии в профиле.');
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setPersonaError('Не удалось загрузить Persona и её фотографии.');
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingPersonas(false);
      }
    };

    void loadPersonas();
    return () => controller.abort();
  }, []);

  const selectedPersona = personas.find((persona) => persona.id === selectedPersonaId);
  const selectedPack: PhotoPack | undefined = selectedStyle ? getPhotoPack(selectedStyle) : undefined;
  const canCreate = Boolean(
    selectedPersona
      && selectedPersona.status === 'active'
      && selectedPersona.photos.length > 0
      && selectedPack,
  );

  const handleStart = async () => {
    if (!selectedPersona || selectedPersona.status !== 'active' || selectedPersona.photos.length === 0) {
      setPersonaError('Выберите активную Persona с фотографиями.');
      return;
    }
    if (!selectedPack) {
      setStyleError('Выберите фотопак.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createPhotoshoot({
        personaId: selectedPersona.id,
        styleId: selectedPack.id,
      });
      if (result.error) throw new Error(result.error);
      if (!result.data?.id) throw new Error('Не удалось получить номер заказа.');
      trackAnalyticsGoal('photoshoot_created', {
        package_slug: selectedPack.slug,
        requested_images_count: selectedPack.photoCount,
        source_page: 'new_photoshoot',
      });
      router.push(`/dashboard/pay/${result.data.id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Не удалось создать фотосессию.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const otherPhotos = selectedPersona?.photos.slice(1) ?? [];
  const visibleOtherPhotos = otherPhotos.slice(0, MAX_OTHER_THUMBNAILS);
  const hiddenPhotoCount = Math.max(0, otherPhotos.length - visibleOtherPhotos.length);

  return (
    <>
      <main className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.header}>
            <Link href="/catalog" className={styles.backLink}>← Назад в каталог</Link>
            <h1 className={styles.title}>Подтверждение фотосессии</h1>
          </div>

          <div className={styles.wizard}>
            <section className={styles.confirmSection}>
              <div className={styles.stepHeader}>
                <span className={styles.stepNumber}>Кого фотографируем</span>
                <h2>{selectedPersona?.name ?? 'Выберите Persona'}</h2>
                <p>Эти фотографии будут использованы для генерации.</p>
              </div>

              {isLoadingPersonas ? <p className={styles.loadingText}>Загружаем Persona…</p> : null}
              {personaError ? (
                <div className={styles.emptyPersona}>
                  <p className={styles.hintWarning}>{personaError}</p>
                  <Link href="/account/profile" className="btn btn-secondary">Добавить фотографии</Link>
                </div>
              ) : null}

              {selectedPersona ? (
                <div className={styles.personaConfirmation}>
                  <div className={styles.primaryPersonaPhoto}>
                    <Image
                      src={selectedPersona.photos[0].url}
                      alt={`${selectedPersona.name}, основная фотография`}
                      fill
                      sizes="(max-width: 640px) 100vw, 280px"
                      unoptimized
                    />
                  </div>

                  <div className={styles.personaDetails}>
                    <div className={styles.qGroup}>
                      <label className={styles.qLabel} htmlFor="photoshoot-persona">Persona</label>
                      <select
                        id="photoshoot-persona"
                        value={selectedPersonaId}
                        onChange={(event) => {
                          setSelectedPersonaId(event.target.value);
                          setPersonaError('');
                        }}
                        className={styles.qSelect}
                        disabled={isLoadingPersonas || personas.length === 0}
                      >
                        {personas.map((persona) => (
                          <option key={persona.id} value={persona.id}>
                            {persona.name}{persona.isDefault ? ' — основная' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <strong className={styles.photoCount}>
                      {selectedPersona.photos.length} {selectedPersona.photos.length === 1 ? 'фотография' : 'фотографии'}
                    </strong>

                    {visibleOtherPhotos.length > 0 ? (
                      <div className={styles.personaThumbnails}>
                        {visibleOtherPhotos.map((photo, index) => (
                          <div key={photo.id} className={styles.personaThumbnail}>
                            <Image
                              src={photo.url}
                              alt={`${selectedPersona.name}, фотография ${index + 2}`}
                              fill
                              sizes="84px"
                              unoptimized
                            />
                            {hiddenPhotoCount > 0 && index === visibleOtherPhotos.length - 1 ? (
                              <span className={styles.morePhotos}>+{hiddenPhotoCount}</span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <Link href={`/account/profile#persona-${selectedPersona.id}`} className={styles.editPhotosLink}>
                      Изменить фотографии
                    </Link>
                  </div>
                </div>
              ) : null}
            </section>

            <section className={styles.packConfirmation}>
              <div className={styles.stepHeader}>
                <span className={styles.stepNumber}>Фотопак</span>
                <h2>{selectedPack?.title ?? 'Выберите фотопак'}</h2>
              </div>

              {selectedPack ? (
                <div className={styles.packSummary}>
                  <div className={styles.packImage}>
                    <Image src={selectedPack.image} alt={selectedPack.title} fill sizes="160px" />
                  </div>
                  <div>
                    <p>{selectedPack.description}</p>
                    <strong>{selectedPack.photoCount} готовых фото · {selectedPack.priceRub} ₽</strong>
                    <Link href="/catalog" className={styles.editPhotosLink}>Изменить фотопак</Link>
                  </div>
                </div>
              ) : (
                <>
                  {styleError ? <p className={styles.hintWarning}>{styleError}</p> : null}
                  <StylesGrid selected={selectedStyle} onSelect={(styleId) => {
                    setSelectedStyle(styleId);
                    setStyleError('');
                  }} />
                </>
              )}
            </section>

            <div className={styles.finalAction}>
              <div className={styles.hintBox}>
                {canCreate ? (
                  <p className={styles.hintSuccess}>Всё готово для создания фотосессии.</p>
                ) : (
                  <p className={styles.hintWarning}>Выберите готовую Persona и фотопак.</p>
                )}
              </div>
              <button
                className={`btn btn-primary btn-lg ${styles.submitBtn}`}
                type="button"
                onClick={() => void handleStart()}
                disabled={!canCreate || isSubmitting}
              >
                {isSubmitting ? 'Создание…' : 'Начать фотосессию'}
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}