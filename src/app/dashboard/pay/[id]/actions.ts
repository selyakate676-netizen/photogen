'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function mockPayment(formData: FormData) {
  const photoshootId = formData.get('photoshootId') as string;
  if (!photoshootId) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Меняем статус на 'training', эмулируя успешную оплату и начало процесса AI-обработки
  const { error } = await supabase
    .from('photoshoots')
    .update({ status: 'training' })
    .eq('id', photoshootId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to update photoshoot status:', error);
    throw new Error('Failed to update status');
  }

  // Запускаем процесс упаковки и тренировки.
  // Теперь мы ДОЖИДАЕМСЯ начала процесса, чтобы гарантировать запуск.
  try {
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
    const response = await fetch(`${appUrl}/api/ai/start-training`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoshootId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to trigger training:', errorData);
      // Мы не прерываем редирект, чтобы не пугать пользователя, 
      // но в логах сервера теперь будет ошибка.
    }
  } catch (err) {
    console.error('Network error while triggering training:', err);
  }

  // Обновляем страницу дашборда и возвращаем пользователя туда
  revalidatePath('/dashboard');
  redirect('/dashboard');
}
