-- Restore proper security for templates
-- Now that updates are working, let's add back proper ownership-based access control

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "templates_select" ON event_templates;
DROP POLICY IF EXISTS "templates_insert" ON event_templates;
DROP POLICY IF EXISTS "templates_update" ON event_templates;
DROP POLICY IF EXISTS "templates_delete" ON event_templates;

DROP POLICY IF EXISTS "template_details_select" ON event_template_details;
DROP POLICY IF EXISTS "template_details_insert" ON event_template_details;
DROP POLICY IF EXISTS "template_details_update" ON event_template_details;
DROP POLICY IF EXISTS "template_details_delete" ON event_template_details;

DROP POLICY IF EXISTS "template_itineraries_select" ON event_template_itineraries;
DROP POLICY IF EXISTS "template_itineraries_insert" ON event_template_itineraries;
DROP POLICY IF EXISTS "template_itineraries_update" ON event_template_itineraries;
DROP POLICY IF EXISTS "template_itineraries_delete" ON event_template_itineraries;

DROP POLICY IF EXISTS "template_volunteer_roles_select" ON event_template_volunteer_roles;
DROP POLICY IF EXISTS "template_volunteer_roles_insert" ON event_template_volunteer_roles;
DROP POLICY IF EXISTS "template_volunteer_roles_update" ON event_template_volunteer_roles;
DROP POLICY IF EXISTS "template_volunteer_roles_delete" ON event_template_volunteer_roles;

DROP POLICY IF EXISTS "template_pre_event_tasks_select" ON event_template_pre_event_tasks;
DROP POLICY IF EXISTS "template_pre_event_tasks_insert" ON event_template_pre_event_tasks;
DROP POLICY IF EXISTS "template_pre_event_tasks_update" ON event_template_pre_event_tasks;
DROP POLICY IF EXISTS "template_pre_event_tasks_delete" ON event_template_pre_event_tasks;

-- Create secure, ownership-based policies for event_templates
CREATE POLICY "Users can view their own templates and public templates" ON event_templates
  FOR SELECT USING (
    deleted_at IS NULL AND (
      user_id = auth.uid() OR is_public = true
    )
  );

CREATE POLICY "Users can view their own soft deleted templates" ON event_templates
  FOR SELECT USING (
    deleted_at IS NOT NULL AND user_id = auth.uid()
  );

CREATE POLICY "Users can create their own templates" ON event_templates
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own templates" ON event_templates
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own templates" ON event_templates
  FOR DELETE USING (user_id = auth.uid());

-- Create secure policies for event_template_details
CREATE POLICY "Users can view template details for templates they own or are public" ON event_template_details
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_templates 
      WHERE id = template_id AND deleted_at IS NULL AND (user_id = auth.uid() OR is_public = true)
    )
  );

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

-- Create secure policies for event_template_itineraries
CREATE POLICY "Users can view template itineraries for templates they own or are public" ON event_template_itineraries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_templates 
      WHERE id = template_id AND deleted_at IS NULL AND (user_id = auth.uid() OR is_public = true)
    )
  );

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

-- Create secure policies for event_template_volunteer_roles
CREATE POLICY "Users can view template volunteer roles for templates they own or are public" ON event_template_volunteer_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_templates 
      WHERE id = template_id AND deleted_at IS NULL AND (user_id = auth.uid() OR is_public = true)
    )
  );

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

-- Create secure policies for event_template_pre_event_tasks
CREATE POLICY "Users can view template pre event tasks for templates they own or are public" ON event_template_pre_event_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_templates 
      WHERE id = template_id AND deleted_at IS NULL AND (user_id = auth.uid() OR is_public = true)
    )
  );

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

-- Remove the overly permissive grants and replace with proper ones
REVOKE ALL ON event_templates FROM authenticated;
REVOKE ALL ON event_template_details FROM authenticated;
REVOKE ALL ON event_template_itineraries FROM authenticated;
REVOKE ALL ON event_template_volunteer_roles FROM authenticated;
REVOKE ALL ON event_template_pre_event_tasks FROM authenticated;

-- Grant only the necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON event_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_template_details TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_template_itineraries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_template_volunteer_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_template_pre_event_tasks TO authenticated;
