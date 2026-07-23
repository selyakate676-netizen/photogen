'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import Image from 'next/image';
import {
  Camera,
  Check,
  Copy,
  Focus,
  Glasses,
  PersonStanding,
  Plus,
  Sun,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { accountPersonas, type AccountPersona } from '@/lib/accountMockData';
import styles from '../account.module.css';

type ProfileWorkspaceProps = {
  displayName: string;
  email: string;
  registeredAt: string;
  referralCode: string;
};

type Questionnaire = AccountPersona['profile'] & { name: string };
type UploadTarget = { personaId: string; index: number | null };

const createQuestionnaire = (persona: AccountPersona): Questionnaire => ({
  name: persona.name,
  ...persona.profile,
});

export default function ProfileWorkspace({
  displayName,
  email,
  registeredAt,
  referralCode,
}: ProfileWorkspaceProps) {
  const [personas, setPersonas] = useState<AccountPersona[]>(accountPersonas);
  const [selectedPersonaId, setSelectedPersonaId] = useState(accountPersonas[0]?.id ?? '');
  const [photos, setPhotos] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(accountPersonas.map((persona) => [persona.id, persona.photos])),
  );
  const [forms, setForms] = useState<Record<string, Questionnaire>>(() =>
    Object.fromEntries(accountPersonas.map((persona) => [persona.id, createQuestionnaire(persona)])),
  );
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [uploadTarget, setUploadTarget] = useState<UploadTarget | null>(null);
  const [referralUrl, setReferralUrl] = useState(`/signup?ref=${referralCode}`);
  const [copied, setCopied] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextPersonaIdRef = useRef(accountPersonas.length + 1);

  useEffect(() => {
    setReferralUrl(`${window.location.origin}/signup?ref=${referralCode}`);
  }, [referralCode]);

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

  const openFilePicker = (personaId: string, index: number | null) => {
    setUploadTarget({ personaId, index });
    fileInputRef.current?.click();
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!uploadTarget || !selectedFiles.length) return;

    const validFiles = selectedFiles.filter((file) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 10 * 1024 * 1024,
    );

    if (!validFiles.length) {
      setMessage(uploadTarget.personaId, 'Используйте JPG, PNG или WebP размером до 10 МБ.');
      return;
    }

    const urls = validFiles.map((file) => URL.createObjectURL(file));
    setPhotos((current) => {
      const existing = current[uploadTarget.personaId] ?? [];
      if (uploadTarget.index !== null) {
        return {
          ...current,
          [uploadTarget.personaId]: existing.map((photo, index) =>
            index === uploadTarget.index ? urls[0] : photo,
          ),
        };
      }
      return { ...current, [uploadTarget.personaId]: [...existing, ...urls].slice(0, 3) };
    });
    setMessage(uploadTarget.personaId, 'Фотографии изменены локально и сохранятся после подключения backend.');
    setUploadTarget(null);
  };

  const removePhoto = (personaId: string, index: number) => {
    const currentPhotos = photos[personaId] ?? [];
    if (currentPhotos.length <= 1) {
      setMessage(personaId, 'Для сохранённой персоны нужна минимум одна фотография.');
      return;
    }
    setPhotos((current) => ({
      ...current,
      [personaId]: currentPhotos.filter((_, photoIndex) => photoIndex !== index),
    }));
    setMessage(personaId, 'Фотография удалена из локального набора.');
  };

  const addPersonaAfter = (index: number) => {
    const id = `local-persona-${nextPersonaIdRef.current++}`;
    const newPersona: AccountPersona = {
      id,
      name: 'Новая персона',
      cover: '/selfie-2.png',
      photos: [],
      status: 'needs-photos',
      updatedAt: 'Только что',
      profile: {
        gender: 'woman',
        heightCm: '',
        weightKg: '',
        bodyType: 'average',
        eyeColor: 'brown',
      },
    };

    setPersonas((current) => [
      ...current.slice(0, index + 1),
      newPersona,
      ...current.slice(index + 1),
    ]);
    setPhotos((current) => ({ ...current, [id]: [] }));
    setForms((current) => ({ ...current, [id]: { name: '', ...newPersona.profile } }));
    setSelectedPersonaId(id);
    window.setTimeout(() => document.getElementById(`persona-${id}`)?.scrollIntoView({ behavior: 'smooth' }), 0);
  };

  const deletePersona = (personaId: string) => {
    setPersonas((current) => current.filter((persona) => persona.id !== personaId));
    setSelectedPersonaId((current) => current === personaId ? accountPersonas[0]?.id ?? '' : current);
    setPendingDelete(null);
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
        multiple={uploadTarget?.index === null}
        hidden
        onChange={handleFiles}
      />

      {personas.map((persona, index) => {
        const isMainPersona = index === 0;
        const personaPhotos = photos[persona.id] ?? [];
        const form = forms[persona.id] ?? createQuestionnaire(persona);
        const personaTitle = isMainPersona ? 'Я' : form.name || 'Новая персона';

        return (
          <div key={persona.id} className={styles.personaFormGroup}>
            <section id={`persona-${persona.id}`} className={styles.personaFormBlock}>
              <header className={styles.personaFormHeader}>
                <div>
                  <span>Персона {index + 1}</span>
                  <h2>{personaTitle}</h2>
                </div>
                <div className={styles.personaHeaderActions}>
                  <label className={styles.personaRadio}>
                    <input
                      type="radio"
                      name="photoshoot-persona"
                      checked={selectedPersonaId === persona.id}
                      onChange={() => setSelectedPersonaId(persona.id)}
                    />
                    <span><Check size={16} />Использовать в фотосессиях</span>
                  </label>
                  {!isMainPersona ? (
                    <button
                      type="button"
                      className={styles.deletePersonaButton}
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
                      <p>Загрузите 1–3 ваших лучших селфи, которые вам нравятся.</p>
                    </div>
                    <span>{personaPhotos.length} из 3</span>
                  </div>

                  <div className={styles.compactPhotoGuides}>
                    <div className={styles.guideCardGood}>
                      <div className={styles.goodExampleStrip} aria-label="Примеры подходящих фотографий">
                        <div className={styles.frontPortraitExample}><Image src="/before-1.png" alt="Подходящее фото: близкий портрет с распущенными волосами" fill sizes="72px" /><span><UserRound size={13} />Фронтально</span></div>
                        <div><Image src="/selfie-3.png" alt="Подходящее фото: хороший свет" fill sizes="72px" /><span><Sun size={13} />Свет</span></div>
                        <div><Image src="/before-main.png" alt="Подходящее фото: лицо в фокусе" fill sizes="72px" /><span><Focus size={13} />Резко</span></div>
                      </div>
                      <h4><Check size={15} />Подходят</h4>
                      <ul>
                        <li>лицо хорошо видно</li>
                        <li>фронтально</li>
                        <li>хороший свет</li>
                        <li>без сильных теней</li>
                      </ul>
                    </div>
                    <div className={styles.guideCardBad}>
                      <div className={styles.badExampleStrip} aria-label="Примеры неподходящих фотографий">
                        <div><Image src="/before-1.png" alt="Пример: солнцезащитные очки" fill sizes="72px" /><span><Glasses size={13} />Очки</span></div>
                        <div className={styles.blurredExample}><Image src="/before-2.png" alt="Пример: размытая фотография" fill sizes="72px" /><span><Focus size={13} />Размыто</span></div>
                        <div className={styles.distantExample}><Image src="/studio-stool-woman.png" alt="Пример: человек стоит далеко и виден в полный рост" fill sizes="72px" /><span><Sun size={13} />Далеко</span></div>
                      </div>
                      <h4><X size={15} />Не подходят</h4>
                      <ul>
                        <li>солнцезащитные очки</li>
                        <li>размыто</li>
                        <li>сильный контровой свет</li>
                        <li>слишком дальний план</li>
                      </ul>
                    </div>
                  </div>

                  <div className={styles.compactPhotos}>
                    {personaPhotos.map((photo, photoIndex) => (
                      <div key={`${persona.id}-${photo}-${photoIndex}`} className={styles.compactPhoto}>
                        <div className={styles.compactPhotoImage}>
                          <Image
                            src={photo}
                            alt={`${personaTitle}, фотография ${photoIndex + 1}`}
                            fill
                            sizes="(max-width: 700px) 28vw, 120px"
                            unoptimized={photo.startsWith('blob:')}
                          />
                        </div>
                        <div className={styles.compactPhotoActions}>
                          <button type="button" onClick={() => openFilePicker(persona.id, photoIndex)}>Заменить</button>
                          <button type="button" aria-label="Удалить фотографию" onClick={() => removePhoto(persona.id, photoIndex)}><Trash2 size={15} /></button>
                        </div>
                      </div>
                    ))}
                    {personaPhotos.length < 3 ? (
                      <button type="button" className={styles.addPhotoTile} onClick={() => openFilePicker(persona.id, null)}>
                        <Camera size={22} />
                        <span>Добавить фото</span>
                      </button>
                    ) : null}
                  </div>
                  {messages[persona.id] ? <p className={styles.localNotice}>{messages[persona.id]}</p> : null}
                </div>

                <form
                  className={styles.personaQuestionnaire}
                  onSubmit={(event) => {
                    event.preventDefault();
                    setMessage(persona.id, 'Сохранение в backend пока не подключено. Изменения останутся до перезагрузки страницы.');
                  }}
                >
                  <div className={styles.personaColumnHeading}>
                    <div>
                      <h3>Анкета</h3>
                      <p>Параметры помогают точнее сохранить внешность.</p>
                    </div>
                  </div>


                  <div className={styles.personaFields}>
                    <label>Имя
                      <input value={form.name} onChange={(event) => updateForm(persona.id, 'name', event.target.value)} />
                    </label>
                    <label>Пол
                      <select value={form.gender} onChange={(event) => updateForm(persona.id, 'gender', event.target.value)}>
                        <option value="woman">Женский</option>
                        <option value="man">Мужской</option>
                      </select>
                    </label>
                    <label>Рост, см
                      <input inputMode="numeric" value={form.heightCm} onChange={(event) => updateForm(persona.id, 'heightCm', event.target.value.replace(/\D/g, '').slice(0, 3))} />
                    </label>
                    <label>Вес, кг
                      <input inputMode="numeric" value={form.weightKg} onChange={(event) => updateForm(persona.id, 'weightKg', event.target.value.replace(/\D/g, '').slice(0, 3))} />
                    </label>
                    <fieldset className={styles.bodyTypeField}>
                      <legend>Телосложение</legend>
                      <div className={styles.bodyTypeOptions}>
                        {([
                          ['slim', 'Стройное'],
                          ['average', 'Среднее'],
                          ['athletic', 'Спортивное'],
                        ] as const).map(([value, label]) => (
                          <label key={value}>
                            <input
                              type="radio"
                              name={`body-type-${persona.id}`}
                              value={value}
                              checked={form.bodyType === value}
                              onChange={(event) => updateForm(persona.id, 'bodyType', event.target.value)}
                            />
                            <span><PersonStanding size={22} strokeWidth={value === 'athletic' ? 2.5 : value === 'average' ? 2 : 1.5} />{label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <label>Цвет глаз
                      <select value={form.eyeColor} onChange={(event) => updateForm(persona.id, 'eyeColor', event.target.value)}>
                        <option value="brown">Карие</option>
                        <option value="blue">Голубые</option>
                        <option value="green">Зелёные</option>
                        <option value="gray">Серые</option>
                      </select>
                    </label>
                  </div>

                  <div className={styles.personaFormActions}>
                    <button type="submit" className={styles.primaryButton}>Сохранить</button>
                  </div>
                </form>
              </div>
            </section>

            <button type="button" className={styles.addPersonaButton} onClick={() => addPersonaAfter(index)}>
              <Plus size={18} />Добавить персону
            </button>
          </div>
        );
      })}

      <section className={`${styles.profileSection} ${styles.compactProfileSection}`}>
        <h2>Аккаунт</h2>
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
        <p className={styles.panelDescription}>Фотографии и параметры внешности используются только для создания выбранных фотосессий. Необратимое удаление будет доступно после подключения backend.</p>
        <div className={styles.privacyActions}>
          <button type="button" className={styles.dangerButton} onClick={() => setDeleteAccountOpen(true)}>Удалить аккаунт</button>
        </div>
      </section>

      {pendingDelete ? (
        <div className={styles.modalBackdrop} onMouseDown={(event) => event.currentTarget === event.target && setPendingDelete(null)}>
          <section className={styles.modal} role="alertdialog" aria-modal="true" aria-labelledby="delete-persona-title">
            <h2 id="delete-persona-title">Удалить персону?</h2>
            <p>Персона будет удалена только из локального состояния этой страницы.</p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setPendingDelete(null)}>Отмена</button>
              <button type="button" className={styles.dangerButton} onClick={() => deletePersona(pendingDelete)}>Удалить</button>
            </div>
          </section>
        </div>
      ) : null}

      {deleteAccountOpen ? (
        <div className={styles.modalBackdrop} onMouseDown={(event) => event.currentTarget === event.target && setDeleteAccountOpen(false)}>
          <section className={styles.modal} role="alertdialog" aria-modal="true" aria-labelledby="delete-account-title">
            <h2 id="delete-account-title">Удалить аккаунт?</h2>
            <p>Backend-удаление пока не подключено, поэтому аккаунт и данные не будут изменены.</p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setDeleteAccountOpen(false)}>Закрыть</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}