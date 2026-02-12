-- Fix RLS policies for events to properly handle soft deletes
-- The issue is that the RLS policies might not be working as expected

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view events they own or have access to" ON events;
DROP POLICY IF EXISTS "Users can view their own soft deleted events" ON events;

-- Create a more explicit policy for viewing non-deleted events
CREATE POLICY "Users can view non-deleted events they own or have access to" ON events
  FOR SELECT USING (
    deleted_at IS NULL AND (
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM event_shares 
        WHERE event_id = id AND shared_with = auth.uid()
      )
    )
  );

-- Create a separate policy for viewing soft deleted events (for recovery)
CREATE POLICY "Users can view their own soft deleted events for recovery" ON events
  FOR SELECT USING (
    deleted_at IS NOT NULL AND created_by = auth.uid()
  );

-- Ensure the update policy allows soft deletes
DROP POLICY IF EXISTS "Users can soft delete events they own" ON events;
CREATE POLICY "Users can soft delete events they own" ON events
  FOR UPDATE USING (
    created_by = auth.uid()
  );

-- Ensure the delete policy is restrictive (only for permanent deletion)
DROP POLICY IF EXISTS "Users can delete events they own" ON events;
CREATE POLICY "Users can permanently delete events they own" ON events
  FOR DELETE USING (
    created_by = auth.uid() AND deleted_at IS NOT NULL
  );
