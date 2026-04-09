-- 1. Таблица для хранения фотосессий
CREATE TABLE IF NOT EXISTS photoshoots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  style_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, training, generating, completed, error
  images TEXT[] DEFAULT '{}', -- Список ссылок на загруженные селфи
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
