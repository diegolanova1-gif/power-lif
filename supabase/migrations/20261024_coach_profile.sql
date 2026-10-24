CREATE TABLE coach_profile (
  coach_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text,
  whatsapp text,
  city text,
  gym_name text,
  bio text,
  specialization text CHECK (specialization IS NULL OR specialization IN ('powerlifting', 'bodybuilding', 'fuerza_general', 'crossfit', 'otro')),
  years_experience smallint,
  certifications text,
  admin_notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE coach_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can read and update own profile"
  ON coach_profile FOR ALL
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Athletes can read their coach profile"
  ON coach_profile FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coach_athletes ca
      WHERE ca.coach_id = coach_profile.coach_id
      AND ca.athlete_id = auth.uid()
    )
  );

CREATE POLICY "Admins full access"
  ON coach_profile FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

GRANT ALL ON public.coach_profile TO authenticated, service_role;
