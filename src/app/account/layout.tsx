import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import styles from './account.module.css';

export const dynamic = 'force-dynamic';

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.content}>{children}</div>
      </div>
    </main>
  );
}
