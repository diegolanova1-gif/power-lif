-- Membership billing period for coaches
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

-- Set existing coaches to 30 days from their creation
UPDATE profiles
SET current_period_end = created_at + interval '30 days'
WHERE role = 'coach' AND current_period_end IS NULL;
