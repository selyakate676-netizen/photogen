import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ProfileWorkspace from './ProfileWorkspace';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const displayName = typeof user.user_metadata?.name === 'string'
    ? user.user_metadata.name
    : typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : 'Пользователь PhotoGen';

  return (
    <ProfileWorkspace
      displayName={displayName}
      email={user.email ?? 'Не указан'}
      registeredAt={new Date(user.created_at).toLocaleDateString('ru-RU')}
      referralCode={user.id.slice(0, 8)}
    />
  );
}