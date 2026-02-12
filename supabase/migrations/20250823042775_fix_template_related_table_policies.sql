-- Fix RLS policies for template-related tables
-- The issue is that when updating templates, we delete and recreate related data
-- but the policies are preventing the insert operations

-- Fix event_template_details policies
DROP POLICY IF EXISTS "Users can insert template details for templates they own" ON event_template_details;
DROP POLICY IF EXISTS "Users can update template details for templates they own" ON event_template_details;
DROP POLICY IF EXISTS "Users can delete template details for templates they own" ON event_template_details;

-- Recreate with proper logic
CREATE POLICY "Users can insert template details for templates they own" ON event_template_details
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM event_templates 
      WHERE id = template_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update template details for templates they own" ON event_template_details
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM event_templates 
      WHERE id = template_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete template details for templates they own" ON event_template_details
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM event_templates 
      WHERE id = template_id AND user_id = auth.uid()
    )
  );

-- Fix event_template_itineraries policies
DROP POLICY IF EXISTS "Users can insert template itineraries for templates they own" ON event_template_itineraries;
DROP POLICY IF EXISTS "Users can update template itineraries for templates they own" ON event_template_itineraries;
DROP POLICY IF EXISTS "Users can delete template itineraries for templates they own" ON event_template_itineraries;

-- Recreate with proper logic
CREATE POLICY "Users can insert template itineraries for templates they own" ON event_template_itineraries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM event_templates 
      WHERE id = template_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update template itineraries for templates they own" ON event_template_itineraries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM event_templates 
      WHERE id = template_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete template itineraries for templates they own" ON event_template_itineraries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM event_templates 
      WHERE id = template_id AND user_id = auth.uid()
    )
  );

-- Fix event_template_volunteer_roles policies
DROP POLICY IF EXISTS "Users can insert template volunteer roles for templates they own" ON event_template_volunteer_roles;
DROP POLICY IF EXISTS "Users can update template volunteer roles for templates they own" ON event_template_volunteer_roles;
DROP POLICY IF EXISTS "Users can delete template volunteer roles for templates they own" ON event_template_volunteer_roles;

-- Recreate with proper logic
CREATE POLICY "Users can insert template volunteer roles for templates they own" ON event_template_volunteer_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM event_templates 
      WHERE id = template_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update template volunteer roles for templates they own" ON event_template_volunteer_roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM event_templates 
      WHERE id = template_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete template volunteer roles for templates they own" ON event_template_volunteer_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM event_templates 
      WHERE id = template_id AND user_id = auth.uid()
    )
  );

-- Fix event_template_pre_event_tasks policies
DROP POLICY IF EXISTS "Users can insert template pre event tasks for templates they own" ON event_template_pre_event_tasks;
DROP POLICY IF EXISTS "Users can update template pre event tasks for templates they own" ON event_template_pre_event_tasks;
DROP POLICY IF EXISTS "Users can delete template pre event tasks for templates they own" ON event_template_pre_event_tasks;

-- Recreate with proper logic
CREATE POLICY "Users can insert template pre event tasks for templates they own" ON event_template_pre_event_tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM event_templates 
      WHERE id = template_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update template pre event tasks for templates they own" ON event_template_pre_event_tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM event_templates 
      WHERE id = template_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete template pre event tasks for templates they own" ON event_template_pre_event_tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM event_templates 
      WHERE id = template_id AND user_id = auth.uid()
    )
  );
