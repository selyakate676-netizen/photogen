'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

export async function cancelUnstartedPhotoshoot(formData: FormData) {
  const photoshootId = formData.get('photoshootId');
  if (typeof photoshootId !== 'string' || !photoshootId) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.rpc('cancel_unstarted_photoshoot', {
    p_photoshoot_id: photoshootId,
  });
  if (error) {
    console.warn('Safe photoshoot cancellation was rejected.');
  }
  revalidatePath('/account/generated');
}
