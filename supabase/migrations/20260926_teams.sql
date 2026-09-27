-- Fase 4: teams de alumnos con ranking.
-- Privacidad: los compañeros NO leen tablas ajenas; solo ven estadísticas agregadas
-- a través de funciones SECURITY DEFINER que verifican pertenencia al team.
-- Idempotente: se puede correr más de una vez.

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (team_id, athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_teams_coach ON teams(coach_id);
CREATE INDEX IF NOT EXISTS idx_team_members_athlete ON team_members(athlete_id);

-- Helpers SECURITY DEFINER: evitan recursión de RLS al consultar team_members desde sus propias policies
CREATE OR REPLACE FUNCTION public.is_team_coach(p_team_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM teams WHERE id = p_team_id AND coach_id = auth.uid());
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM team_members WHERE team_id = p_team_id AND athlete_id = auth.uid());
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teams_coach_all" ON teams;
CREATE POLICY "teams_coach_all" ON teams
  FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS "teams_member_select" ON teams;
CREATE POLICY "teams_member_select" ON teams
  FOR SELECT USING (public.is_team_member(id));

-- Coach agrega solo a SUS alumnos, en SUS teams
DROP POLICY IF EXISTS "team_members_coach_select" ON team_members;
CREATE POLICY "team_members_coach_select" ON team_members
  FOR SELECT USING (public.is_team_coach(team_id));

DROP POLICY IF EXISTS "team_members_coach_insert" ON team_members;
CREATE POLICY "team_members_coach_insert" ON team_members
  FOR INSERT WITH CHECK (
    public.is_team_coach(team_id)
    AND athlete_id IN (SELECT athlete_id FROM coach_athletes WHERE coach_id = auth.uid())
  );

DROP POLICY IF EXISTS "team_members_coach_delete" ON team_members;
CREATE POLICY "team_members_coach_delete" ON team_members
  FOR DELETE USING (public.is_team_coach(team_id));

-- El alumno ve quiénes están en sus teams (solo ids; nombres vía funciones de abajo)
DROP POLICY IF EXISTS "team_members_member_select" ON team_members;
CREATE POLICY "team_members_member_select" ON team_members
  FOR SELECT USING (public.is_team_member(team_id));

-- Si el coach desvincula a un alumno, sale de sus teams
CREATE OR REPLACE FUNCTION public.remove_from_coach_teams()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM team_members tm
   USING teams t
   WHERE tm.team_id = t.id AND t.coach_id = OLD.coach_id AND tm.athlete_id = OLD.athlete_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS coach_athletes_remove_from_teams ON coach_athletes;
CREATE TRIGGER coach_athletes_remove_from_teams
  AFTER DELETE ON coach_athletes
  FOR EACH ROW EXECUTE FUNCTION public.remove_from_coach_teams();

-- 1RM estimado de una serie: Epley + reps en reserva (misma fórmula que update_estimated_1rm)
CREATE OR REPLACE FUNCTION public.set_e1rm(weight NUMERIC, reps INT, rpe NUMERIC)
RETURNS NUMERIC AS $$
  SELECT CASE
    WHEN reps + COALESCE(10 - rpe, 0) <= 1 THEN weight
    ELSE weight * (1 + (reps + COALESCE(10 - rpe, 0)) / 30.0)
  END;
$$ LANGUAGE sql IMMUTABLE;

-- Cambiar el tipo de retorno requiere recrear la función
DROP FUNCTION IF EXISTS public.team_exercise_bests(UUID);

-- Ranking: mejor 1RM estimado y serie más pesada por alumno y ejercicio
CREATE OR REPLACE FUNCTION public.team_exercise_bests(p_team_id UUID)
RETURNS TABLE (
  athlete_id UUID,
  full_name TEXT,
  exercise_id UUID,
  exercise_name TEXT,
  category TEXT,
  is_competition_lift BOOLEAN,
  best_e1rm NUMERIC,
  max_weight NUMERIC,
  last_logged TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT (public.is_team_coach(p_team_id) OR public.is_team_member(p_team_id)) THEN
    RAISE EXCEPTION 'No perteneces a este team' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT s.athlete_id, p.full_name, s.exercise_id, e.name, e.category, e.is_competition_lift,
         ROUND(MAX(public.set_e1rm(s.weight_kg, s.reps, s.rpe)), 1),
         MAX(s.weight_kg),
         MAX(s.completed_at)
    FROM team_members tm
    JOIN sets_log s ON s.athlete_id = tm.athlete_id
    JOIN profiles p ON p.id = s.athlete_id
    JOIN exercises e ON e.id = s.exercise_id
   WHERE tm.team_id = p_team_id AND s.reps > 0 AND s.weight_kg > 0
   GROUP BY s.athlete_id, p.full_name, s.exercise_id, e.name, e.category, e.is_competition_lift;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Progreso para comparar: mejor 1RM estimado por día, alumno, en un ejercicio
CREATE OR REPLACE FUNCTION public.team_e1rm_history(p_team_id UUID, p_exercise_id UUID)
RETURNS TABLE (athlete_id UUID, full_name TEXT, logged_on DATE, best_e1rm NUMERIC) AS $$
BEGIN
  IF NOT (public.is_team_coach(p_team_id) OR public.is_team_member(p_team_id)) THEN
    RAISE EXCEPTION 'No perteneces a este team' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT s.athlete_id, p.full_name, s.completed_at::DATE,
         ROUND(MAX(public.set_e1rm(s.weight_kg, s.reps, s.rpe)), 1)
    FROM team_members tm
    JOIN sets_log s ON s.athlete_id = tm.athlete_id
    JOIN profiles p ON p.id = s.athlete_id
   WHERE tm.team_id = p_team_id AND s.exercise_id = p_exercise_id AND s.reps > 0 AND s.weight_kg > 0
   GROUP BY s.athlete_id, p.full_name, s.completed_at::DATE
   ORDER BY 3;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Nombres de los miembros (sin exponer el resto del perfil)
CREATE OR REPLACE FUNCTION public.team_member_names(p_team_id UUID)
RETURNS TABLE (athlete_id UUID, full_name TEXT) AS $$
BEGIN
  IF NOT (public.is_team_coach(p_team_id) OR public.is_team_member(p_team_id)) THEN
    RAISE EXCEPTION 'No perteneces a este team' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT tm.athlete_id, p.full_name
    FROM team_members tm
    JOIN profiles p ON p.id = tm.athlete_id
   WHERE tm.team_id = p_team_id
   ORDER BY p.full_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.team_exercise_bests(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.team_e1rm_history(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.team_member_names(UUID) FROM anon;
