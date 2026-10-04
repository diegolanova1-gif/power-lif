-- Progreso 2026-10-04: sesión "día extra" (5to día) + ejercicios libres.
-- Idempotente: se puede correr más de una vez.

-- =====================================================================
-- 1. sets_log: distingue sesiones normales de las 3 variantes de "día
--    extra", y soporta ejercicios medidos en tiempo (sin series).
-- =====================================================================
ALTER TABLE sets_log DROP CONSTRAINT IF EXISTS sets_log_extra_type_check;
ALTER TABLE sets_log ADD COLUMN IF NOT EXISTS extra_type TEXT;
ALTER TABLE sets_log ADD CONSTRAINT sets_log_extra_type_check
  CHECK (extra_type IS NULL OR extra_type IN ('advance_credit', 'advance_no_credit', 'freeform'));

ALTER TABLE sets_log DROP CONSTRAINT IF EXISTS sets_log_duration_seconds_check;
ALTER TABLE sets_log ADD COLUMN IF NOT EXISTS duration_seconds INT;
ALTER TABLE sets_log ADD CONSTRAINT sets_log_duration_seconds_check CHECK (duration_seconds IS NULL OR duration_seconds > 0);

ALTER TABLE sets_log ALTER COLUMN reps DROP NOT NULL;
ALTER TABLE sets_log DROP CONSTRAINT IF EXISTS sets_log_reps_or_duration_check;
ALTER TABLE sets_log ADD CONSTRAINT sets_log_reps_or_duration_check CHECK (reps IS NOT NULL OR duration_seconds IS NOT NULL);

-- =====================================================================
-- 2. enforce_session_order: un ejercicio libre (extra_type='freeform') no
--    es progresión real de la rutina, nunca debe bloquearse por orden.
--    advance_credit / advance_no_credit no necesitan excepción: el chequeo
--    ya está acotado a "días anteriores de la MISMA semana", y el día 1 de
--    una semana siguiente nunca tiene un día anterior dentro de esa misma
--    semana, así que ya pasa solo.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.enforce_session_order()
RETURNS TRIGGER AS $$
DECLARE
  structure JSONB;
  week_schedule JSONB;
  earlier_day INT;
  incomplete BOOLEAN;
BEGIN
  IF NEW.extra_type = 'freeform' THEN
    RETURN NEW;
  END IF;

  SELECT r.structure INTO structure
    FROM athlete_routines a
    JOIN routines r ON r.id = a.routine_id
   WHERE a.id = NEW.athlete_routine_id;

  IF structure IS NULL THEN
    RETURN NEW;
  END IF;

  week_schedule := COALESCE(
    (SELECT p->'schedule'
       FROM jsonb_array_elements(COALESCE(structure->'week_plans', '[]'::JSONB)) p
      WHERE (p->>'week')::INT = NEW.week
      LIMIT 1),
    structure->'schedule'
  );

  FOR earlier_day IN
    SELECT (d->>'day')::INT FROM jsonb_array_elements(week_schedule) d
     WHERE (d->>'day')::INT < NEW.day
     ORDER BY 1
  LOOP
    SELECT EXISTS (
      SELECT 1
        FROM jsonb_array_elements(week_schedule) d, jsonb_array_elements(d->'exercises') e
       WHERE (d->>'day')::INT = earlier_day
         AND (
           SELECT COUNT(*) FROM sets_log s
            WHERE s.athlete_routine_id = NEW.athlete_routine_id
              AND s.week = NEW.week AND s.day = earlier_day
              AND s.exercise_id = (e->>'exercise_id')::UUID
         ) < (e->>'sets')::INT
    ) INTO incomplete;

    IF incomplete THEN
      RAISE EXCEPTION 'Completá primero la sesión del día % de esta semana antes de registrar el día %', earlier_day, NEW.day
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================================
-- 3. El alumno puede crear un ejercicio propio (para el ejercicio "aparte"
--    del día extra) — hoy solo el coach puede. Queda scopeado a sí mismo,
--    mismo patrón que ya usan los ejercicios custom del coach.
-- =====================================================================
DROP POLICY IF EXISTS "exercises_athlete_insert_own" ON exercises;
CREATE POLICY "exercises_athlete_insert_own" ON exercises
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND auth.uid() IN (SELECT id FROM profiles WHERE role = 'athlete')
  );

-- El coach necesita ver los ejercicios que sus alumnos crearon (si no, su
-- panel de seguimiento mostraría "Ejercicio" en vez del nombre real).
DROP POLICY IF EXISTS "exercises_select_visible" ON exercises;
CREATE POLICY "exercises_select_visible" ON exercises
  FOR SELECT USING (
    created_by IS NULL
    OR created_by = auth.uid()
    OR created_by IN (SELECT coach_id FROM coach_athletes WHERE athlete_id = auth.uid())
    OR created_by IN (SELECT athlete_id FROM coach_athletes WHERE coach_id = auth.uid())
  );
