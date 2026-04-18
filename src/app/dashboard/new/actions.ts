'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

interface CreatePhotoshootProps {
  styleId: string;
  imageKeys: string[]; // Теперь передаем ключи загруженных фото из S3
  bodyType: string;
  eyeColor: string;
  hairColor: string;
}

export async function createPhotoshoot({ styleId, imageKeys, bodyType, eyeColor, hairColor }: CreatePhotoshootProps) {
  const supabase = await createClient();

  // 1. Проверяем пользователя
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Нужно войти в систему' };
  }

  if (!imageKeys || imageKeys.length === 0) {
    return { error: 'Фотографии не загружены' };
  }

  // 2. Создаем запись о фотосессии в Supabase
  const { data, error } = await supabase.from('photoshoots').insert({
    user_id: user.id,
    style_id: styleId,
    status: 'pending',
    images: imageKeys, // Сохраняем пути к файлам в Beget S3
    body_type: bodyType,
    eye_color: eyeColor,
    hair_color: hairColor
  }).select().single();

  if (error) {
    console.error('Database error:', error);
    return { error: 'Не удалось создать запись в базе' };
  }

  // 3. Обновляем данные на главной странице кабинета
  revalidatePath('/dashboard');

  return { success: true, data };
}
