type CookieValue = { name: string; value: string };
type WritableCookieStore = {
  getAll(): CookieValue[];
  set(name: string, value: string, options: { path: string; sameSite: 'lax'; maxAge: number }): void;
};

export function getSupabaseAuthStorageKey(supabaseUrl: string) {
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  if (!projectRef) throw new Error('Invalid Supabase URL');
  return `sb-${projectRef}-auth-token`;
}

function isStorageCookie(name: string, storageKey: string) {
  return name === storageKey
    || (name.startsWith(`${storageKey}.`) && /^\d+$/.test(name.slice(storageKey.length + 1)));
}

export function clearSupabaseAuthCookies(cookieStore: WritableCookieStore, supabaseUrl: string) {
  const authStorageKey = getSupabaseAuthStorageKey(supabaseUrl);
  const storageKeys = [authStorageKey, `${authStorageKey}-code-verifier`, `${authStorageKey}-user`];
  const namesToRemove = cookieStore.getAll()
    .map(({ name }) => name)
    .filter((name) => storageKeys.some((storageKey) => isStorageCookie(name, storageKey)));

  for (const name of namesToRemove) {
    cookieStore.set(name, '', { path: '/', sameSite: 'lax', maxAge: 0 });
  }

  return namesToRemove;
}
