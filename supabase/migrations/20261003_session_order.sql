-- Progreso 2026-10-03: el alumno entrena los días reales que elige, pero las
-- sesiones (día 1, día 2, día 3...) se hacen EN ORDEN dentro de cada semana,
-- no por día de calendario. Hoy nada lo impide: se puede loguear el día 3
-- sin haber completado el día 1. Este trigger lo bloquea.
-- Idempotente: se puede correr más de una vez.

CREATE OR REPLACE FUNCTION public.enforce_session_order()
RETURNS TRIGGER AS $$
DECLARE
  structure JSONB;
  week_schedule JSONB;
  earlier_day INT;
  incomplete BOOLEAN;
BEGIN
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

  -- Every scheduled day of THIS week that comes before NEW.day in order.
  -- Scoped to the same week on purpose: starting next week early (before
  -- finishing every day of the current one) is a separate, deliberate flow,
  -- not an ordering violation.
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

DROP TRIGGER IF EXISTS sets_log_enforce_order ON sets_log;
CREATE TRIGGER sets_log_enforce_order
  BEFORE INSERT ON sets_log
  FOR EACH ROW EXECUTE FUNCTION public.enforce_session_order();
