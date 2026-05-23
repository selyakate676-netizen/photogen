type PublicEnvName =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "NEXT_PUBLIC_SITE_URL"
  | "NEXT_PUBLIC_VERCEL_URL"
  | "NEXT_PUBLIC_YANDEX_METRICA_ID";

function cleanPublicEnvValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getPublicEnv(name: PublicEnvName): string {
  const value = cleanPublicEnvValue(process.env[name]);

  if (!value) {
    throw new Error(`[env] Missing required public environment variable: ${name}`);
  }

  return value;
}

export function getOptionalPublicEnv(name: PublicEnvName): string | undefined {
  return cleanPublicEnvValue(process.env[name]);
}

export function getSupabaseBrowserConfig(): { url: string; anonKey: string } {
  return {
    url: getPublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: getPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}
