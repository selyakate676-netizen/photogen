import 'server-only';

import {
  CURRENT_CONSENT_VERSIONS,
  type ConsentType,
} from '@/lib/legal/consents';

type ConsentQuery = {
  select: (columns: string) => ConsentQuery;
  eq: (column: string, value: string) => ConsentQuery;
  maybeSingle: () => Promise<{ data: unknown; error: { message?: string } | null }>;
};

type ConsentDb = {
  from: (table: string) => { select: (columns: string) => ConsentQuery };
};

export async function hasCurrentConsent(
  db: unknown,
  userId: string,
  consentType: ConsentType,
) {
  const consentDb = db as ConsentDb;
  const { data, error } = await consentDb
    .from('user_legal_consents')
    .select('id')
    .eq('user_id', userId)
    .eq('consent_type', consentType)
    .eq('document_version', CURRENT_CONSENT_VERSIONS[consentType])
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function hasCurrentConsents(
  db: unknown,
  userId: string,
  consentTypes: ConsentType[],
) {
  const results = await Promise.all(
    consentTypes.map((consentType) => hasCurrentConsent(db, userId, consentType)),
  );
  return results.every(Boolean);
}

export async function requireCurrentConsents(
  db: unknown,
  userId: string,
  consentTypes: ConsentType[],
) {
  if (!await hasCurrentConsents(db, userId, consentTypes)) {
    throw new Error('CURRENT_LEGAL_CONSENTS_REQUIRED');
  }
}
