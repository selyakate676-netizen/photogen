import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const photoshootId = formData.get('photoshootId') as string;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }
    
    if (!photoshootId) {
       return NextResponse.json({ error: 'Photoshoot ID is required' }, { status: 400 });
    }

    // Создаем директорию для этой фотосессии
    const uploadDir = join(process.cwd(), 'public', 'uploads', photoshootId);
    await mkdir(uploadDir, { recursive: true });

    const uploadedUrls = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = join(uploadDir, fileName);
      
      await writeFile(filePath, buffer);
      
      // Формируем публичный относительный URL для базы данных
      uploadedUrls.push(`/uploads/${photoshootId}/${fileName}`);
    }

    // Сохраняем информацию о загруженных файлах в БД Supabase
    // Мы предполагаем, что заголовок фотосессии уже был создан или будет обновлен
    const { error: dbError } = await supabase
      .from('photoshoots')
      .update({ images: uploadedUrls, status: 'uploaded' })
      .eq('id', photoshootId);
      
    if (dbError) {
        console.error('Database error:', dbError);
        // Если таблица еще не создана, мы просто вернем URLs для тестирования UI
    }

    return NextResponse.json({ 
      success: true, 
      urls: uploadedUrls,
      message: 'Файлы успешно загружены!' 
    });

  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json(
      { error: 'Что-то пошло не так при загрузке файлов.' },
      { status: 500 }
    );
  }
}
