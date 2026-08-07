'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  confirmMockPaymentAndQueue,
  startQueuedPhotoshootGeneration,
} from '@/lib/photoshoots/orchestration';

export async function mockPayment(formData: FormData) {
  const photoshootId = formData.get('photoshootId') as string;
  if (!photoshootId) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  const payment = await confirmMockPaymentAndQueue(photoshootId, user.id);
  if (!payment.ok) {
    redirect('/account/generated');
  }

  if (payment.shouldStartGeneration) {
    await startQueuedPhotoshootGeneration(photoshootId, user.id);
  }

  // Refresh the current generations list and return to its polling flow.
  revalidatePath('/account/generated');
  const query = new URLSearchParams({
    payment_completed: photoshootId,
    package_slug: payment.photoshoot.style_id,
  });
  redirect(`/account/generated?${query.toString()}`);
}

