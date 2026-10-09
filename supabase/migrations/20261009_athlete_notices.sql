-- Avisos únicos por alumno: un mensaje que se muestra una sola vez al
-- ingresar y queda guardado como ya visto para siempre. Pensado para notas
-- puntuales (no un sistema de anuncios general).

CREATE TABLE IF NOT EXISTS athlete_notices (
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notice_key TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (athlete_id, notice_key)
);

ALTER TABLE athlete_notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "athlete_notices_own" ON athlete_notices;
CREATE POLICY "athlete_notices_own" ON athlete_notices
  FOR ALL USING (athlete_id = auth.uid()) WITH CHECK (athlete_id = auth.uid());
