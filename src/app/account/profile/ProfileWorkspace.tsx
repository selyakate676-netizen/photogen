'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  Copy,
  Focus,
  Glasses,
  GripVertical,
  LogOut,
  Plus,
  Sun,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import type { BodyBuild, BustSize, FigureType, HeightProfile, Physique } from '@/lib/personas/appearance';
import { trackAnalyticsGoal } from '@/lib/analytics';
import styles from '../account.module.css';

type ProfileWorkspaceProps = {
  displayName: string;
  email: string;
  registeredAt: string;
  referralCode: string;
};

type Persona = {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  height: number | null;
  weight: number | null;
  gender: 'woman' | 'man' | null;
  eyeColor: string | null;
  heightProfile: HeightProfile | null;
  bodyBuild: BodyBuild | null;
  figureType: FigureType | null;
  bustSize: BustSize | null;
  physique: Physique | null;
  status: 'draft' | 'active';
  createdAt: string;
  updatedAt: string;
};

type PersonaPhoto = {
  id: string;
  personaId: string;
  url: string;
  sortOrder: number;
  createdAt: string;
};

type Questionnaire = {
  name: string;
  gender: string;
  height: string;
  weight: string;
  eyeColor: string;
};

type BustProfile = '' | BustSize;
type PhysiqueProfile = '' | Physique;

type AppearanceDraft = {
  height: HeightProfile;
  build: BodyBuild;
  figure: FigureType;
  bust: BustProfile;
  physique: PhysiqueProfile;
};

const MAX_PERSONA_PHOTOS = 5;

const legacyHeightProfile = (height: number | null): HeightProfile => {
  if (height !== null && height <= 162) return 'petite';
  if (height !== null && height >= 169) return 'tall';
  return 'average';
};

const createAppearanceDraft = (persona: Persona): AppearanceDraft => ({
  height: persona.heightProfile ?? legacyHeightProfile(persona.height),
  build: persona.bodyBuild ?? 'average',
  figure: persona.figureType ?? 'hourglass',
  bust: persona.bustSize ?? '',
  physique: persona.physique ?? '',
});

const createQuestionnaire = (persona: Persona): Questionnaire => ({
  name: persona.name,
  gender: persona.gender ?? '',
  height: persona.height === null ? '' : String(persona.height),
  weight: persona.weight === null ? '' : String(persona.weight),
  eyeColor: persona.eyeColor ?? '',
});

async function responseError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  if (payload?.error?.includes('ACTIVE_PERSONA_LAST_PHOTO')) {
    return 'Последнюю фотографию активной персоны нельзя удалить: существующий backend требует минимум одно фото.';
  }
  if (response.status === 401) return 'Войдите в аккаунт и повторите действие.';
  if (response.status === 404) return 'Персона не найдена. Обновите страницу.';
  if (response.status === 409) return payload?.error ?? 'Действие нарушает ограничения персоны.';
  return payload?.error ?? fallback;
}

export default function ProfileWorkspace({
  displayName,
  email,
  registeredAt,
  referralCode,
}: ProfileWorkspaceProps) {
  const router = useRouter();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [photos, setPhotos] = useState<Record<string, PersonaPhoto[]>>({});
  const [forms, setForms] = useState<Record<string, Questionnaire>>({});
  const [appearanceForms, setAppearanceForms] = useState<Record<string, AppearanceDraft>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [uploadPersonaId, setUploadPersonaId] = useState<string | null>(null);
  const [referralUrl, setReferralUrl] = useState(`/signup?ref=${referralCode}`);
  const [copied, setCopied] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<Record<string, PersonaPhoto[]>>({});
  const pointerDragRef = useRef<{ personaId: string; photoId: string; previous: PersonaPhoto[] } | null>(null);
  const nativeDragRef = useRef<{ personaId: string; photoId: string; previous: PersonaPhoto[] } | null>(null);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);

  const loadPersonas = useCallback(async (preferredPersonaId?: string, showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setLoadError('');

    try {
      const response = await fetch('/api/personas', { cache: 'no-store' });
      if (!response.ok) throw new Error(await responseError(response, 'Не удалось загрузить персоны.'));
      const payload = await response.json() as { personas?: Persona[] };
      const nextPersonas = payload.personas ?? [];

      const photoEntries = await Promise.all(nextPersonas.map(async (persona) => {
        const photoResponse = await fetch(`/api/personas/${persona.id}/photos`, { cache: 'no-store' });
        if (!photoResponse.ok) {
          throw new Error(await responseError(photoResponse, `Не удалось загрузить фотографии «${persona.name}».`));
        }
        const photoPayload = await photoResponse.json() as { photos?: PersonaPhoto[] };
        return [persona.id, photoPayload.photos ?? []] as const;
      }));

      setPersonas(nextPersonas);
      setPhotos(Object.fromEntries(photoEntries));
      setForms(Object.fromEntries(nextPersonas.map((persona) => [persona.id, createQuestionnaire(persona)])));
      setAppearanceForms(Object.fromEntries(
        nextPersonas.map((persona) => [persona.id, createAppearanceDraft(persona)]),
      ));
      setMessages({});

      if (preferredPersonaId) {
        window.setTimeout(() => {
          document.getElementById(`persona-${preferredPersonaId}`)?.scrollIntoView({ behavior: 'smooth' });
        }, 0);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Не удалось загрузить персоны.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    setReferralUrl(`${window.location.origin}/signup?ref=${referralCode}`);
    void loadPersonas();
  }, [loadPersonas, referralCode]);

  const setMessage = (personaId: string, message: string) => {
    setMessages((current) => ({ ...current, [personaId]: message }));
  };

  const updateForm = (personaId: string, field: keyof Questionnaire, value: string) => {
    setForms((current) => ({
      ...current,
      [personaId]: { ...current[personaId], [field]: value },
    }));
    setMessage(personaId, 'Есть несохранённые изменения');
  };

  const updateAppearance = <Field extends keyof AppearanceDraft>(
    personaId: string,
    field: Field,
    value: AppearanceDraft[Field],
  ) => {
    setAppearanceForms((current) => ({
      ...current,
      [personaId]: { ...current[personaId], [field]: value },
    }));


    setMessage(personaId, 'Есть несохранённые изменения');
  };

  const createPersona = async () => {
    const actionKey = 'create-persona';
    setPendingAction(actionKey);
    setLoadError('');
    try {
      const isFirstPersona = personas.length === 0;
      const response = await fetch(isFirstPersona ? '/api/personas/bootstrap' : '/api/personas', {
        method: 'POST',
        headers: isFirstPersona ? undefined : { 'Content-Type': 'application/json' },
        body: isFirstPersona ? undefined : JSON.stringify({ name: 'Новая персона' }),
      });
      if (!response.ok) throw new Error(await responseError(response, 'Не удалось создать персону.'));
      const payload = await response.json() as { persona: Persona };
      trackAnalyticsGoal('persona_created', { source_page: 'account_profile' });
      await loadPersonas(payload.persona.id, false);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Не удалось создать персону.');
    } finally {
      setPendingAction(null);
    }
  };

  const savePersona = async (event: FormEvent<HTMLFormElement>, persona: Persona) => {
    event.preventDefault();
    const form = forms[persona.id];
    const appearance = appearanceForms[persona.id] ?? createAppearanceDraft(persona);
    if (!form) return;
    const actionKey = `save-${persona.id}`;
    setPendingAction(actionKey);
    setMessage(persona.id, 'Сохраняем…');

    try {
      const response = await fetch(`/api/personas/${persona.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          gender: form.gender || null,
          eyeColor: form.eyeColor || null,
          heightProfile: appearance.height,
          bodyBuild: appearance.build,
          figureType: appearance.figure,
          bustSize: appearance.bust || null,
          physique: appearance.physique || null,
        }),
      });
      if (!response.ok) throw new Error(await responseError(response, 'Не удалось сохранить персону.'));
      await loadPersonas(persona.id, false);
      setMessage(persona.id, 'Изменения сохранены');
    } catch (error) {
      setMessage(persona.id, error instanceof Error ? error.message : 'Не удалось сохранить персону.');
    } finally {
      setPendingAction(null);
    }
  };

  const openFilePicker = (personaId: string) => {
    setUploadPersonaId(personaId);
    fileInputRef.current?.click();
  };

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';
    const personaId = uploadPersonaId;
    setUploadPersonaId(null);
    if (!personaId || selectedFiles.length === 0) return;

    const existingCount = photos[personaId]?.length ?? 0;
    const remaining = Math.max(0, MAX_PERSONA_PHOTOS - existingCount);
    if (remaining === 0) {
      setMessage(personaId, 'Для одной персоны можно сохранить не больше пяти фотографий.');
      return;
    }

    const validFiles: File[] = [];
    const validationErrors: string[] = [];
    for (const file of selectedFiles) {
      const isSupported = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
      const isValidSize = file.size >= 1 && file.size <= 15 * 1024 * 1024;
      if (isSupported && isValidSize) validFiles.push(file);
      else validationErrors.push(`${file.name}: нужен JPG, PNG или WebP до 15 МБ`);
    }

    const filesToUpload = validFiles.slice(0, remaining);
    const skippedByLimit = Math.max(0, validFiles.length - filesToUpload.length);
    if (filesToUpload.length === 0) {
      setMessage(personaId, validationErrors.join('; ') || 'Нет подходящих фотографий для загрузки.');
      return;
    }

    const actionKey = `photos-${personaId}`;
    setPendingAction(actionKey);
    setMessage(personaId, `Загружаем фотографии: 0 из ${filesToUpload.length}…`);
    const uploadErrors: string[] = [];
    let uploadedCount = 0;

    try {
      for (const file of filesToUpload) {
        try {
          const formData = new FormData();
          formData.set('file', file);
          const response = await fetch(`/api/personas/${personaId}/photos`, { method: 'POST', body: formData });
          if (!response.ok) throw new Error(await responseError(response, 'Не удалось загрузить фотографию.'));
          uploadedCount += 1;
          setMessage(personaId, `Загружаем фотографии: ${uploadedCount} из ${filesToUpload.length}…`);
        } catch (error) {
          const reason = error instanceof Error ? error.message : 'ошибка загрузки';
          uploadErrors.push(`${file.name}: ${reason}`);
        }
      }

      await loadPersonas(personaId, false);
      const summary = [`Загружено ${uploadedCount} из ${filesToUpload.length}.`];
      if (validationErrors.length) summary.push(`Не прошли проверку: ${validationErrors.join('; ')}.`);
      if (skippedByLimit) summary.push(`Не загружено из-за лимита 5: ${skippedByLimit}.`);
      if (uploadErrors.length) summary.push(`Ошибки: ${uploadErrors.join('; ')}.`);
      setMessage(personaId, summary.join(' '));
    } finally {
      setPendingAction(null);
    }
  };
  const persistPhotoOrder = async (personaId: string, nextPhotos: PersonaPhoto[], previousPhotos: PersonaPhoto[]) => {
    const actionKey = `photos-${personaId}`;
    setPendingAction(actionKey);
    setMessage(personaId, 'Сохраняем порядок…');
    try {
      const response = await fetch(`/api/personas/${personaId}/photos/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: nextPhotos.map((photo) => photo.id) }),
      });
      if (!response.ok) throw new Error(await responseError(response, 'Не удалось сохранить порядок фотографий.'));
      setMessage(personaId, 'Порядок фотографий сохранён');
    } catch (error) {
      setPhotos((current) => {
        const reverted = { ...current, [personaId]: previousPhotos };
        photosRef.current = reverted;
        return reverted;
      });
      setMessage(personaId, error instanceof Error ? error.message : 'Не удалось сохранить порядок фотографий.');
    } finally {
      setPendingAction(null);
      setDraggedPhotoId(null);
    }
  };

  const movePhotoInMemory = (personaId: string, photoId: string, targetId: string) => {
    let nextPersonaPhotos = photosRef.current[personaId] ?? [];
    const fromIndex = nextPersonaPhotos.findIndex((photo) => photo.id === photoId);
    const toIndex = nextPersonaPhotos.findIndex((photo) => photo.id === targetId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return nextPersonaPhotos;
    nextPersonaPhotos = [...nextPersonaPhotos];
    const [moved] = nextPersonaPhotos.splice(fromIndex, 1);
    nextPersonaPhotos.splice(toIndex, 0, moved);
    setPhotos((current) => {
      const next = { ...current, [personaId]: nextPersonaPhotos };
      photosRef.current = next;
      return next;
    });
    return nextPersonaPhotos;
  };

  const movePhotoByOffset = (personaId: string, photoId: string, offset: number) => {
    const previous = photosRef.current[personaId] ?? [];
    const index = previous.findIndex((photo) => photo.id === photoId);
    const target = previous[index + offset];
    if (index < 0 || !target) return;
    const next = movePhotoInMemory(personaId, photoId, target.id);
    void persistPhotoOrder(personaId, next, previous);
  };

  const beginPointerDrag = (event: ReactPointerEvent<HTMLButtonElement>, personaId: string, photoId: string) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerDragRef.current = { personaId, photoId, previous: [...(photosRef.current[personaId] ?? [])] };
    setDraggedPhotoId(photoId);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const continuePointerDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = pointerDragRef.current;
    if (!drag) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-photo-id]');
    if (target?.dataset.personaId === drag.personaId && target.dataset.photoId) {
      movePhotoInMemory(drag.personaId, drag.photoId, target.dataset.photoId);
    }
  };

  const finishPointerDrag = () => {
    const drag = pointerDragRef.current;
    pointerDragRef.current = null;
    if (!drag) return;
    const next = photosRef.current[drag.personaId] ?? [];
    const changed = next.some((photo, index) => photo.id !== drag.previous[index]?.id);
    if (changed) void persistPhotoOrder(drag.personaId, next, drag.previous);
    else setDraggedPhotoId(null);
  };

  const beginNativeDrag = (event: DragEvent<HTMLDivElement>, personaId: string, photoId: string) => {
    nativeDragRef.current = { personaId, photoId, previous: [...(photosRef.current[personaId] ?? [])] };
    setDraggedPhotoId(photoId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', photoId);
  };

  const finishNativeDrop = (event: DragEvent<HTMLDivElement>, personaId: string, targetId: string) => {
    event.preventDefault();
    const drag = nativeDragRef.current;
    nativeDragRef.current = null;
    if (!drag || drag.personaId !== personaId) return;
    const next = movePhotoInMemory(personaId, drag.photoId, targetId);
    void persistPhotoOrder(personaId, next, drag.previous);
  };

  const removePhoto = async (personaId: string, photoId: string) => {
    const actionKey = `photos-${personaId}`;
    setPendingAction(actionKey);
    try {
      const response = await fetch(`/api/personas/${personaId}/photos/${photoId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await responseError(response, 'Не удалось удалить фотографию.'));
      await loadPersonas(personaId, false);
      setMessage(personaId, 'Фотография удалена');
    } catch (error) {
      setMessage(personaId, error instanceof Error ? error.message : 'Не удалось удалить фотографию.');
    } finally {
      setPendingAction(null);
    }
  };

  const setDefaultPersona = async (personaId: string) => {
    const actionKey = `default-${personaId}`;
    setPendingAction(actionKey);
    try {
      const response = await fetch(`/api/personas/${personaId}/default`, { method: 'POST' });
      if (!response.ok) throw new Error(await responseError(response, 'Не удалось назначить основную персону.'));
      await loadPersonas(personaId, false);
      setMessage(personaId, 'Основная персона изменена');
    } catch (error) {
      setMessage(personaId, error instanceof Error ? error.message : 'Не удалось назначить основную персону.');
    } finally {
      setPendingAction(null);
    }
  };

  const openPhotoshoot = (persona: Persona) => {
    const personaPhotos = photos[persona.id] ?? [];
    if (persona.status !== 'active' || personaPhotos.length === 0) {
      setMessage(persona.id, 'Сначала добавьте фотографию, чтобы персона стала активной.');
      return;
    }
    router.push(`/dashboard/new?personaId=${encodeURIComponent(persona.id)}`);
  };

  const deletePersona = async (personaId: string) => {
    const actionKey = `delete-${personaId}`;
    setPendingAction(actionKey);
    try {
      const response = await fetch(`/api/personas/${personaId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await responseError(response, 'Не удалось удалить персону.'));
      setPendingDelete(null);
      await loadPersonas(undefined, false);
    } catch (error) {
      setPendingDelete(null);
      setMessage(personaId, error instanceof Error ? error.message : 'Не удалось удалить персону.');
    } finally {
      setPendingAction(null);
    }
  };

  const copyReferral = async () => {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className={styles.profileFlow}>
      <section className={styles.personasIntro}>
        <h1>Профиль</h1>
        <p>Сохраните фотографии и данные внешности один раз, чтобы использовать их во всех будущих фотосессиях.</p>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={handleFiles}
      />

      {isLoading ? (
        <section className={styles.profileSection}><p className={styles.panelDescription}>Загружаем персоны…</p></section>
      ) : loadError ? (
        <section className={styles.profileSection}>
          <p className={styles.localNotice}>{loadError}</p>
          <button type="button" className={styles.secondaryButton} onClick={() => void loadPersonas()}>Повторить</button>
        </section>
      ) : personas.length === 0 ? (
        <section className={styles.profileSection}>
          <h2>Персон пока нет</h2>
          <p className={styles.panelDescription}>Создайте первую персону «Я» и добавьте фотографию.</p>
          <button type="button" className={styles.primaryButton} disabled={pendingAction !== null} onClick={() => void createPersona()}>
            <Plus size={18} />Создать персону
          </button>
        </section>
      ) : personas.map((persona, index) => {
        const personaPhotos = photos[persona.id] ?? [];
        const form = forms[persona.id] ?? createQuestionnaire(persona);
        const appearance = appearanceForms[persona.id] ?? createAppearanceDraft(persona);
        const isReady = persona.status === 'active' && personaPhotos.length > 0;
        const photosBusy = pendingAction === `photos-${persona.id}`;

        return (
          <div key={persona.id} className={styles.personaFormGroup}>
            <section id={`persona-${persona.id}`} className={styles.personaFormBlock}>
              <header className={styles.personaFormHeader}>
                <div>
                  <span>Персона {index + 1} · {persona.status === 'active' ? 'активна' : 'черновик'}</span>
                  <h2>{form.name || persona.name}</h2>
                </div>
                <div className={styles.personaHeaderActions}>
                  {!persona.isDefault ? (
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      disabled={pendingAction !== null}
                      onClick={() => void setDefaultPersona(persona.id)}
                    >
                      Сделать основной
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={styles.personaRadio}
                    disabled={!isReady || pendingAction !== null}
                    onClick={() => openPhotoshoot(persona)}
                    title={isReady ? undefined : 'Добавьте фотографию, чтобы активировать персону'}
                  >
                    <span><Check size={16} />{persona.isDefault ? 'Основная · ' : ''}Использовать в фотосессиях</span>
                  </button>
                  {!persona.isDefault ? (
                    <button
                      type="button"
                      className={styles.deletePersonaButton}
                      disabled={pendingAction !== null}
                      onClick={() => setPendingDelete(persona.id)}
                    >
                      <Trash2 size={16} />Удалить
                    </button>
                  ) : null}
                </div>
              </header>

              <div className={styles.personaFormColumns}>
                <div className={styles.personaPhotosColumn}>
                  <div className={styles.personaColumnHeading}>
                    <div>
                      <h3>Фотографии</h3>
                      <p>Загрузите до 5 лучших селфи. Первое фото используется как основной референс внешности.</p>
                    </div>
                    <span>{personaPhotos.length} из {MAX_PERSONA_PHOTOS}</span>
                  </div>

                  <div className={styles.compactPhotoGuides}>
                    <div className={styles.guideCardGood}>
                      <div className={styles.goodExampleStrip} aria-label="Примеры подходящих фотографий">
                        <div className={styles.frontPortraitExample}><Image src="/before-1.png" alt="Фронтальный портрет" fill sizes="72px" /><span><UserRound size={13} />Фронтально</span></div>
                        <div><Image src="/selfie-3.png" alt="Фото с хорошим светом" fill sizes="72px" /><span><Sun size={13} />Свет</span></div>
                        <div><Image src="/before-main.png" alt="Резкое фото" fill sizes="72px" /><span><Focus size={13} />Резко</span></div>
                      </div>
                      <h4><Check size={15} />Подходят</h4>
                      <ul><li>лицо хорошо видно</li><li>фронтально</li><li>хороший свет</li><li>без сильных теней</li></ul>
                    </div>
                    <div className={styles.guideCardBad}>
                      <div className={styles.badExampleStrip} aria-label="Примеры неподходящих фотографий">
                        <div><Image src="/before-1.png" alt="Фото в очках" fill sizes="72px" /><span><Glasses size={13} />Очки</span></div>
                        <div className={styles.blurredExample}><Image src="/before-2.png" alt="Размытое фото" fill sizes="72px" /><span><Focus size={13} />Размыто</span></div>
                        <div className={styles.distantExample}><Image src="/studio-stool-woman.png" alt="Слишком дальний план" fill sizes="72px" /><span><Sun size={13} />Далеко</span></div>
                      </div>
                      <h4><X size={15} />Не подходят</h4>
                      <ul><li>солнечные очки</li><li>размыто</li><li>сильный контровой свет</li><li>слишком дальний план</li></ul>
                    </div>
                  </div>

                  {personaPhotos.length > 0 ? (
                    <p className={styles.photoPriorityHint}>Первое фото — основное. Перетащите фотографии или используйте стрелки, чтобы изменить приоритет.</p>
                  ) : null}
                  <div className={styles.compactPhotos}>
                    {personaPhotos.map((photo, photoIndex) => (
                      <div
                        key={photo.id}
                        className={[styles.compactPhoto, draggedPhotoId === photo.id ? styles.compactPhotoDragging : ''].filter(Boolean).join(' ')}
                        data-persona-id={persona.id}
                        data-photo-id={photo.id}
                        draggable={!photosBusy}
                        onDragStart={(event) => beginNativeDrag(event, persona.id, photo.id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => finishNativeDrop(event, persona.id, photo.id)}
                        onDragEnd={() => { nativeDragRef.current = null; setDraggedPhotoId(null); }}
                      >
                        <div className={styles.compactPhotoImage} title="Фотография хранится приватно">
                          <Image
                            src={photo.url}
                            alt={`${persona.name}, фотография ${photoIndex + 1}`}
                            fill
                            sizes="(max-width: 700px) 28vw, 120px"
                            unoptimized
                          />
                          {photoIndex === 0 ? <span className={styles.primaryPhotoBadge}>Основное фото</span> : null}
                          <button
                            type="button"
                            className={styles.photoDragHandle}
                            aria-label={`Перетащить фотографию ${photoIndex + 1}`}
                            disabled={photosBusy}
                            onPointerDown={(event) => beginPointerDrag(event, persona.id, photo.id)}
                            onPointerMove={continuePointerDrag}
                            onPointerUp={finishPointerDrag}
                            onPointerCancel={finishPointerDrag}
                          ><GripVertical size={17} /></button>
                        </div>
                        <div className={styles.compactPhotoActions}>
                          <button type="button" aria-label="Переместить фотографию влево" disabled={photosBusy || photoIndex === 0} onClick={() => movePhotoByOffset(persona.id, photo.id, -1)}><ArrowLeft size={14} /></button>
                          <button type="button" aria-label="Переместить фотографию вправо" disabled={photosBusy || photoIndex === personaPhotos.length - 1} onClick={() => movePhotoByOffset(persona.id, photo.id, 1)}><ArrowRight size={14} /></button>
                          <button type="button" aria-label="Удалить фотографию" disabled={photosBusy} onClick={() => void removePhoto(persona.id, photo.id)}><Trash2 size={15} /></button>
                        </div>
                      </div>
                    ))}
                    {personaPhotos.length < MAX_PERSONA_PHOTOS ? (
                      <button type="button" className={styles.addPhotoTile} disabled={photosBusy} onClick={() => openFilePicker(persona.id)}>
                        <Camera size={22} /><span>{photosBusy ? 'Загрузка…' : 'Добавить фото'}</span>
                      </button>
                    ) : null}
                  </div>
                  {messages[persona.id] ? <p className={styles.localNotice}>{messages[persona.id]}</p> : null}
                </div>

                <form className={styles.personaQuestionnaire} onSubmit={(event) => void savePersona(event, persona)}>
                  <div className={styles.personaColumnHeading}>
                    <div>
                      <h3>Параметры внешности</h3>
                      <p>Эти параметры помогают сохранить естественные пропорции тела на сгенерированных фотографиях.</p>
                    </div>
                  </div>

                  <div className={[styles.personaFields, styles.identityFields].join(' ')}>
                    <label>Имя
                      <input required maxLength={80} value={form.name} onChange={(event) => updateForm(persona.id, 'name', event.target.value)} />
                    </label>
                    <label>Пол
                      <select value={form.gender} onChange={(event) => updateForm(persona.id, 'gender', event.target.value)}>
                        <option value="">Не указан</option><option value="woman">Женский</option><option value="man">Мужской</option>
                      </select>
                    </label>
                    <label>Цвет глаз
                      <select value={form.eyeColor} onChange={(event) => updateForm(persona.id, 'eyeColor', event.target.value)}>
                        <option value="">Не указан</option><option value="brown">Карие</option><option value="blue">Голубые</option><option value="green">Зелёные</option><option value="gray">Серые</option>
                      </select>
                    </label>
                  </div>

                  <fieldset className={styles.appearanceFieldset}>
                    <legend>Рост</legend>
                    <div className={styles.appearanceThreeGrid}>
                      {([
                        { value: 'petite' as HeightProfile, label: 'Миниатюрная', detail: 'до 162 см', scale: 0.82, icon: '/body-profile/height-petite-icon.png' },
                        { value: 'average' as HeightProfile, label: 'Средний рост', detail: '163–168 см', scale: 0.91, icon: '/body-profile/height-average-icon.png' },
                        { value: 'tall' as HeightProfile, label: 'Высокая', detail: '169+ см', scale: 1, icon: '/body-profile/height-tall-icon.png' },
                      ]).map((option) => (
                        <label key={option.value} className={styles.appearanceChoice}>
                          <input
                            type="radio"
                            name={'height-' + persona.id}
                            checked={appearance.height === option.value}
                            onChange={() => updateAppearance(persona.id, 'height', option.value)}
                          />
                          <span className={[styles.appearanceCard, styles.profileCard].join(' ')}>
                            <span className={[styles.silhouetteIcon, styles.profileImage].join(' ')}>
                              <Image src={option.icon} alt="" fill sizes="64px" unoptimized style={{ transform: `scale(${option.scale})`, transformOrigin: 'center bottom' }} />
                            </span>
                            <strong>{option.label}</strong>
                            <small>{option.detail}</small>
                            <Check className={styles.selectedCheck} size={14} />
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className={styles.appearanceFieldset}>
                    <legend>Комплекция</legend>
                    <div className={styles.appearanceThreeGrid}>
                      {([
                        { value: 'slim' as BodyBuild, label: 'Стройная', icon: '/body-profile/build-slim-icon.png' },
                        { value: 'average' as BodyBuild, label: 'Средняя', icon: '/body-profile/build-average-icon.png' },
                        { value: 'feminine' as BodyBuild, label: 'Женственные формы', icon: '/body-profile/build-feminine-icon.png' },
                      ]).map((option) => (
                        <label key={option.value} className={styles.appearanceChoice}>
                          <input
                            type="radio"
                            name={'build-' + persona.id}
                            checked={appearance.build === option.value}
                            onChange={() => updateAppearance(persona.id, 'build', option.value)}
                          />
                          <span className={[styles.appearanceCard, styles.profileCard].join(' ')}>
                            <span className={[styles.silhouetteIcon, styles.profileImage].join(' ')}>
                              <Image src={option.icon} alt="" fill sizes="64px" unoptimized />
                            </span>
                            <strong>{option.label}</strong>
                            <Check className={styles.selectedCheck} size={14} />
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className={styles.appearanceFieldset}>
                    <legend>Тип фигуры</legend>
                    <div className={styles.figureChoiceGrid}>
                      {([
                        { value: 'hourglass' as FigureType, label: 'Песочные часы', icon: '/body-profile/figure-hourglass-icon.png' },
                        { value: 'pear' as FigureType, label: 'Груша', icon: '/body-profile/figure-pear-icon.png' },
                        { value: 'rectangle' as FigureType, label: 'Прямоугольник', icon: '/body-profile/figure-rectangle-icon.png' },
                        { value: 'inverted' as FigureType, label: 'Перевёрнутый треугольник', icon: '/body-profile/figure-inverted-icon.png' },
                        { value: 'apple' as FigureType, label: 'Яблоко', icon: '/body-profile/figure-apple-icon.png' },
                      ]).map((option) => (
                        <label key={option.value} className={styles.appearanceChoice}>
                          <input
                            type="radio"
                            name={'figure-' + persona.id}
                            checked={appearance.figure === option.value}
                            onChange={() => updateAppearance(persona.id, 'figure', option.value)}
                          />
                          <span className={[styles.appearanceCard, styles.figureCard].join(' ')}>
                            <span className={[styles.silhouetteIcon, styles.figureImage].join(' ')}>
                              <Image src={option.icon} alt="" fill sizes="52px" unoptimized />
                            </span>
                            <strong>{option.label}</strong>
                            <Check className={styles.selectedCheck} size={14} />
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <details className={styles.optionalAppearance}>
                    <summary>
                      <span>Дополнительные параметры <small>(необязательно)</small></span>
                      <ChevronDown size={18} />
                    </summary>
                    <div className={styles.optionalAppearanceContent}>
                      <fieldset>
                        <legend>Размер груди</legend>
                        <div className={styles.segmentedOptions}>
                          {([
                            { value: 'small' as BustProfile, label: 'Небольшая' },
                            { value: 'medium' as BustProfile, label: 'Средняя' },
                            { value: 'large' as BustProfile, label: 'Большая' },
                          ]).map((option) => (
                            <label key={option.value}>
                              <input
                                type="radio"
                                name={'bust-' + persona.id}
                                checked={appearance.bust === option.value}
                                onChange={() => updateAppearance(persona.id, 'bust', option.value)}
                              />
                              <span>{option.label}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <fieldset>
                        <legend>Телосложение</legend>
                        <div className={styles.segmentedOptions}>
                          {([
                            { value: 'athletic' as PhysiqueProfile, label: 'Атлетичное' },
                            { value: 'regular' as PhysiqueProfile, label: 'Обычное' },
                            { value: 'soft' as PhysiqueProfile, label: 'Мягкое' },
                          ]).map((option) => (
                            <label key={option.value}>
                              <input
                                type="radio"
                                name={'physique-' + persona.id}
                                checked={appearance.physique === option.value}
                                onChange={() => updateAppearance(persona.id, 'physique', option.value)}
                              />
                              <span>{option.label}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                  </details>

                  <div className={styles.personaFormActions}>
                    <button type="submit" className={styles.primaryButton} disabled={pendingAction !== null}>
                      {pendingAction === 'save-' + persona.id ? 'Сохраняем…' : 'Сохранить'}
                    </button>
                  </div>
                </form>
              </div>

              <div className={styles.personaCatalogCta}>
                <div>
                  <strong>{isReady ? 'Профиль готов к созданию фотосессий.' : 'Добавьте хотя бы одну фотографию, чтобы перейти к выбору фотосессии.'}</strong>
                  {isReady ? <span>Выберите подходящий фотопак в каталоге.</span> : null}
                </div>
                {isReady ? (
                  <button type="button" className={styles.primaryButton} onClick={() => router.push('/catalog')}>Выбрать фотосессию</button>
                ) : null}
              </div>
            </section>

            <button type="button" className={styles.addPersonaButton} disabled={pendingAction !== null} onClick={() => void createPersona()}>
              <Plus size={18} />Добавить персону
            </button>
          </div>
        );
      })}

      <section className={`${styles.profileSection} ${styles.compactProfileSection}`}>
        <div className={styles.accountSectionHeader}>
          <h2>Аккаунт</h2>
          <form action="/auth/signout" method="post">
            <button type="submit" className={styles.secondaryButton}>
              <LogOut size={17} aria-hidden="true" />
              Выйти из аккаунта
            </button>
          </form>
        </div>
        <dl className={styles.fieldList}>
          <div className={styles.field}><dt>Имя</dt><dd>{displayName}</dd></div>
          <div className={styles.field}><dt>Email</dt><dd>{email}</dd></div>
          <div className={styles.field}><dt>Дата регистрации</dt><dd>{registeredAt}</dd></div>
        </dl>
      </section>

      <section className={styles.referralHighlight}>
        <div>
          <span className={styles.referralKicker}>Реферальная программа</span>
          <h2>Пригласите друга</h2>
          <p>Получите бонусные токены после первой генерации приглашённого пользователя.</p>
        </div>
        <div className={styles.referralControls}>
          <div className={styles.referralBox}>{referralUrl}</div>
          <button type="button" className={styles.primaryButton} onClick={copyReferral}>
            <Copy size={17} />{copied ? 'Скопировано' : 'Скопировать'}
          </button>
        </div>
      </section>

      <section className={`${styles.profileSection} ${styles.compactProfileSection}`}>
        <h2>Поддержка</h2>
        <p className={styles.panelDescription}>Каналы поддержки будут подключены отдельно.</p>
        <div className={styles.supportLinks}>
          <button type="button" className={styles.secondaryButton} disabled>Telegram</button>
          <button type="button" className={styles.secondaryButton} disabled>Email</button>
        </div>
      </section>

      <section className={`${styles.profileSection} ${styles.compactProfileSection} ${styles.privacySection}`}>
        <h2>Конфиденциальность</h2>
        <p className={styles.panelDescription}>Фотографии и параметры внешности используются только для создания выбранных фотосессий. Удаление аккаунта будет доступно отдельно.</p>
        <div className={styles.privacyActions}>
          <button type="button" className={styles.dangerButton} onClick={() => setDeleteAccountOpen(true)}>Удалить аккаунт</button>
        </div>
      </section>

      {pendingDelete ? (
        <div className={styles.modalBackdrop} onMouseDown={(event) => event.currentTarget === event.target && setPendingDelete(null)}>
          <section className={styles.modal} role="alertdialog" aria-modal="true" aria-labelledby="delete-persona-title">
            <h2 id="delete-persona-title">Удалить персону?</h2>
            <p>Персона, её записи фотографий и приватные файлы будут удалены. Основную персону удалить нельзя.</p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setPendingDelete(null)}>Отмена</button>
              <button type="button" className={styles.dangerButton} disabled={pendingAction !== null} onClick={() => void deletePersona(pendingDelete)}>Удалить</button>
            </div>
          </section>
        </div>
      ) : null}

      {deleteAccountOpen ? (
        <div className={styles.modalBackdrop} onMouseDown={(event) => event.currentTarget === event.target && setDeleteAccountOpen(false)}>
          <section className={styles.modal} role="alertdialog" aria-modal="true" aria-labelledby="delete-account-title">
            <h2 id="delete-account-title">Удалить аккаунт?</h2>
            <p>Backend-удаление аккаунта пока не подключено, поэтому аккаунт и данные не будут изменены.</p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setDeleteAccountOpen(false)}>Закрыть</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}