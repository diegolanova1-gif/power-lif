-- Fase 2: observaciones + fotos/videos por ejercicio, y arreglos de sets_log.
-- Idempotente: se puede correr más de una vez.

-- 1. sets_log: la página del alumno hace upsert por esta clave; sin índice único Postgres lo rechaza
CREATE UNIQUE INDEX IF NOT EXISTS idx_sets_log_unique_set
  ON sets_log (athlete_routine_id, exercise_id, week, day, set_number);

-- 2. 1RM estimado automático al guardar series (levantamientos de competencia con RPE >= 7)
--    Epley ajustado por reps en reserva: peso * (1 + (reps + 10 - RPE) / 30)
CREATE OR REPLACE FUNCTION public.update_estimated_1rm()
RETURNS TRIGGER AS $$
DECLARE
  effective_reps NUMERIC;
BEGIN
  DELETE FROM estimated_1rm WHERE source_set_id = NEW.id;

  IF NEW.rpe IS NOT NULL AND NEW.rpe >= 7 AND NEW.reps > 0 AND NEW.weight_kg > 0
     AND EXISTS (SELECT 1 FROM exercises WHERE id = NEW.exercise_id AND is_competition_lift) THEN
    effective_reps := NEW.reps + (10 - NEW.rpe);
    INSERT INTO estimated_1rm (athlete_id, exercise_id, estimated_1rm, calculated_at, source_set_id)
    VALUES (
      NEW.athlete_id,
      NEW.exercise_id,
      ROUND(CASE WHEN effective_reps <= 1 THEN NEW.weight_kg
                 ELSE NEW.weight_kg * (1 + effective_reps / 30) END, 2),
      COALESCE(NEW.completed_at, now()),
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sets_log_estimated_1rm ON sets_log;
CREATE TRIGGER sets_log_estimated_1rm
  AFTER INSERT OR UPDATE OF weight_kg, reps, rpe, exercise_id ON sets_log
  FOR EACH ROW EXECUTE FUNCTION public.update_estimated_1rm();

-- Recalcular series ya cargadas (el trigger también corre en UPDATE OF rpe)
UPDATE sets_log SET rpe = rpe WHERE rpe >= 7;

-- 3. Observaciones del alumno por ejercicio y sesión (una por ejercicio/semana/día)
CREATE TABLE IF NOT EXISTS exercise_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  athlete_routine_id UUID NOT NULL REFERENCES athlete_routines(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  week INT NOT NULL,
  day INT NOT NULL,
  note TEXT,
  coach_reply TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (athlete_routine_id, exercise_id, week, day)
);

CREATE INDEX IF NOT EXISTS idx_exercise_feedback_athlete ON exercise_feedback(athlete_id);
CREATE INDEX IF NOT EXISTS idx_exercise_feedback_pending ON exercise_feedback(reviewed_at) WHERE reviewed_at IS NULL;

DROP TRIGGER IF EXISTS update_exercise_feedback_updated_at ON exercise_feedback;
CREATE TRIGGER update_exercise_feedback_updated_at
  BEFORE UPDATE ON exercise_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE exercise_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exercise_feedback_athlete_all" ON exercise_feedback;
CREATE POLICY "exercise_feedback_athlete_all" ON exercise_feedback
  FOR ALL USING (athlete_id = auth.uid()) WITH CHECK (athlete_id = auth.uid());

DROP POLICY IF EXISTS "exercise_feedback_coach_select" ON exercise_feedback;
CREATE POLICY "exercise_feedback_coach_select" ON exercise_feedback
  FOR SELECT USING (
    athlete_id IN (SELECT athlete_id FROM coach_athletes WHERE coach_id = auth.uid())
  );

DROP POLICY IF EXISTS "exercise_feedback_coach_update" ON exercise_feedback;
CREATE POLICY "exercise_feedback_coach_update" ON exercise_feedback
  FOR UPDATE USING (
    athlete_id IN (SELECT athlete_id FROM coach_athletes WHERE coach_id = auth.uid())
  );

-- 4. Fotos y videos adjuntos a cada observación
CREATE TABLE IF NOT EXISTS exercise_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES exercise_feedback(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_media_feedback ON exercise_media(feedback_id);

ALTER TABLE exercise_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exercise_media_athlete_all" ON exercise_media;
CREATE POLICY "exercise_media_athlete_all" ON exercise_media
  FOR ALL USING (athlete_id = auth.uid()) WITH CHECK (athlete_id = auth.uid());

DROP POLICY IF EXISTS "exercise_media_coach_select" ON exercise_media;
CREATE POLICY "exercise_media_coach_select" ON exercise_media
  FOR SELECT USING (
    athlete_id IN (SELECT athlete_id FROM coach_athletes WHERE coach_id = auth.uid())
  );

DROP POLICY IF EXISTS "exercise_media_coach_delete" ON exercise_media;
CREATE POLICY "exercise_media_coach_delete" ON exercise_media
  FOR DELETE USING (
    athlete_id IN (SELECT athlete_id FROM coach_athletes WHERE coach_id = auth.uid())
  );

-- 5. Bucket privado para los archivos (máx 50 MB, solo imágenes y videos)
--    Ruta: {athlete_id}/{feedback_id}/{archivo}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('exercise-media', 'exercise-media', false, 52428800, ARRAY['image/*', 'video/*'])
ON CONFLICT (id) DO UPDATE
  SET public = false, file_size_limit = 52428800, allowed_mime_types = ARRAY['image/*', 'video/*'];

DROP POLICY IF EXISTS "exercise_media_athlete_insert" ON storage.objects;
CREATE POLICY "exercise_media_athlete_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'exercise-media' AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "exercise_media_athlete_select" ON storage.objects;
CREATE POLICY "exercise_media_athlete_select" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'exercise-media' AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "exercise_media_athlete_delete" ON storage.objects;
CREATE POLICY "exercise_media_athlete_delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'exercise-media' AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "exercise_media_coach_select" ON storage.objects;
CREATE POLICY "exercise_media_coach_select" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'exercise-media'
    AND (storage.foldername(name))[1] IN (
      SELECT athlete_id::text FROM coach_athletes WHERE coach_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "exercise_media_coach_delete" ON storage.objects;
CREATE POLICY "exercise_media_coach_delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'exercise-media'
    AND (storage.foldername(name))[1] IN (
      SELECT athlete_id::text FROM coach_athletes WHERE coach_id = auth.uid()
    )
  );
