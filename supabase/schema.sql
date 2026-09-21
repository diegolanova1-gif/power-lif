-- Powerlifting Coach Platform - Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations (for future gym/team support)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('coach', 'athlete')),
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Coach-Athlete Relationship (multi-tenant isolation)
CREATE TABLE IF NOT EXISTS coach_athletes (
  coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (coach_id, athlete_id)
);

-- 4. Routines (coach-defined templates)
CREATE TABLE IF NOT EXISTS routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_template BOOLEAN DEFAULT true,
  structure JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Athlete Routines (assigned instances)
CREATE TABLE IF NOT EXISTS athlete_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  routine_id UUID REFERENCES routines(id) ON DELETE CASCADE,
  started_at DATE DEFAULT CURRENT_DATE,
  current_week INT DEFAULT 1,
  current_day INT DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  assigned_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Exercises Catalog (shared library)
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('squat', 'bench', 'deadlift', 'accessory', 'olympic', 'other')),
  muscle_groups TEXT[],
  is_competition_lift BOOLEAN DEFAULT false
);

-- 7. Sets Log (core tracking)
CREATE TABLE IF NOT EXISTS sets_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  athlete_routine_id UUID REFERENCES athlete_routines(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  week INT NOT NULL,
  day INT NOT NULL,
  set_number INT NOT NULL,
  weight_kg DECIMAL(6,2) NOT NULL,
  reps INT NOT NULL,
  rpe DECIMAL(2,1),
  rir DECIMAL(2,1),
  completed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

-- 8. Estimated 1RM (materialized for fast queries)
CREATE TABLE IF NOT EXISTS estimated_1rm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  estimated_1rm DECIMAL(6,2) NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  source_set_id UUID REFERENCES sets_log(id) ON DELETE SET NULL
);

-- 9. Bodyweight Log (for IPF/DOTS/Wilks)
CREATE TABLE IF NOT EXISTS bodyweight_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  weight_kg DECIMAL(5,2) NOT NULL,
  logged_at DATE DEFAULT CURRENT_DATE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_coach_athletes_coach ON coach_athletes(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_athletes_athlete ON coach_athletes(athlete_id);
CREATE INDEX IF NOT EXISTS idx_routines_coach ON routines(coach_id);
CREATE INDEX IF NOT EXISTS idx_athlete_routines_athlete ON athlete_routines(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_routines_status ON athlete_routines(status);
CREATE INDEX IF NOT EXISTS idx_sets_log_athlete ON sets_log(athlete_id);
CREATE INDEX IF NOT EXISTS idx_sets_log_routine ON sets_log(athlete_routine_id);
CREATE INDEX IF NOT EXISTS idx_sets_log_exercise ON sets_log(exercise_id);
CREATE INDEX IF NOT EXISTS idx_sets_log_completed ON sets_log(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_estimated_1rm_athlete ON estimated_1rm(athlete_id);
CREATE INDEX IF NOT EXISTS idx_estimated_1rm_exercise ON estimated_1rm(exercise_id);
CREATE INDEX IF NOT EXISTS idx_bodyweight_athlete ON bodyweight_log(athlete_id);

-- GIN index for JSONB routine structure queries
CREATE INDEX IF NOT EXISTS idx_routines_structure_gin ON routines USING GIN (structure);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimated_1rm ENABLE ROW LEVEL SECURITY;
ALTER TABLE bodyweight_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: Users see own profile + coach sees their athletes
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (
    id = auth.uid() 
    OR id IN (SELECT athlete_id FROM coach_athletes WHERE coach_id = auth.uid())
  );

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Coach-Athletes: Coach manages their relationships
CREATE POLICY "coach_athletes_coach_all" ON coach_athletes
  FOR ALL USING (coach_id = auth.uid());

-- Athletes can see their own coach relationship
CREATE POLICY "coach_athletes_athlete_select" ON coach_athletes
  FOR SELECT USING (athlete_id = auth.uid());

-- Routines: Coach manages own routines
CREATE POLICY "routines_coach_all" ON routines
  FOR ALL USING (coach_id = auth.uid());

-- Athletes can see assigned routines
CREATE POLICY "routines_athlete_select" ON routines
  FOR SELECT USING (
    id IN (SELECT routine_id FROM athlete_routines WHERE athlete_id = auth.uid())
  );

-- Athlete Routines: Athlete sees own, coach sees their athletes'
CREATE POLICY "athlete_routines_athlete_select" ON athlete_routines
  FOR SELECT USING (athlete_id = auth.uid());

CREATE POLICY "athlete_routines_coach_select" ON athlete_routines
  FOR SELECT USING (
    athlete_id IN (SELECT athlete_id FROM coach_athletes WHERE coach_id = auth.uid())
  );

CREATE POLICY "athlete_routines_coach_update" ON athlete_routines
  FOR UPDATE USING (
    athlete_id IN (SELECT athlete_id FROM coach_athletes WHERE coach_id = auth.uid())
  );

-- Sets Log: Athlete logs own, coach manages their athletes'
CREATE POLICY "sets_log_athlete_all" ON sets_log
  FOR ALL USING (athlete_id = auth.uid());

CREATE POLICY "sets_log_coach_all" ON sets_log
  FOR ALL USING (
    athlete_id IN (SELECT athlete_id FROM coach_athletes WHERE coach_id = auth.uid())
  );

-- Estimated 1RM: Athlete sees own, coach sees their athletes'
CREATE POLICY "estimated_1rm_athlete_select" ON estimated_1rm
  FOR SELECT USING (athlete_id = auth.uid());

CREATE POLICY "estimated_1rm_coach_select" ON estimated_1rm
  FOR SELECT USING (
    athlete_id IN (SELECT athlete_id FROM coach_athletes WHERE coach_id = auth.uid())
  );

-- Bodyweight Log: Athlete manages own, coach sees their athletes'
CREATE POLICY "bodyweight_athlete_all" ON bodyweight_log
  FOR ALL USING (athlete_id = auth.uid());

CREATE POLICY "bodyweight_coach_select" ON bodyweight_log
  FOR SELECT USING (
    athlete_id IN (SELECT athlete_id FROM coach_athletes WHERE coach_id = auth.uid())
  );

-- Exercises: Everyone can read (shared catalog)
CREATE POLICY "exercises_select_all" ON exercises
  FOR SELECT USING (true);

-- Coaches can add exercises to catalog
CREATE POLICY "exercises_coach_insert" ON exercises
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'coach')
  );

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (NEW.id, 'coach', NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for routines updated_at
DROP TRIGGER IF EXISTS update_routines_updated_at ON routines;
CREATE TRIGGER update_routines_updated_at
  BEFORE UPDATE ON routines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed exercises
INSERT INTO exercises (name, category, muscle_groups, is_competition_lift) VALUES
  -- Competition lifts
  ('Sentadilla', 'squat', ARRAY['Cuádriceps', 'Glúteos', 'Core'], true),
  ('Press de Banca', 'bench', ARRAY['Pecho', 'Tríceps', 'Hombros'], true),
  ('Peso Muerto', 'deadlift', ARRAY['Espalda', 'Glúteos', 'Isquios', 'Core'], true),
  
  -- Squat variants
  ('Sentadilla Frontal', 'squat', ARRAY['Cuádriceps', 'Core'], false),
  ('Sentadilla con Pausa', 'squat', ARRAY['Cuádriceps', 'Glúteos'], false),
  ('Sentadilla en Caja', 'squat', ARRAY['Cuádriceps', 'Glúteos'], false),
  ('Sentadilla Búlgara', 'squat', ARRAY['Cuádriceps', 'Glúteos'], false),
  
  -- Bench variants
  ('Press Inclinado', 'bench', ARRAY['Pecho Superior', 'Tríceps', 'Hombros'], false),
  ('Press Declinado', 'bench', ARRAY['Pecho Inferior', 'Tríceps'], false),
  ('Press con Agarre Cerrado', 'bench', ARRAY['Tríceps', 'Pecho'], false),
  ('Press con Pausa', 'bench', ARRAY['Pecho', 'Tríceps'], false),
  ('Press con Mancuernas', 'bench', ARRAY['Pecho', 'Tríceps', 'Hombros'], false),
  
  -- Deadlift variants
  ('Peso Muerto Rumano', 'deadlift', ARRAY['Isquios', 'Glúteos', 'Espalda Baja'], false),
  ('Peso Muerto Sumo', 'deadlift', ARRAY['Glúteos', 'Isquios', 'Cuádriceps', 'Espalda'], false),
  ('Peso Muerto con Deficit', 'deadlift', ARRAY['Isquios', 'Glúteos', 'Espalda'], false),
  ('Peso Muerto en Bloque', 'deadlift', ARRAY['Espalda', 'Glúteos', 'Isquios'], false),
  
  -- Accessories
  ('Remo con Barra', 'accessory', ARRAY['Espalda', 'Bíceps'], false),
  ('Remo con Mancuerna', 'accessory', ARRAY['Espalda', 'Bíceps'], false),
  ('Dominadas', 'accessory', ARRAY['Espalda', 'Bíceps'], false),
  ('Jalón al Pecho', 'accessory', ARRAY['Espalda', 'Bíceps'], false),
  ('Face Pulls', 'accessory', ARRAY['Hombros Posteriores', 'Trapecio'], false),
  ('Elevaciones Laterales', 'accessory', ARRAY['Hombros Laterales'], false),
  ('Press Militar', 'accessory', ARRAY['Hombros', 'Tríceps'], false),
  ('Fondos en Paralelas', 'accessory', ARRAY['Pecho', 'Tríceps', 'Hombros'], false),
  ('Extensiones de Tríceps', 'accessory', ARRAY['Tríceps'], false),
  ('Curl de Bíceps', 'accessory', ARRAY['Bíceps'], false),
  ('Hip Thrust', 'accessory', ARRAY['Glúteos'], false),
  ('Zancadas', 'accessory', ARRAY['Cuádriceps', 'Glúteos'], false),
  ('Prensa de Piernas', 'accessory', ARRAY['Cuádriceps', 'Glúteos'], false),
  ('Curl Femoral', 'accessory', ARRAY['Isquios'], false),
  ('Extensión de Cuádriceps', 'accessory', ARRAY['Cuádriceps'], false),
  ('Plancha Abdominal', 'accessory', ARRAY['Core'], false),
  
  -- Olympic
  ('Arrancada', 'olympic', ARRAY['Cuerpo Completo'], false),
  ('Dos Tiempos', 'olympic', ARRAY['Cuerpo Completo'], false),
  ('Jerk', 'olympic', ARRAY['Hombros', 'Tríceps', 'Piernas'], false)
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;