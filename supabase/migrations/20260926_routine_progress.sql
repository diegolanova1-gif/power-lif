-- Avance automático del alumno por la rutina (semana/día actual).
-- Idempotente: se puede correr más de una vez.
--
-- Regla: cuando la sesión ACTUAL tiene al menos una serie guardada en cada ejercicio del día,
-- pasa al siguiente día del schedule; tras el último día, a la semana siguiente;
-- tras la última semana, la rutina queda 'completed'.
-- Guardar sesiones pasadas o futuras no mueve el puntero.

CREATE OR REPLACE FUNCTION public.advance_athlete_routine()
RETURNS TRIGGER AS $$
DECLARE
  ar RECORD;
  exercises_in_day INT;
  exercises_logged INT;
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

  SELECT COUNT(DISTINCT e->>'exercise_id')
    INTO exercises_in_day
    FROM jsonb_array_elements(ar.structure->'schedule') d,
         jsonb_array_elements(d->'exercises') e
   WHERE (d->>'day')::INT = NEW.day;

  SELECT COUNT(DISTINCT exercise_id)
    INTO exercises_logged
    FROM sets_log
   WHERE athlete_routine_id = NEW.athlete_routine_id
     AND week = NEW.week
     AND day = NEW.day;

  IF exercises_in_day = 0 OR exercises_logged < exercises_in_day THEN
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

DROP TRIGGER IF EXISTS sets_log_advance_routine ON sets_log;
CREATE TRIGGER sets_log_advance_routine
  AFTER INSERT OR UPDATE OF exercise_id, week, day ON sets_log
  FOR EACH ROW EXECUTE FUNCTION public.advance_athlete_routine();
