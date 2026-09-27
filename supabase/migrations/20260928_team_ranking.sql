-- Paso 2: ranking oficial por ejercicio líder, criterio combinado (60% actual + 40% progreso) y aprobación del coach.
-- El alumno solo ve el último ranking aprobado (nada en vivo); el coach calcula, revisa y aprueba.
-- Idempotente.

ALTER TABLE teams ADD COLUMN IF NOT EXISTS lead_exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS team_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  lead_exercise_id UUID NOT NULL REFERENCES exercises(id),
  calculated_by UUID NOT NULL REFERENCES profiles(id),
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  -- [{athlete_id, full_name, current_e1rm, first_e1rm, progress_pct, current_norm, progress_norm, score, rank}]
  entries JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_team_rankings_team ON team_rankings(team_id);
CREATE INDEX IF NOT EXISTS idx_team_rankings_approved ON team_rankings(team_id, approved_at DESC);

ALTER TABLE team_rankings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_rankings_coach_all" ON team_rankings;
CREATE POLICY "team_rankings_coach_all" ON team_rankings
  FOR ALL USING (public.is_team_coach(team_id)) WITH CHECK (public.is_team_coach(team_id));

-- El alumno solo lee lo aprobado de sus teams; nada en vivo
DROP POLICY IF EXISTS "team_rankings_member_select_approved" ON team_rankings;
CREATE POLICY "team_rankings_member_select_approved" ON team_rankings
  FOR SELECT USING (approved_at IS NOT NULL AND public.is_team_member(team_id));

-- Auditable: una vez aprobado, el snapshot queda congelado (no se puede editar ni desaprobar)
CREATE OR REPLACE FUNCTION public.protect_approved_ranking()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.approved_at IS NOT NULL THEN
    RAISE EXCEPTION 'Este ranking ya fue aprobado y no se puede modificar' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS team_rankings_protect_approved ON team_rankings;
CREATE TRIGGER team_rankings_protect_approved
  BEFORE UPDATE ON team_rankings
  FOR EACH ROW EXECUTE FUNCTION public.protect_approved_ranking();
