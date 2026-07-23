import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import SettingsControls from './SettingsControls';
import styles from '../account/account.module.css';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <main className={styles.page}>
      <div className={styles.settingsShell}>
        <header className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>PhotoGen</p>
            <h2>Настройки</h2>
            <p>Интерфейс и язык. Данные профиля находятся отдельно.</p>
          </div>
        </header>
        <SettingsControls />
      </div>
    </main>
  );
}
