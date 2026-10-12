'use server';

import { revalidatePath } from 'next/cache';
import { PERSONAL_DATA_CONSENT } from '@/lib/consents';
import { createClient } from '@/utils/supabase/server';

export async function acceptPersonalDataConsent(formData: FormData) {
  if (formData.get('accepted') !== 'on') {
    throw new Error('Согласие не подтверждено');
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.rpc('accept_personal_data_consent', {
    p_document_version: PERSONAL_DATA_CONSENT.version,
    p_document_path: PERSONAL_DATA_CONSENT.path,
  });
  if (error) throw new Error('РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ СЃРѕРіР»Р°СЃРёРµ');
  revalidatePath('/account/profile');
}
