import { CURRENT_CONSENT_VERSIONS, type ConsentType } from '@/lib/legal/consents';

type ConsentQuery = {
  select: (columns: string) => ConsentQuery;
  eq: (column: string, value: string) => ConsentQuery;
  maybeSingle: () => Promise<{ data: unknown; error: { message?: string } | null }>;
};

type ConsentDb = {
  from: (table: string) => { select: (columns: string) => ConsentQuery };
};

export async function hasCurrentConsent(db: ConsentDb, userId: string, consentType: ConsentType) {
  const { data, error } = await db
    .from('user_consents')
    .select('id')
    .eq('user_id', userId)
    .eq('consent_type', consentType)
    .eq('document_version', CURRENT_CONSENT_VERSIONS[consentType])
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function requireGenerationConsent(db: ConsentDb, userId: string) {
  if (!await hasCurrentConsent(db, userId, 'generation')) {
    throw new Error('GENERATION_CONSENT_REQUIRED');
  }
}
