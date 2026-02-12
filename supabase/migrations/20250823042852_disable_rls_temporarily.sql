-- Temporarily disable RLS to test if that's causing the 406 errors
-- This is a diagnostic migration to isolate the issue

-- Disable RLS on all main tables temporarily
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers DISABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON TABLE events IS 'RLS temporarily disabled for 406 error diagnosis';
COMMENT ON TABLE contacts IS 'RLS temporarily disabled for 406 error diagnosis';
COMMENT ON TABLE volunteer_roles IS 'RLS temporarily disabled for 406 error diagnosis';
COMMENT ON TABLE volunteers IS 'RLS temporarily disabled for 406 error diagnosis';
