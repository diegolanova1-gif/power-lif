-- Fix: "infinite recursion detected in policy for relation athlete_routines"
-- athlete_routines (INSERT check) -> routines (athlete SELECT policy) -> athlete_routines ...
-- The cross-table checks move into SECURITY DEFINER helpers, which don't re-enter RLS.
-- Idempotente: se puede correr más de una vez.

CREATE OR REPLACE FUNCTION public.is_routine_coach(p_routine_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM routines WHERE id = p_routine_id AND coach_id = auth.uid());
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.athlete_has_routine(p_routine_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM athlete_routines WHERE routine_id = p_routine_id AND athlete_id = auth.uid());
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Athletes see the routines assigned to them
DROP POLICY IF EXISTS "routines_athlete_select" ON routines;
CREATE POLICY "routines_athlete_select" ON routines
  FOR SELECT USING (public.athlete_has_routine(id));

-- Coach assigns their own routines to their own athletes
DROP POLICY IF EXISTS "athlete_routines_coach_insert" ON athlete_routines;
CREATE POLICY "athlete_routines_coach_insert" ON athlete_routines
  FOR INSERT WITH CHECK (
    athlete_id IN (SELECT athlete_id FROM coach_athletes WHERE coach_id = auth.uid())
    AND public.is_routine_coach(routine_id)
  );
