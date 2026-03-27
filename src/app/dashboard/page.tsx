import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { signout } from '../login/actions'
import styles from './dashboard.module.css'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className={styles.dashboardPage}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Личный кабинет</h1>
          <form>
            <button className={styles.logoutButton} formAction={signout}>
              Выйти
            </button>
          </form>
        </div>

        <div className={styles.welcomeCard}>
          <p className={styles.welcomeText}>
            Добро пожаловать! 👋
          </p>
          <p className={styles.email}>{user.email}</p>
          <p className={styles.hint}>
            Скоро здесь появится возможность загрузить селфи и заказать AI-фотосессию.
          </p>
        </div>
      </div>
    </div>
  )
}
