import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getReplicateApiToken } from "@/lib/env";
import { updatePhotoshootStatus } from "@/lib/photoshoots/status";
import type { PhotoshootStatus } from "@/types/database";
import Replicate from "replicate";

// Функция для гарантированного получения ключа напрямую из файла (обход глюков кеша VPS)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: photoshootId } = await params;
    const supabase = await createClient();
    
    const replicate = new Replicate({
      auth: getReplicateApiToken(),
    });

    // 1. Получаем запись из базы
    const { data: photoshoot, error: dbError } = await supabase
      .from('photoshoots')
      .select('status, training_id, result_images')
      .eq('id', photoshootId)
      .single();

    if (dbError || !photoshoot) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Если уже готово — возвращаем сразу, не опрашиваем Replicate
    if (photoshoot.status === 'completed') {
      return NextResponse.json({ status: 'completed', progress: 100 });
    }

    // Если ошибка — возвращаем сразу
    if (photoshoot.status === 'error') {
      return NextResponse.json({ status: 'error', progress: 0 });
    }

    // Если статус 'generating' — проверяем сколько фото уже сохранено
    if (photoshoot.status === 'generating') {
      const savedCount = (photoshoot.result_images || []).length;
      if (savedCount >= 3) {
        // Вебхук вызвался но не обновил статус — доисправляем
        const updated = await updatePhotoshootStatus(supabase, photoshootId, 'completed');
        return NextResponse.json({ status: updated ? 'completed' : photoshoot.status, progress: updated ? 100 : 95 });
      }
      return NextResponse.json({ status: 'generating', progress: 95 });
    }

    // Если обучение еще не привязано, возвращаем текущий статус из базы
    if (!photoshoot.training_id) {
       return NextResponse.json({ status: photoshoot.status, progress: 0 });
    }

    // 2. Опрашиваем Replicate
    const training = await replicate.trainings.get(photoshoot.training_id);
    
    // 3. Маппим статус Replicate на наш
    let currentStatus: PhotoshootStatus = photoshoot.status;
    let progress = 0;

    if (training.status === 'starting') {
        progress = 10;
    } else if (training.status === 'processing') {
        currentStatus = 'training';
        progress = 45; // Fallback
        
        // Псевдо-прогресс: обучение обычно идет 15-20 минут
        const startTime = training.started_at ? new Date(training.started_at).getTime() : Date.now();
        const elapsedMinutes = (Date.now() - startTime) / 60000;
        
        // Маппим 15 минут на прогресс от 10% до 90%
        const calculatedProgress = 10 + Math.floor((elapsedMinutes / 15) * 80);
        progress = Math.min(95, Math.max(10, calculatedProgress)); 
    } else if (training.status === 'succeeded') {
        progress = 100;
        currentStatus = 'generating'; // Генерация запускается сразу после тренировки на вебхуке
    } else if (training.status === 'failed' || training.status === 'canceled') {
        currentStatus = 'error';
    }

    // 4. Синхронизируем базу, если статус изменился
    if (currentStatus !== photoshoot.status) {
        const updated = await updatePhotoshootStatus(supabase, photoshootId, currentStatus);
        if (!updated) {
          currentStatus = photoshoot.status;
        }
    }

    return NextResponse.json({ 
        status: currentStatus, 
        progress,
        replicateStatus: training.status 
    });

  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
