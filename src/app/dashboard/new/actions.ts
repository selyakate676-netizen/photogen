'use client';
// Внимание: В Next.js 15+ для серверных действий используется 'use server'
// Но так как мы вызываем это из клиентского компонента, создаем отдельный файл
'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

interface CreatePhotoshootProps {
  styleId: string;
  imageCount: number;
}

export async function createPhotoshoot({ styleId, imageCount }: CreatePhotoshootProps) {
  const supabase = await createClient();

  // 1. Проверяем пользователя
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Нужно войти в систему' };
  }

  // 2. Получаем список файлов из хранилища для этого пользователя
  // (чтобы сохранить ссылки на них в БД)
  const { data: files } = await supabase.storage
    .from('photoshoots')
    .list(user.id);

  const imageUrls = files?.map(f => `${user.id}/${f.name}`) || [];

  // 3. Создаем запись о фотосессии
  const { data, error } = await supabase.from('photoshoots').insert({
    user_id: user.id,
    style_id: styleId,
    status: 'pending',
    images: imageUrls
  }).select().single();

  if (error) {
    console.error('Database error:', error);
    return { error: 'Не удалось создать запись в базе' };
  }

  // Обновляем данные на главной странице кабинета
  revalidatePath('/dashboard');

  return { success: true, data };
}
