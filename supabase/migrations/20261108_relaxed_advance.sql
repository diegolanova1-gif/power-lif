-- 2026-11-08: avance de día/semana relajado.
-- Antes: exigía 100% de series de cada ejercicio para avanzar.
-- Ahora: basta con que cada ejercicio del día tenga al menos 1 set registrado.
-- Completitud parcial (3 de 4 sets) se da por hecho y queda registrada
-- en las estadísticas con su porcentaje real.
-- Idempotente.

CREATE OR REPLACE FUNCTION public.advance_athlete_routine()
RETURNS TRIGGER AS $$
DECLARE
  ar RECORD;
  week_schedule JSONB;
  exercises_in_day INT;
  all_touched BOOLEAN;
  next_day INT;
  first_day INT;
  total_weeks INT;
BEGIN
  SELECT a.id, a.current_week, a.current_day, r.structure
    INTO ar
    FROM athlete_routines a
    JOIN routines r ON r.id = a.routine_id
   WHERE a.id = NEW.athlete_routine_id AND a.status = 'active';

  IF NOT FOUND OR NEW.week <> ar.current_week OR NEW.day <> ar.current_day THEN
    RETURN NEW;
  END IF;

  week_schedule := COALESCE(
    (SELECT p->'schedule'
       FROM jsonb_array_elements(COALESCE(ar.structure->'week_plans', '[]'::JSONB)) p
      WHERE (p->>'week')::INT = NEW.week
      LIMIT 1),
    ar.structure->'schedule'
  );

  SELECT COUNT(*) INTO exercises_in_day
    FROM jsonb_array_elements(week_schedule) d,
         jsonb_array_elements(d->'exercises') e
   WHERE (d->>'day')::INT = NEW.day;

  IF exercises_in_day = 0 THEN
    RETURN NEW;
  END IF;

  -- Cada ejercicio del día tiene al menos 1 set registrado = día tocado.
  -- No exigimos 100% de series: parcial es válido para avanzar.
  SELECT NOT EXISTS (
    SELECT 1
      FROM jsonb_array_elements(week_schedule) d,
           jsonb_array_elements(d->'exercises') e
     WHERE (d->>'day')::INT = NEW.day
       AND NOT EXISTS (
         SELECT 1 FROM sets_log s
          WHERE s.athlete_routine_id = NEW.athlete_routine_id
            AND s.week = NEW.week AND s.day = NEW.day
            AND s.exercise_id = (e->>'exercise_id')::UUID
       )
  ) INTO all_touched;

  IF NOT all_touched THEN
    RETURN NEW;
  END IF;

  SELECT MIN((d->>'day')::INT) INTO next_day
    FROM jsonb_array_elements(ar.structure->'schedule') d
   WHERE (d->>'day')::INT > NEW.day;

  total_weeks := COALESCE((ar.structure->>'weeks')::INT, 1);

  IF next_day IS NOT NULL THEN
    UPDATE athlete_routines SET current_day = next_day WHERE id = ar.id;
  ELSIF NEW.week < total_weeks THEN
    SELECT MIN((d->>'day')::INT) INTO first_day
      FROM jsonb_array_elements(ar.structure->'schedule') d;
    UPDATE athlete_routines SET current_week = NEW.week + 1, current_day = first_day WHERE id = ar.id;
  ELSE
    UPDATE athlete_routines SET status = 'completed' WHERE id = ar.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
