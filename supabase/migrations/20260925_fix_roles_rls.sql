-- Fix: roles, email en profiles, RLS faltantes y hueco multi-tenant.
-- Idempotente: se puede correr en el SQL Editor sobre una base ya creada con schema.sql.

-- 1. Email en profiles (la lista de atletas lo necesita)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
UPDATE profiles p SET email = u.email FROM auth.users u WHERE u.id = p.id AND p.email IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(lower(email));

-- 2. Trigger respeta el role de la metadata (invitaciones = athlete, signup = coach)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, email)
  VALUES (
    NEW.id,
    CASE WHEN NEW.raw_user_meta_data->>'role' = 'athlete' THEN 'athlete' ELSE 'coach' END,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Usuario no puede cambiar su propio role
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
  );

-- 4. coach_athletes: el vínculo solo se crea server-side (service role).
--    Antes un coach podía insertar cualquier athlete_id y leer sus datos.
DROP POLICY IF EXISTS "coach_athletes_coach_all" ON coach_athletes;
DROP POLICY IF EXISTS "coach_athletes_coach_select" ON coach_athletes;
DROP POLICY IF EXISTS "coach_athletes_coach_delete" ON coach_athletes;
CREATE POLICY "coach_athletes_coach_select" ON coach_athletes
  FOR SELECT USING (coach_id = auth.uid());
CREATE POLICY "coach_athletes_coach_delete" ON coach_athletes
  FOR DELETE USING (coach_id = auth.uid());

-- 5. athlete_routines: coach puede asignar rutinas propias a sus atletas
DROP POLICY IF EXISTS "athlete_routines_coach_insert" ON athlete_routines;
CREATE POLICY "athlete_routines_coach_insert" ON athlete_routines
  FOR INSERT WITH CHECK (
    athlete_id IN (SELECT athlete_id FROM coach_athletes WHERE coach_id = auth.uid())
    AND routine_id IN (SELECT id FROM routines WHERE coach_id = auth.uid())
  );

-- 6. estimated_1rm: faltaba INSERT (logSet fallaba en silencio)
DROP POLICY IF EXISTS "estimated_1rm_athlete_insert" ON estimated_1rm;
CREATE POLICY "estimated_1rm_athlete_insert" ON estimated_1rm
  FOR INSERT WITH CHECK (athlete_id = auth.uid());

DROP POLICY IF EXISTS "estimated_1rm_coach_insert" ON estimated_1rm;
CREATE POLICY "estimated_1rm_coach_insert" ON estimated_1rm
  FOR INSERT WITH CHECK (
    athlete_id IN (SELECT athlete_id FROM coach_athletes WHERE coach_id = auth.uid())
  );
