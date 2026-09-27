-- Deshacer/editar series borra filas de sets_log: su 1RM estimado debe irse con ellas
-- (antes quedaba con source_set_id NULL y seguía apareciendo en analytics).
-- Idempotente: se puede correr más de una vez.

ALTER TABLE estimated_1rm DROP CONSTRAINT IF EXISTS estimated_1rm_source_set_id_fkey;
ALTER TABLE estimated_1rm
  ADD CONSTRAINT estimated_1rm_source_set_id_fkey
  FOREIGN KEY (source_set_id) REFERENCES sets_log(id) ON DELETE CASCADE;

-- Limpiar 1RM huérfanos de series ya borradas
DELETE FROM estimated_1rm WHERE source_set_id IS NULL;
