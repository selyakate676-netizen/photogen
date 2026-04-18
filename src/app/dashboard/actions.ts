'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { startGenerationForPhotoshoot } from '@/lib/ai/generation';

export async function retryTraining(formData: FormData) {
  const photoshootId = formData.get('photoshootId') as string;
  if (!photoshootId) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return;
  }

  // Обновляем статус на generating, если он завис
  await supabase
    .from('photoshoots')
    .update({ status: 'generating' })
    .eq('id', photoshootId)
    .eq('user_id', user.id);

  // Пытаемся запустить заново
  try {
    console.log(`[Retry Action] Manually restarting generation for ${photoshootId}`);
    await startGenerationForPhotoshoot(photoshootId);
  } catch (err) {
    console.error('Error in retry action:', err);
  }

  revalidatePath('/dashboard');
}

