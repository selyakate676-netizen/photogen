import { LEGAL_DOCUMENT_VERSIONS } from '@/lib/legal/consents';

export const OAUTH_CONSENT_COOKIE = 'photogen_oauth_consent';

export const OAUTH_CONSENT_VALUE = [
  LEGAL_DOCUMENT_VERSIONS.privacy,
  LEGAL_DOCUMENT_VERSIONS.personal_data,
].join(':');

export const TELEGRAM_PROVIDER = 'custom:telegram' as const;
