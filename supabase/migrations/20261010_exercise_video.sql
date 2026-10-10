-- Link de video de referencia por ejercicio (no por ocurrencia en una rutina
-- puntual): se carga una vez y se repite solo cada vez que se usa ese
-- ejercicio, en cualquier rutina.

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Hasta ahora no había ninguna policy de UPDATE sobre exercises (nadie podía
-- editar un ejercicio ya creado). Coaches pueden editar el video de los
-- suyos y de los globales (created_by NULL, el catálogo base).
DROP POLICY IF EXISTS "exercises_coach_update" ON exercises;
CREATE POLICY "exercises_coach_update" ON exercises
  FOR UPDATE USING (
    (created_by = auth.uid() OR created_by IS NULL)
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  ) WITH CHECK (
    (created_by = auth.uid() OR created_by IS NULL)
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );
