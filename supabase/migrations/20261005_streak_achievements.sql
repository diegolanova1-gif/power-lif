-- Progreso 2026-10-05: logros de racha (10/30/60/100 días) con sticker descargable.
-- Idempotente: se puede correr más de una vez.

CREATE TABLE IF NOT EXISTS streak_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  milestone INT NOT NULL CHECK (milestone > 0),
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (athlete_id, milestone)
);

CREATE INDEX IF NOT EXISTS idx_streak_achievements_athlete ON streak_achievements(athlete_id);

ALTER TABLE streak_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "streak_achievements_athlete_select" ON streak_achievements;
CREATE POLICY "streak_achievements_athlete_select" ON streak_achievements
  FOR SELECT USING (athlete_id = auth.uid());

DROP POLICY IF EXISTS "streak_achievements_coach_select" ON streak_achievements;
CREATE POLICY "streak_achievements_coach_select" ON streak_achievements
  FOR SELECT USING (
    athlete_id IN (SELECT athlete_id FROM coach_athletes WHERE coach_id = auth.uid())
  );

-- Unlocked server-side (API route, on behalf of the signed-in athlete) once
-- their computed streak crosses a milestone — never by the client directly.
DROP POLICY IF EXISTS "streak_achievements_athlete_insert" ON streak_achievements;
CREATE POLICY "streak_achievements_athlete_insert" ON streak_achievements
  FOR INSERT WITH CHECK (athlete_id = auth.uid());
