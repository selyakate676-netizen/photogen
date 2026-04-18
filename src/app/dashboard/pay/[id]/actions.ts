'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { startGenerationForPhotoshoot } from '@/lib/ai/generation';

export async function mockPayment(formData: FormData) {
  const photoshootId = formData.get('photoshootId') as string;
  if (!photoshootId) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Меняем статус на 'generating', эмулируя успешную оплату (временно используем 'training' если UI завязан)
  const { error } = await supabase
    .from('photoshoots')
    .update({ status: 'generating' })
    .eq('id', photoshootId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to update photoshoot status:', error);
    throw new Error('Failed to update status');
  }

  // Запускаем процесс генерации InstantID (занимает ~15 секунд в бэграунде API)
  try {
    await startGenerationForPhotoshoot(photoshootId);
  } catch (err) {
    console.error('Error starting generation directly:', err);
  }

  // Обновляем страницу дашборда и возвращаем пользователя туда
  revalidatePath('/dashboard');
  redirect('/dashboard');
}

