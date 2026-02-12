-- Create event templates system
-- This migration adds support for creating and using event templates

-- Create event_templates table
CREATE TABLE IF NOT EXISTS event_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event_template_details table to store the actual template data
CREATE TABLE IF NOT EXISTS event_template_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES event_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  sms_enabled BOOLEAN DEFAULT true,
  day_before_time TEXT DEFAULT '09:00',
  day_of_time TEXT DEFAULT '15:00',
  marketing_level TEXT CHECK (marketing_level IN ('low', 'medium', 'high')),
  age_groups TEXT[],
  tone TEXT CHECK (tone IN ('formal', 'casual', 'fun')),
  expected_attendance INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event_template_itineraries table
CREATE TABLE IF NOT EXISTS event_template_itineraries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES event_templates(id) ON DELETE CASCADE,
  time_slot TEXT NOT NULL,
  activity TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event_template_volunteer_roles table
CREATE TABLE IF NOT EXISTS event_template_volunteer_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES event_templates(id) ON DELETE CASCADE,
  role_label TEXT NOT NULL,
  shift_start TEXT NOT NULL,
  shift_end TEXT NOT NULL,
  slots_brother INTEGER DEFAULT 0,
  slots_sister INTEGER DEFAULT 0,
  suggested_poc TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event_template_pre_event_tasks table
CREATE TABLE IF NOT EXISTS event_template_pre_event_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES event_templates(id) ON DELETE CASCADE,
  task_description TEXT NOT NULL,
  assigned_to TEXT,
  due_date_offset_days INTEGER DEFAULT 0, -- Days before event
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_templates_user_id ON event_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_event_templates_is_public ON event_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_event_template_details_template_id ON event_template_details(template_id);
CREATE INDEX IF NOT EXISTS idx_event_template_itineraries_template_id ON event_template_itineraries(template_id);
CREATE INDEX IF NOT EXISTS idx_event_template_volunteer_roles_template_id ON event_template_volunteer_roles(template_id);
CREATE INDEX IF NOT EXISTS idx_event_template_pre_event_tasks_template_id ON event_template_pre_event_tasks(template_id);

-- Enable RLS on all template tables
ALTER TABLE event_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_template_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_template_itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_template_volunteer_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_template_pre_event_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for event_templates
CREATE POLICY "Users can view their own templates and public templates" ON event_templates
  FOR SELECT USING (
    user_id = auth.uid() OR is_public = true
  );

CREATE POLICY "Users can create their own templates" ON event_templates
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own templates" ON event_templates
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own templates" ON event_templates
  FOR DELETE USING (user_id = auth.uid());

-- RLS policies for event_template_details
CREATE POLICY "Users can view template details for templates they own or are public" ON event_template_details
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_templates 
      WHERE id = template_id AND (user_id = auth.uid() OR is_public = true)
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

-- RLS policies for event_template_itineraries
CREATE POLICY "Users can view template itineraries for templates they own or are public" ON event_template_itineraries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_templates 
      WHERE id = template_id AND (user_id = auth.uid() OR is_public = true)
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

-- RLS policies for event_template_volunteer_roles
CREATE POLICY "Users can view template volunteer roles for templates they own or are public" ON event_template_volunteer_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_templates 
      WHERE id = template_id AND (user_id = auth.uid() OR is_public = true)
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

-- RLS policies for event_template_pre_event_tasks
CREATE POLICY "Users can view template pre-event tasks for templates they own or are public" ON event_template_pre_event_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_templates 
      WHERE id = template_id AND (user_id = auth.uid() OR is_public = true)
    )
  );

CREATE POLICY "Users can insert template pre-event tasks for templates they own" ON event_template_pre_event_tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM event_templates 
      WHERE id = template_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update template pre-event tasks for templates they own" ON event_template_pre_event_tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM event_templates 
      WHERE id = template_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete template pre-event tasks for templates they own" ON event_template_pre_event_tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM event_templates 
      WHERE id = template_id AND user_id = auth.uid()
    )
  );

-- Add triggers for updated_at columns
CREATE TRIGGER update_event_templates_updated_at 
  BEFORE UPDATE ON event_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_template_details_updated_at 
  BEFORE UPDATE ON event_template_details 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_template_pre_event_tasks_updated_at 
  BEFORE UPDATE ON event_template_pre_event_tasks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_template_itineraries_updated_at 
  BEFORE UPDATE ON event_template_itineraries 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample public templates
INSERT INTO event_templates (name, description, user_id, is_public) VALUES
  ('Community Gathering', 'A standard community gathering template with basic setup and volunteer roles', '00000000-0000-0000-0000-000000000000', true),
  ('Educational Workshop', 'Template for educational workshops with detailed itineraries', '00000000-0000-0000-0000-000000000000', true),
  ('Social Event', 'Casual social event template with minimal structure', '00000000-0000-0000-0000-000000000000', true);

-- Insert sample template details
INSERT INTO event_template_details (template_id, title, description, location, sms_enabled, day_before_time, day_of_time, marketing_level, age_groups, tone, expected_attendance) VALUES
  ((SELECT id FROM event_templates WHERE name = 'Community Gathering'), 'Community Gathering', 'A gathering for our community to come together, share experiences, and build connections.', 'Community Center', true, '19:00', '15:00', 'medium', ARRAY['all_ages'], 'casual', 50),
  ((SELECT id FROM event_templates WHERE name = 'Educational Workshop'), 'Educational Workshop', 'An interactive workshop designed to provide valuable knowledge and skills to participants.', 'Learning Center', true, '18:00', '14:00', 'high', ARRAY['adults', 'youth'], 'formal', 30),
  ((SELECT id FROM event_templates WHERE name = 'Social Event'), 'Social Event', 'A relaxed social gathering for community members to enjoy each other''s company.', 'Community Hall', true, '20:00', '16:00', 'low', ARRAY['all_ages'], 'fun', 40);

-- Insert sample itineraries
INSERT INTO event_template_itineraries (template_id, time_slot, activity, description, duration_minutes) VALUES
  ((SELECT id FROM event_templates WHERE name = 'Community Gathering'), '18:00', 'Setup & Preparation', 'Arrange venue, setup equipment, and prepare materials', 60),
  ((SELECT id FROM event_templates WHERE name = 'Community Gathering'), '19:00', 'Welcome & Introductions', 'Opening remarks and community introductions', 30),
  ((SELECT id FROM event_templates WHERE name = 'Community Gathering'), '19:30', 'Main Activity', 'Primary community activity or discussion', 90),
  ((SELECT id FROM event_templates WHERE name = 'Community Gathering'), '21:00', 'Closing & Cleanup', 'Wrap up and venue cleanup', 30);

-- Insert sample volunteer roles
INSERT INTO event_template_volunteer_roles (template_id, role_label, shift_start, shift_end, slots_brother, slots_sister, notes) VALUES
  ((SELECT id FROM event_templates WHERE name = 'Community Gathering'), 'Setup Coordinator', '17:00', '19:00', 1, 1, 'Oversees venue setup and preparation'),
  ((SELECT id FROM event_templates WHERE name = 'Community Gathering'), 'Greeter', '18:30', '19:30', 2, 2, 'Welcomes attendees and provides information'),
  ((SELECT id FROM event_templates WHERE name = 'Community Gathering'), 'Activity Facilitator', '19:00', '21:00', 1, 1, 'Leads main community activity'),
  ((SELECT id FROM event_templates WHERE name = 'Community Gathering'), 'Cleanup Coordinator', '20:30', '21:30', 1, 1, 'Oversees venue cleanup');

-- Insert sample pre-event tasks
INSERT INTO event_template_pre_event_tasks (template_id, task_description, assigned_to, due_date_offset_days, status) VALUES
  ((SELECT id FROM event_templates WHERE name = 'Community Gathering'), 'Secure venue booking', 'Event Coordinator', 7, 'pending'),
  ((SELECT id FROM event_templates WHERE name = 'Community Gathering'), 'Send out invitations', 'Marketing Team', 5, 'pending'),
  ((SELECT id FROM event_templates WHERE name = 'Community Gathering'), 'Prepare materials', 'Logistics Team', 2, 'pending'),
  ((SELECT id FROM event_templates WHERE name = 'Community Gathering'), 'Final volunteer confirmation', 'Volunteer Coordinator', 1, 'pending');
