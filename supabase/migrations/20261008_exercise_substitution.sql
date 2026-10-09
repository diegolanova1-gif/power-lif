-- Permite reemplazar el ejercicio pautado por otro (ej. no puede hacer
-- sentadilla por una molestia, hace prensa en su lugar) desde "No pude
-- completarlo / cambié algo". Cuenta igual que el original para el orden,
-- la racha y el estado "Hecho" — solo cambia qué ejercicio hizo.

ALTER TABLE sets_log ADD COLUMN IF NOT EXISTS substituted_exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL;
