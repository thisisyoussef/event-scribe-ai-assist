-- Remove unused fields from event_template_details table
-- These fields are no longer needed for templates: marketing_level, age_groups, tone, expected_attendance

ALTER TABLE event_template_details 
DROP COLUMN IF EXISTS marketing_level,
DROP COLUMN IF EXISTS age_groups,
DROP COLUMN IF EXISTS tone,
DROP COLUMN IF EXISTS expected_attendance;
