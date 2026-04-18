'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { startTrainingForPhotoshoot } from '@/lib/ai/training';

export async function mockPayment(formData: FormData) {
  const photoshootId = formData.get('photoshootId') as string;
  if (!photoshootId) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Меняем статус на 'training' после успешной оплаты
  const { error } = await supabase
    .from('photoshoots')
    .update({ status: 'training' })
    .eq('id', photoshootId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to update photoshoot status:', error);
    throw new Error('Failed to update status');
  }

  // Запускаем обучение LoRA
  try {
    await startTrainingForPhotoshoot(photoshootId);
  } catch (err) {
    console.error('Error starting training:', err);
  }

  // Обновляем страницу дашборда и возвращаем пользователя туда
  revalidatePath('/dashboard');
  redirect('/dashboard');
}

