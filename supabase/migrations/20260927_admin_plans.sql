-- Paso 1: admin, planes y límite de alumnos por coach.
-- Idempotente: se puede correr más de una vez.

-- 1. Campos nuevos en profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'basic';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS student_limit INT DEFAULT 15; -- NULL = sin límite
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('basic', 'pro'));
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_student_limit_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_student_limit_check CHECK (student_limit IS NULL OR student_limit >= 0);

-- 2. Diego es admin
UPDATE profiles SET is_admin = true WHERE id = 'e8490ebd-7f14-47f5-85d6-55207bf58cf4';

-- 3. Nadie cambia por su cuenta is_admin / plan / límite / activo.
--    Solo el service role (API de admin, auth.uid() NULL) puede.
CREATE OR REPLACE FUNCTION public.protect_profile_admin_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (
       NEW.is_admin IS DISTINCT FROM OLD.is_admin
    OR NEW.plan IS DISTINCT FROM OLD.plan
    OR NEW.student_limit IS DISTINCT FROM OLD.student_limit
    OR NEW.active IS DISTINCT FROM OLD.active
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para cambiar el plan o el estado de la cuenta' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS profiles_protect_admin_fields ON profiles;
CREATE TRIGGER profiles_protect_admin_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_admin_fields();

-- 4. Límite de alumnos: se aplica en la base, no solo en la pantalla
CREATE OR REPLACE FUNCTION public.enforce_student_limit()
RETURNS TRIGGER AS $$
DECLARE
  max_students INT;
  current_count INT;
BEGIN
  SELECT student_limit INTO max_students FROM profiles WHERE id = NEW.coach_id;
  IF max_students IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO current_count FROM coach_athletes WHERE coach_id = NEW.coach_id;
  IF current_count >= max_students THEN
    RAISE EXCEPTION 'STUDENT_LIMIT_REACHED' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS coach_athletes_enforce_limit ON coach_athletes;
CREATE TRIGGER coach_athletes_enforce_limit
  BEFORE INSERT ON coach_athletes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_student_limit();
