-- Perfil del alumno: datos propios y lo que el coach debería saber
-- (lesiones, objetivo, disponibilidad, contacto de emergencia).
-- El alumno edita solo el suyo; el coach solo lee los de sus alumnos.
-- Idempotente: se puede correr más de una vez.

CREATE TABLE IF NOT EXISTS athlete_profile (
  athlete_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  birth_date DATE,
  sex TEXT CHECK (sex IN ('M', 'F')),
  height_cm NUMERIC(5, 1) CHECK (height_cm BETWEEN 100 AND 250),
  bodyweight_kg NUMERIC(5, 1) CHECK (bodyweight_kg BETWEEN 30 AND 300),
  phone TEXT CHECK (char_length(phone) <= 40),
  emergency_contact_name TEXT CHECK (char_length(emergency_contact_name) <= 80),
  emergency_contact_phone TEXT CHECK (char_length(emergency_contact_phone) <= 40),
  goal TEXT CHECK (char_length(goal) <= 500),
  experience TEXT CHECK (experience IN ('principiante', 'intermedio', 'avanzado')),
  days_per_week SMALLINT CHECK (days_per_week BETWEEN 1 AND 7),
  injuries TEXT CHECK (char_length(injuries) <= 1000),
  medical_notes TEXT CHECK (char_length(medical_notes) <= 1000),
  notes TEXT CHECK (char_length(notes) <= 1000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE athlete_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "athlete_profile_own" ON athlete_profile;
CREATE POLICY "athlete_profile_own" ON athlete_profile
  FOR ALL USING (athlete_id = auth.uid()) WITH CHECK (athlete_id = auth.uid());

DROP POLICY IF EXISTS "athlete_profile_coach_select" ON athlete_profile;
CREATE POLICY "athlete_profile_coach_select" ON athlete_profile
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_athletes ca
      WHERE ca.athlete_id = athlete_profile.athlete_id AND ca.coach_id = auth.uid()
    )
  );
