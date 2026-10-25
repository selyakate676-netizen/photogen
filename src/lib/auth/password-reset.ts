export const PASSWORD_RESET_COOLDOWN_MS = 60_000;
export const PASSWORD_RESET_MIN_LENGTH = 8;
export const RECOVERY_TOKEN_COOKIE = 'photogen-recovery-token';
export const RECOVERY_TOKEN_MAX_AGE_SECONDS = 600;

export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < PASSWORD_RESET_MIN_LENGTH) return `Пароль должен содержать не менее ${PASSWORD_RESET_MIN_LENGTH} символов`;
  if (password !== confirmation) return 'Пароли не совпадают';
  return null;
}

export function passwordResetRedirectUrl(origin: string): string {
  return `${origin}/reset-password`;
}

export function validRecoveryTokenHash(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 20 && value.length <= 2048 && /^[A-Za-z0-9_-]+$/.test(value);
}
