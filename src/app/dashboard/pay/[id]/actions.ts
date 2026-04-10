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

  // Запускаем процесс упаковки и тренировки в фоновом режиме.
  // Мы не дожидаемся ответа, чтобы пользователь не ждал, пока архивируются фото.
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
  fetch(`${appUrl}/api/ai/start-training`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoshootId }),
  }).catch(err => console.error('Failed to trigger background training job:', err));

  // Обновляем страницу дашборда и возвращаем пользователя туда
  revalidatePath('/dashboard');
  redirect('/dashboard');
}
