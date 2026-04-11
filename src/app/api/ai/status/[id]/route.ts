import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import Replicate from "replicate";
import fs from 'fs';
import path from 'path';

// Функция для гарантированного получения ключа напрямую из файла (обход глюков кеша VPS)
function getReliableToken(): string | undefined {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.startsWith('REPLICATE_API_TOKEN=')) {
          return line.split('=')[1]?.trim();
        }
      }
    }
  } catch (err) {
    console.error('[Diagnostic] Error reading .env.local manually:', err);
  }
  return process.env.REPLICATE_API_TOKEN;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const photoshootId = params.id;
    const supabase = await createClient();
    
    const replicate = new Replicate({
      auth: getReliableToken(),
    });

    // 1. Получаем запись из базы
    const { data: photoshoot, error: dbError } = await supabase
      .from('photoshoots')
      .select('status, training_id')
      .eq('id', photoshootId)
      .single();

    if (dbError || !photoshoot) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Если обучение еще не привязано, возвращаем текущий статус из базы
    if (!photoshoot.training_id) {
       return NextResponse.json({ status: photoshoot.status, progress: 0 });
    }

    // 2. Опрашиваем Replicate
    const training = await replicate.trainings.get(photoshoot.training_id);
    
    // 3. Маппим статус Replicate на наш
    let currentStatus = photoshoot.status;
    let progress = 0;

    if (training.status === 'starting') {
        progress = 10;
    } else if (training.status === 'processing') {
        progress = 45; // В среднем обучение — это середина процесса
        currentStatus = 'training';
    } else if (training.status === 'succeeded') {
        progress = 100;
        currentStatus = 'completed';
    } else if (training.status === 'failed' || training.status === 'canceled') {
        currentStatus = 'error';
    }

    // 4. Синхронизируем базу, если статус изменился
    if (currentStatus !== photoshoot.status) {
        await supabase
          .from('photoshoots')
          .update({ status: currentStatus })
          .eq('id', photoshootId);
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
