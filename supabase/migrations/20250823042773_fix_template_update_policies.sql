-- Fix conflicting template update policies
-- The issue is that the soft delete policy is too restrictive and prevents regular updates

-- Drop the conflicting policies
DROP POLICY IF EXISTS "Users can soft delete their own templates" ON event_templates;
DROP POLICY IF EXISTS "Users can soft delete templates they own" ON event_templates;

-- Recreate the original update policy that allows users to update their own templates
DROP POLICY IF EXISTS "Users can update their own templates" ON event_templates;
CREATE POLICY "Users can update their own templates" ON event_templates
  FOR UPDATE USING (user_id = auth.uid());

-- Create a specific policy for soft delete operations (only for the deleted_at field)
CREATE POLICY "Users can soft delete their own templates" ON event_templates
  FOR UPDATE USING (
    user_id = auth.uid() AND (
      -- Allow updates to deleted_at and deleted_by fields for soft delete
      (deleted_at IS NOT NULL AND deleted_by IS NOT NULL) OR
      -- Allow regular updates to other fields
      (deleted_at IS NULL)
    )
  );

-- Ensure the select policy works correctly
DROP POLICY IF EXISTS "Users can view their own templates and public templates" ON event_templates;
CREATE POLICY "Users can view their own templates and public templates" ON event_templates
  FOR SELECT USING (
    deleted_at IS NULL AND (
      user_id = auth.uid() OR is_public = true
    )
  );

-- Ensure the policy for viewing soft deleted templates exists
DROP POLICY IF EXISTS "Users can view their own soft deleted templates" ON event_templates;
CREATE POLICY "Users can view their own soft deleted templates" ON event_templates
  FOR SELECT USING (
    deleted_at IS NOT NULL AND user_id = auth.uid()
  );
