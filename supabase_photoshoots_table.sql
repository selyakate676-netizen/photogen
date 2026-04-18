-- Создание таблицы для фотосессий
CREATE TABLE photoshoots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  style_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, training, generating, ready, error
  images TEXT[] NOT NULL, -- Пути к исходным фото в S3
  result_images TEXT[] DEFAULT '{}', -- Готовые нейро-фото
  body_type TEXT DEFAULT 'average', -- Фигура
  eye_color TEXT DEFAULT 'brown', -- Цвет глаз
  hair_color TEXT DEFAULT 'dark', -- Цвет волос
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Настройка политик безопасности (RLS - Row Level Security)
ALTER TABLE photoshoots ENABLE ROW LEVEL SECURITY;

-- Пользователь может видеть только свои фотосессии
CREATE POLICY "Users can view own photoshoots" 
  ON photoshoots FOR SELECT 
  USING (auth.uid() = user_id);

-- Пользователь может создавать свои фотосессии
CREATE POLICY "Users can insert own photoshoots" 
  ON photoshoots FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Обновление только своих фотосессий (для статусов и готовых картинок) 
-- В идеале статусы должен обновлять только webhook сервера (service_role),
-- но для MVP мы делаем мягкую политику:
CREATE POLICY "Users can update own photoshoots" 
  ON photoshoots FOR UPDATE 
  USING (auth.uid() = user_id);
