-- Ejercicios propios por coach + más ejercicios en el catálogo base.
-- Idempotente: se puede correr más de una vez.

-- 1. Ejercicios creados por un coach (NULL = catálogo global)
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_exercises_created_by ON exercises(created_by);

-- 2. Visibilidad: catálogo global + propios + los del coach del atleta
DROP POLICY IF EXISTS "exercises_select_all" ON exercises;
DROP POLICY IF EXISTS "exercises_select_visible" ON exercises;
CREATE POLICY "exercises_select_visible" ON exercises
  FOR SELECT USING (
    created_by IS NULL
    OR created_by = auth.uid()
    OR created_by IN (SELECT coach_id FROM coach_athletes WHERE athlete_id = auth.uid())
  );

-- 3. Solo coaches crean, y siempre a su nombre
DROP POLICY IF EXISTS "exercises_coach_insert" ON exercises;
CREATE POLICY "exercises_coach_insert" ON exercises
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND auth.uid() IN (SELECT id FROM profiles WHERE role = 'coach')
  );

-- 4. Nombres únicos en el catálogo global (evita duplicados al re-correr)
CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_global_name
  ON exercises (lower(name)) WHERE created_by IS NULL;

-- 5. Más ejercicios en el catálogo global
INSERT INTO exercises (name, category, muscle_groups, is_competition_lift) VALUES
  ('Sentadilla High Bar', 'squat', ARRAY['Cuádriceps', 'Glúteos', 'Core'], false),
  ('Sentadilla Low Bar', 'squat', ARRAY['Glúteos', 'Isquios', 'Espalda Baja'], false),
  ('Sentadilla con Safety Bar', 'squat', ARRAY['Cuádriceps', 'Espalda Alta', 'Core'], false),
  ('Sentadilla Tempo', 'squat', ARRAY['Cuádriceps', 'Glúteos'], false),
  ('Sentadilla Pin', 'squat', ARRAY['Cuádriceps', 'Glúteos'], false),
  ('Sentadilla Hack', 'squat', ARRAY['Cuádriceps'], false),
  ('Sentadilla Goblet', 'squat', ARRAY['Cuádriceps', 'Glúteos', 'Core'], false),
  ('Press Spoto', 'bench', ARRAY['Pecho', 'Tríceps'], false),
  ('Press Larsen', 'bench', ARRAY['Pecho', 'Tríceps', 'Hombros'], false),
  ('Press con Tablas', 'bench', ARRAY['Tríceps', 'Pecho'], false),
  ('Press Pin', 'bench', ARRAY['Tríceps', 'Pecho'], false),
  ('Press Tempo', 'bench', ARRAY['Pecho', 'Tríceps'], false),
  ('Press en el Suelo', 'bench', ARRAY['Tríceps', 'Pecho'], false),
  ('Press con Bandas', 'bench', ARRAY['Pecho', 'Tríceps', 'Hombros'], false),
  ('Peso Muerto con Pausa', 'deadlift', ARRAY['Espalda', 'Glúteos', 'Isquios'], false),
  ('Peso Muerto Sumo con Pausa', 'deadlift', ARRAY['Glúteos', 'Cuádriceps', 'Espalda'], false),
  ('Peso Muerto Tempo', 'deadlift', ARRAY['Espalda', 'Glúteos', 'Isquios'], false),
  ('Peso Muerto Piernas Rígidas', 'deadlift', ARRAY['Isquios', 'Espalda Baja'], false),
  ('Peso Muerto con Trap Bar', 'deadlift', ARRAY['Cuádriceps', 'Glúteos', 'Espalda'], false),
  ('Peso Muerto Rumano con Mancuernas', 'deadlift', ARRAY['Isquios', 'Glúteos'], false),
  ('Good Morning', 'deadlift', ARRAY['Isquios', 'Espalda Baja', 'Glúteos'], false),
  ('Remo Pendlay', 'accessory', ARRAY['Espalda', 'Bíceps'], false),
  ('Remo en Polea Baja', 'accessory', ARRAY['Espalda', 'Bíceps'], false),
  ('Remo en Máquina', 'accessory', ARRAY['Espalda', 'Bíceps'], false),
  ('Pull Over en Polea', 'accessory', ARRAY['Dorsales'], false),
  ('Encogimientos', 'accessory', ARRAY['Trapecio'], false),
  ('Hiperextensiones', 'accessory', ARRAY['Espalda Baja', 'Glúteos'], false),
  ('Press Militar con Mancuernas', 'accessory', ARRAY['Hombros', 'Tríceps'], false),
  ('Press Arnold', 'accessory', ARRAY['Hombros'], false),
  ('Pájaros', 'accessory', ARRAY['Hombros Posteriores'], false),
  ('Press Francés', 'accessory', ARRAY['Tríceps'], false),
  ('Extensión de Tríceps en Polea', 'accessory', ARRAY['Tríceps'], false),
  ('Fondos en Banco', 'accessory', ARRAY['Tríceps'], false),
  ('Curl Martillo', 'accessory', ARRAY['Bíceps', 'Antebrazo'], false),
  ('Curl Predicador', 'accessory', ARRAY['Bíceps'], false),
  ('Glute Ham Raise', 'accessory', ARRAY['Isquios', 'Glúteos'], false),
  ('Nordic Curl', 'accessory', ARRAY['Isquios'], false),
  ('Step Up', 'accessory', ARRAY['Cuádriceps', 'Glúteos'], false),
  ('Aductores en Máquina', 'accessory', ARRAY['Aductores'], false),
  ('Abductores en Máquina', 'accessory', ARRAY['Glúteo Medio'], false),
  ('Elevación de Gemelos', 'accessory', ARRAY['Gemelos'], false),
  ('Rueda Abdominal', 'accessory', ARRAY['Core'], false),
  ('Pallof Press', 'accessory', ARRAY['Core', 'Oblicuos'], false),
  ('Elevación de Piernas Colgado', 'accessory', ARRAY['Core'], false),
  ('Farmer Walk', 'accessory', ARRAY['Agarre', 'Trapecio', 'Core'], false)
ON CONFLICT DO NOTHING;
