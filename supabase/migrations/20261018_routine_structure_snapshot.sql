-- Snapshot routine structure at assignment time.
-- Edits to the base routine no longer break historical views.
ALTER TABLE athlete_routines ADD COLUMN structure jsonb;

UPDATE athlete_routines ar
SET structure = r.structure
FROM routines r
WHERE ar.routine_id = r.id;

ALTER TABLE athlete_routines ALTER COLUMN structure SET NOT NULL;
