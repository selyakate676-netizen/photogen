import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import styles from '../account.module.css';
import walletStyles from './wallet.module.css';

const transactionLabels: Record<string, string> = {
  credit: 'Начисление',
  debit: 'Оплата фотосессии',
};

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default async function WalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: wallet }, { data: transactions }] = await Promise.all([
    supabase.from('wallets').select('balance_crystals').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('wallet_transactions')
      .select('delta_crystals,balance_after_crystals,transaction_type,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  const balance = wallet?.balance_crystals ?? 0;
  const history = transactions ?? [];

  return (
    <>
      <header className={`${styles.sectionHeader} ${styles.generatedPageHeader}`}>
        <div>
          <h2>Кристаллы</h2>
          <p>Баланс и история операций вашего аккаунта.</p>
        </div>
      </header>

      <section className={`${styles.panel} ${walletStyles.walletSummary}`}>
        <div>
          <h2>Текущий баланс</h2>
          <p className={walletStyles.walletBalance}>{balance} кристаллов</p>
        </div>
      </section>

      <section className={styles.panel}>
        <h2>История операций</h2>
        {history.length === 0 ? (
          <p className={walletStyles.walletEmpty}>Операций пока нет</p>
        ) : (
          <div className={walletStyles.transactionList}>
            {history.map((transaction, index) => {
              const isCredit = transaction.delta_crystals > 0;
              const signedAmount = `${isCredit ? '+' : ''}${transaction.delta_crystals}`;

              return (
                <div key={`${transaction.created_at}-${index}`} className={walletStyles.transactionRow}>
                  <div className={walletStyles.transactionInfo}>
                    <strong>{transactionLabels[transaction.transaction_type] ?? 'Операция'}</strong>
                    <time dateTime={transaction.created_at}>
                      {dateFormatter.format(new Date(transaction.created_at))}
                    </time>
                  </div>
                  <span className={`${walletStyles.transactionAmount} ${isCredit ? walletStyles.transactionCredit : walletStyles.transactionDebit}`}>
                    {signedAmount} кристаллов
                  </span>
                  <span className={walletStyles.transactionBalance}>
                    Баланс: {transaction.balance_after_crystals}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
