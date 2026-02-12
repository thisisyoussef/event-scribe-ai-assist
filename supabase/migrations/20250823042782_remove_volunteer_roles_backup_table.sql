-- Remove volunteer_roles_backup table that has RLS disabled
-- This table was created as a temporary backup during the multiple coordinators migration
-- and is no longer needed, posing a security risk due to lack of RLS

-- Drop the backup table that has RLS disabled
DROP TABLE IF EXISTS volunteer_roles_backup;

-- Add comment explaining the security fix
COMMENT ON SCHEMA public IS 'Security fix: Removed volunteer_roles_backup table that had RLS disabled and was no longer needed';
