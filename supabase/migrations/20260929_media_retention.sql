-- Paso 3: retención de fotos/video. El archivo se borra del storage (no el registro)
-- cuando el coach revisó la observación, o a los 14 días si nadie la revisó.
-- Idempotente.

ALTER TABLE exercise_media ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_exercise_media_pending_retention
  ON exercise_media(created_at) WHERE deleted_at IS NULL;
