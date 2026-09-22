export const LEGAL_DOCUMENT_VERSIONS = {
  privacy: 'v1',
  personal_data: 'v1',
  generation: 'v1',
  offer: 'v1',
} as const;

export type ConsentType = 'privacy' | 'personal_data' | 'generation';

export const CURRENT_CONSENT_VERSIONS: Record<ConsentType, string> = {
  privacy: LEGAL_DOCUMENT_VERSIONS.privacy,
  personal_data: LEGAL_DOCUMENT_VERSIONS.personal_data,
  generation: LEGAL_DOCUMENT_VERSIONS.generation,
};
