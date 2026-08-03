'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { startQueuedPhotoshootGeneration } from '@/lib/photoshoots/orchestration';

export async function retryTraining(formData: FormData) {
  const photoshootId = formData.get('photoshootId') as string;
  if (!photoshootId) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  try {
    console.log(`[Retry Action] Manually restarting MVP generation for ${photoshootId}`);
    await startQueuedPhotoshootGeneration(photoshootId, user.id);
  } catch (err) {
    console.error('Error in retry action:', err);
  }

  revalidatePath('/account/generated');
}