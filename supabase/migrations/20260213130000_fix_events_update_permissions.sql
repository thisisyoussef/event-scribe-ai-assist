-- Fix: authenticated users cannot UPDATE events (status/is_public toggles return 0 rows)
-- This migration ensures UPDATE permissions are properly granted and the RLS policy allows updates.

-- Ensure RLS is enabled
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Grant full CRUD permissions to authenticated role on events table
GRANT SELECT, INSERT, UPDATE, DELETE ON events TO authenticated;

-- Drop any potentially conflicting update-specific policies
DROP POLICY IF EXISTS "Users can soft delete events they own" ON events;
DROP POLICY IF EXISTS "authenticated_can_update_any_active_event" ON events;

-- Recreate the permissive all-operations policy (in case it was dropped or corrupted)
DROP POLICY IF EXISTS "events_allow_all" ON events;
CREATE POLICY "events_allow_all" ON events
  FOR ALL USING (true) WITH CHECK (true);
