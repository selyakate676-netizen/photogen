'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { startMvpGenerationForPhotoshoot } from '@/lib/ai/mvp-generation-adapter';
import { SAFE_GENERATION_ERROR, updatePhotoshootStatus } from '@/lib/photoshoots/status';

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
    await startMvpGenerationForPhotoshoot(photoshootId, { waitForCompletion: false });
  } catch (err) {
    console.error('Error in retry action:', err);
    await updatePhotoshootStatus(supabase, photoshootId, 'failed', SAFE_GENERATION_ERROR.message);
  }

  revalidatePath('/account/generated');
}