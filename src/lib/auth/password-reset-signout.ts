type SignOutResult = { error: unknown };
type RecoveryAuthClient = {
  signOut(options?: { scope?: 'global' | 'local' | 'others' }): Promise<SignOutResult>;
};

export type RecoverySignOutResult = 'global' | 'local' | 'failed';

export async function terminateRecoverySession(auth: RecoveryAuthClient): Promise<RecoverySignOutResult> {
  const { error: primaryError } = await auth.signOut();
  if (!primaryError) return 'global';

  const { error: localError } = await auth.signOut({ scope: 'local' });
  return localError ? 'failed' : 'local';
}
