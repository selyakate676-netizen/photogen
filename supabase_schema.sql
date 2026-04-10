-- 1. Таблица для хранения фотосессий
CREATE TABLE IF NOT EXISTS photoshoots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  style_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, training, generating, completed, error
  images TEXT[] DEFAULT '{}', -- Список ссылок на загруженные селфи
  training_id TEXT, -- ID процесса тренировки в Replicate
  lora_url TEXT, -- Ссылка на обученные веса LoRA
  generation_id TEXT, -- ID процесса генерации в Replicate
  result_images TEXT[] DEFAULT '{}', -- Готовые сгенерированные фото
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Команды для обновления существующей базы данных (скопируйте и выполните в SQL Editor):
-- ALTER TABLE photoshoots ADD COLUMN training_id TEXT;
-- ALTER TABLE photoshoots ADD COLUMN lora_url TEXT;
-- ALTER TABLE photoshoots ADD COLUMN generation_id TEXT;
-- ALTER TABLE photoshoots ADD COLUMN result_images TEXT[] DEFAULT '{}';

-- 2. Включаем защиту (RLS)
ALTER TABLE photoshoots ENABLE ROW LEVEL SECURITY;

-- 3. Правила: пользователь видит только свои фотосессии
CREATE POLICY "Users can view their own photoshoots" 
ON photoshoots FOR SELECT 
USING (auth.uid() = user_id);

-- 4. Правила: пользователь может создавать свои фотосессии
CREATE POLICY "Users can create their own photoshoots" 
ON photoshoots FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 5. Правила: пользователь может обновлять свои записи (например, статус)
CREATE POLICY "Users can update their own photoshoots" 
ON photoshoots FOR UPDATE 
USING (auth.uid() = user_id);
