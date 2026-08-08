'use server';

import { revalidatePath } from 'next/cache';
import { getPhotoPack } from '@/lib/photoPacks';
import { authenticatedDb } from '@/lib/personas/api';

type CreatePhotoshootProps = {
  personaId: string;
  styleId: string;
};

export async function createPhotoshoot({ personaId, styleId }: CreatePhotoshootProps) {
  const { db, user } = await authenticatedDb();
  if (!user) return { error: 'Нужно войти в систему', status: 401 };
  if (!personaId) return { error: 'Выберите Persona для фотосессии', status: 400 };

  const pack = getPhotoPack(styleId);
  if (!pack) return { error: 'Фотопак не найден', status: 400 };

  const { data: persona } = await db
    .from('personas')
    .select('gender,eye_color,height,weight')
    .eq('id', personaId)
    .single();

  if (!persona) return { error: 'Persona не найдена. Выберите её заново', status: 404 };

  const { data, error } = await db.rpc('create_photoshoot_with_persona', {
    p_persona_id: personaId,
    p_style_id: pack.id,
    p_images: [],
    p_gender: persona.gender === 'man' ? 'man' : 'woman',
    p_body_type: 'average',
    p_eye_color: persona.eye_color ?? '',
    // Persona does not store hair color yet; keep it unknown instead of inventing a default.
    p_hair_color: '',
    p_height_cm: persona.height,
    p_weight_kg: persona.weight,
    p_height_class: null,
    p_body_shape: null,
    p_body_build: null,
    p_requested_images_count: pack.photoCount,
    p_package_snapshot: {
      id: pack.id,
      slug: pack.slug,
      name: pack.title,
      price_crystals: pack.priceCrystals,
    },
  }).single();

  if (error) {
    console.error('Database error:', error);
    if (error.code === 'P0002' || error.message.includes('PERSONA_NOT_FOUND')) {
      return { error: 'Persona не найдена. Выберите её заново', status: 404 };
    }
    if (error.message.includes('PERSONA_NOT_ACTIVE')) {
      return { error: 'Выбранная Persona ещё не готова к фотосессии', status: 409 };
    }
    if (error.message.includes('PERSONA_HAS_NO_PHOTOS')) {
      return { error: 'Добавьте хотя бы одну фотографию Persona', status: 409 };
    }
    return { error: 'Не удалось создать фотосессию', status: 500 };
  }

  revalidatePath('/account/generated');
  return { success: true, data };
}