export const LEGAL_DOCUMENT_VERSIONS = {
  offer: '2026-10-15',
  privacy: '2026-10-15',
  personalData: '2026-10-15',
  generation: '2026-10-15',
} as const;

export const CURRENT_CONSENT_VERSIONS = {
  offer: LEGAL_DOCUMENT_VERSIONS.offer,
  privacy: LEGAL_DOCUMENT_VERSIONS.privacy,
  personal_data: LEGAL_DOCUMENT_VERSIONS.personalData,
  generation: LEGAL_DOCUMENT_VERSIONS.generation,
} as const;

export type ConsentType = keyof typeof CURRENT_CONSENT_VERSIONS;

export const REQUIRED_ORDER_CONSENTS: ConsentType[] = [
  'offer',
  'privacy',
  'personal_data',
  'generation',
];
