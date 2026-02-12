-- Add support for multiple coordinators per volunteer role
-- Change suggested_poc from TEXT to TEXT[] to allow multiple POCs

-- First, create a backup of existing data
CREATE TABLE IF NOT EXISTS volunteer_roles_backup AS 
SELECT * FROM volunteer_roles;

-- Update the suggested_poc column to support multiple coordinators
ALTER TABLE volunteer_roles 
ALTER COLUMN suggested_poc TYPE TEXT[] USING 
  CASE 
    WHEN suggested_poc IS NULL OR suggested_poc = '' THEN ARRAY[]::TEXT[]
    ELSE ARRAY[suggested_poc]::TEXT[]
  END;

-- Add a default empty array for new roles
ALTER TABLE volunteer_roles 
ALTER COLUMN suggested_poc SET DEFAULT ARRAY[]::TEXT[];

-- Create an index for efficient array operations
CREATE INDEX IF NOT EXISTS idx_volunteer_roles_suggested_poc 
ON volunteer_roles USING GIN (suggested_poc);

-- Update the type definition in the database
COMMENT ON COLUMN volunteer_roles.suggested_poc IS 'Array of coordinator names for this role';
