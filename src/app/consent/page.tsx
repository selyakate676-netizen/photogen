'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import styles from './consent.module.css';

type ConsentStatus = {
  registrationAccepted: boolean;
  generationAccepted: boolean;
};

function safeNext(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
}

export default function ConsentPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState('/dashboard');
  const [orderScope, setOrderScope] = useState(false);
  const [status, setStatus] = useState<ConsentStatus | null>(null);
  const [offerAccepted, setOfferAccepted] = useState(false);
  const [personalDataAccepted, setPersonalDataAccepted] = useState(false);
  const [generationAccepted, setGenerationAccepted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const destination = safeNext(params.get('next'));
    const requiresOrderConsent = params.get('scope') === 'order';
    setNextPath(destination);
    setOrderScope(requiresOrderConsent);

    void fetch('/api/consents', { cache: 'no-store' }).then(async (response) => {
      if (response.status === 401) {
        router.replace(`/login?next=${encodeURIComponent(destination)}`);
        return;
      }
      if (!response.ok) throw new Error('CONSENTS_LOAD_FAILED');
      const payload = await response.json() as ConsentStatus;
      setStatus(payload);
      if (payload.registrationAccepted && (!requiresOrderConsent || payload.generationAccepted)) {
        router.replace(destination);
      }
    }).catch(() => setError('Не удалось проверить согласия. Обновите страницу.'));
  }, [router]);

  const submit = async () => {
    if (!status) return;
    if (!status.registrationAccepted && (!offerAccepted || !personalDataAccepted)) {
      setError('Подтвердите оферту и согласие на обработку персональных данных.');
      return;
    }
    if (orderScope && !status.generationAccepted && !generationAccepted) {
      setError('Подтвердите согласие на AI-генерацию.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const groups = [
        ...(!status.registrationAccepted ? ['registration'] : []),
        ...(orderScope && !status.generationAccepted ? ['generation'] : []),
      ];
      for (const consentGroup of groups) {
        const response = await fetch('/api/consents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consentGroup }),
        });
        if (!response.ok) throw new Error('CONSENT_RECORD_FAILED');
      }
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError('Не удалось сохранить согласие. Повторите попытку.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.main}>
      <section className={styles.card}>
        <h1>Подтверждение условий</h1>
        <p>Для продолжения подтвердите актуальные документы сервиса.</p>

        {status && !status.registrationAccepted ? (
          <>
            <label className={styles.row}>
              <input type="checkbox" checked={offerAccepted} onChange={(event) => setOfferAccepted(event.target.checked)} />
              <span>Я ознакомился(ась) с <Link href="/offer" target="_blank">офертой</Link> и принимаю её условия.</span>
            </label>
            <label className={styles.row}>
              <input type="checkbox" checked={personalDataAccepted} onChange={(event) => setPersonalDataAccepted(event.target.checked)} />
              <span>Я ознакомился(ась) с <Link href="/privacy" target="_blank">политикой</Link> и даю <Link href="/personal-data-consent" target="_blank">согласие на обработку персональных данных</Link>.</span>
            </label>
          </>
        ) : null}

        {status && orderScope && !status.generationAccepted ? (
          <label className={styles.row}>
            <input type="checkbox" checked={generationAccepted} onChange={(event) => setGenerationAccepted(event.target.checked)} />
            <span>Я даю <Link href="/generation-consent" target="_blank">согласие на AI-генерацию изображений</Link>.</span>
          </label>
        ) : null}

        {error ? <p className={styles.error}>{error}</p> : null}
        <button type="button" className="btn btn-primary" disabled={!status || submitting} onClick={() => void submit()}>
          {submitting ? 'Сохраняем…' : 'Подтвердить и продолжить'}
        </button>
      </section>
    </main>
  );
}
