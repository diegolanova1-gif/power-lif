-- Progreso 2026-10-06: logros mixtos (no solo por días) — "primera semana
-- completa" y "primer mes de constancia" además de los hitos de racha.
-- Sin filas reales todavía (feature recién lanzada), así que el cambio de
-- tipo es seguro. Idempotente.

ALTER TABLE streak_achievements DROP CONSTRAINT IF EXISTS streak_achievements_milestone_check;
ALTER TABLE streak_achievements ALTER COLUMN milestone TYPE TEXT USING milestone::TEXT;
