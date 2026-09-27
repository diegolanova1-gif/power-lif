-- 1RM estimado también sin RPE (rutinas de hipertrofia casi nunca lo cargan).
-- Con RPE: Epley + reps en reserva (solo series exigentes, RPE >= 7).
-- Sin RPE: Epley sobre las reps hechas (asume serie cercana al fallo).
-- Idempotente: se puede correr más de una vez.

CREATE OR REPLACE FUNCTION public.update_estimated_1rm()
RETURNS TRIGGER AS $$
DECLARE
  effective_reps NUMERIC;
BEGIN
  DELETE FROM estimated_1rm WHERE source_set_id = NEW.id;

  IF (NEW.rpe IS NULL OR NEW.rpe >= 7) AND NEW.reps > 0 AND NEW.weight_kg > 0
     AND EXISTS (SELECT 1 FROM exercises WHERE id = NEW.exercise_id AND is_competition_lift) THEN
    effective_reps := NEW.reps + COALESCE(10 - NEW.rpe, 0);
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

-- Recalcular las series ya cargadas (el trigger corre en UPDATE OF rpe)
UPDATE sets_log SET rpe = rpe;
