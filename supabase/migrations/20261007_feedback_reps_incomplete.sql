-- Nuevo motivo de observación generado por el sistema: hizo todas las series
-- pero no llegó a las reps/peso pedidos. Antes eso se mostraba como "Parcial"
-- aunque el ejercicio estaba hecho; ahora se marca "Hecho" y se avisa solo.

ALTER TABLE exercise_feedback DROP CONSTRAINT IF EXISTS exercise_feedback_reason_check;
ALTER TABLE exercise_feedback ADD CONSTRAINT exercise_feedback_reason_check
  CHECK (reason IN ('pain', 'fatigue', 'reps_incomplete', 'other'));
