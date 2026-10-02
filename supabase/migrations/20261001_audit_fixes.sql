-- Auditoría 2026-10-01: fixes de base de datos.
-- Idempotente: se puede correr más de una vez.

-- =====================================================================
-- 1. Avance de rutina ESTRICTO: antes alcanzaba con loguear 1 serie de
--    cada ejercicio distinto para avanzar de día/semana. Ahora exige que
--    CADA ejercicio tenga todas sus series prescriptas logueadas — mismo
--    criterio que ya usa el frontend (src/lib/calculations/compliance.ts)
--    para marcar "Hecho". Antes los dos criterios podían contradecirse:
--    el alumno avanzaba de día sin haber completado todas las series.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.advance_athlete_routine()
RETURNS TRIGGER AS $$
DECLARE
  ar RECORD;
  week_schedule JSONB;
  exercises_in_day INT;
  day_complete BOOLEAN;
  next_day INT;
  first_day INT;
  total_weeks INT;
BEGIN
  SELECT a.id, a.current_week, a.current_day, r.structure
    INTO ar
    FROM athlete_routines a
    JOIN routines r ON r.id = a.routine_id
   WHERE a.id = NEW.athlete_routine_id AND a.status = 'active';

  IF NOT FOUND OR NEW.week <> ar.current_week OR NEW.day <> ar.current_day THEN
    RETURN NEW;
  END IF;

  week_schedule := COALESCE(
    (SELECT p->'schedule'
       FROM jsonb_array_elements(COALESCE(ar.structure->'week_plans', '[]'::JSONB)) p
      WHERE (p->>'week')::INT = NEW.week
      LIMIT 1),
    ar.structure->'schedule'
  );

  SELECT COUNT(*) INTO exercises_in_day
    FROM jsonb_array_elements(week_schedule) d,
         jsonb_array_elements(d->'exercises') e
   WHERE (d->>'day')::INT = NEW.day;

  IF exercises_in_day = 0 THEN
    RETURN NEW;
  END IF;

  -- No existe ningún ejercicio del día con menos series logueadas que las
  -- prescriptas => el día está completo de verdad (no solo "tocado").
  SELECT NOT EXISTS (
    SELECT 1
      FROM jsonb_array_elements(week_schedule) d,
           jsonb_array_elements(d->'exercises') e
     WHERE (d->>'day')::INT = NEW.day
       AND (
         SELECT COUNT(*) FROM sets_log s
          WHERE s.athlete_routine_id = NEW.athlete_routine_id
            AND s.week = NEW.week AND s.day = NEW.day
            AND s.exercise_id = (e->>'exercise_id')::UUID
       ) < (e->>'sets')::INT
  ) INTO day_complete;

  IF NOT day_complete THEN
    RETURN NEW;
  END IF;

  SELECT MIN((d->>'day')::INT) INTO next_day
    FROM jsonb_array_elements(ar.structure->'schedule') d
   WHERE (d->>'day')::INT > NEW.day;

  total_weeks := COALESCE((ar.structure->>'weeks')::INT, 1);

  IF next_day IS NOT NULL THEN
    UPDATE athlete_routines SET current_day = next_day WHERE id = ar.id;
  ELSIF NEW.week < total_weeks THEN
    SELECT MIN((d->>'day')::INT) INTO first_day
      FROM jsonb_array_elements(ar.structure->'schedule') d;
    UPDATE athlete_routines SET current_week = NEW.week + 1, current_day = first_day WHERE id = ar.id;
  ELSE
    UPDATE athlete_routines SET status = 'completed' WHERE id = ar.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================================
-- 2. sets_log: el coach solo necesita LEER las series de sus alumnos
--    (seguimiento/analytics). El FOR ALL anterior le permitía además
--    insertar/editar/borrar series directamente contra Postgres sin
--    pasar por ninguna pantalla ni quedar registrado en ningún lado.
-- =====================================================================
DROP POLICY IF EXISTS "sets_log_coach_all" ON sets_log;
CREATE POLICY "sets_log_coach_select" ON sets_log
  FOR SELECT USING (
    athlete_id IN (SELECT athlete_id FROM coach_athletes WHERE coach_id = auth.uid())
  );

-- =====================================================================
-- 3. Validación a nivel de base para sets_log (hoy el guardado real es
--    un upsert directo del cliente, sin pasar por ninguna validación de
--    servidor). Si ya existen filas que violan esto, el ALTER falla acá
--    abajo y hay que limpiarlas antes de re-correr esta sección.
-- =====================================================================
ALTER TABLE sets_log DROP CONSTRAINT IF EXISTS sets_log_weight_kg_check;
ALTER TABLE sets_log ADD CONSTRAINT sets_log_weight_kg_check CHECK (weight_kg >= 0);

ALTER TABLE sets_log DROP CONSTRAINT IF EXISTS sets_log_reps_check;
ALTER TABLE sets_log ADD CONSTRAINT sets_log_reps_check CHECK (reps >= 0);

ALTER TABLE sets_log DROP CONSTRAINT IF EXISTS sets_log_set_number_check;
ALTER TABLE sets_log ADD CONSTRAINT sets_log_set_number_check CHECK (set_number >= 1);

ALTER TABLE sets_log DROP CONSTRAINT IF EXISTS sets_log_week_check;
ALTER TABLE sets_log ADD CONSTRAINT sets_log_week_check CHECK (week BETWEEN 1 AND 52);

ALTER TABLE sets_log DROP CONSTRAINT IF EXISTS sets_log_day_check;
ALTER TABLE sets_log ADD CONSTRAINT sets_log_day_check CHECK (day BETWEEN 1 AND 7);

-- =====================================================================
-- 4. profiles.email: antes el propio usuario lo podía editar libremente,
--    sin quedar ligado al email real de auth.users. Eso facilitaba que
--    alguien se hiciera pasar por otra persona frente a la búsqueda por
--    email que hace el alta de alumnos. Mismo patrón que ya protege
--    is_admin/plan/student_limit/active.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.protect_profile_admin_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (
       NEW.is_admin IS DISTINCT FROM OLD.is_admin
    OR NEW.plan IS DISTINCT FROM OLD.plan
    OR NEW.student_limit IS DISTINCT FROM OLD.student_limit
    OR NEW.active IS DISTINCT FROM OLD.active
    OR NEW.email IS DISTINCT FROM OLD.email
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para cambiar ese campo de tu cuenta' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =====================================================================
-- 5. Ejercicios custom: evita que un mismo coach termine con dos
--    ejercicios propios de igual nombre (no afecta al catálogo global,
--    que ya tiene su propio índice único). Si ya hay duplicados por
--    coach, este CREATE falla y hay que fusionarlos antes de re-correr.
-- =====================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_coach_name
  ON exercises (created_by, lower(name)) WHERE created_by IS NOT NULL;

-- =====================================================================
-- 6. El catálogo global de ejercicios no necesita ser legible por
--    visitantes sin sesión (la app entera requiere login salvo /login).
-- =====================================================================
REVOKE ALL ON exercises FROM anon;

-- =====================================================================
-- 7. Bug preexistente encontrado al verificar el punto 4: CUALQUIER
--    auto-actualización de perfil (hasta cambiar el nombre) tiraba
--    "infinite recursion detected in policy for relation profiles".
--    Causa: el WITH CHECK de profiles_update_own hace un SELECT sobre la
--    propia tabla profiles dentro de su propia policy de UPDATE, lo que
--    Postgres detecta como recursión. Mismo problema (y mismo arreglo)
--    que ya se resolvió para routines/athlete_routines en
--    20260927_fix_policy_recursion.sql: mover el lookup a una función
--    SECURITY DEFINER, que no reactiva RLS al consultar.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = public.current_profile_role()
  );
