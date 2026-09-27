-- Paso 5: motivo rápido y opcional cuando el alumno no completó tal cual (no bloquea el guardado).
-- Idempotente.

ALTER TABLE exercise_feedback ADD COLUMN IF NOT EXISTS reason TEXT CHECK (reason IN ('pain', 'fatigue', 'other'));
