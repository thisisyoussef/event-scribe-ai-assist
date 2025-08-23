-- Restore full schema with all necessary tables
-- This migration restores the complete working database structure

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'volunteer_signup')),
  event_id UUID,
  role_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create volunteer_roles table
CREATE TABLE IF NOT EXISTS volunteer_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  role_label TEXT NOT NULL,
  shift_start TEXT NOT NULL,
  shift_end TEXT NOT NULL,
  slots_brother INTEGER DEFAULT 0,
  slots_sister INTEGER DEFAULT 0,
  suggested_poc TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create volunteers table
CREATE TABLE IF NOT EXISTS volunteers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES volunteer_roles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('brother', 'sister')),
  notes TEXT,
  signup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled'))
);

-- Create additional_details table (if it was being used)
CREATE TABLE IF NOT EXISTS additional_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  marketing_level TEXT CHECK (marketing_level IN ('low', 'medium', 'high')),
  age_groups TEXT[],
  tone TEXT CHECK (tone IN ('formal', 'casual', 'fun')),
  expected_attendance INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pre_event_tasks table (if it was being used)
CREATE TABLE IF NOT EXISTS pre_event_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  task_description TEXT NOT NULL,
  assigned_to TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create itineraries table (if it was being used)
CREATE TABLE IF NOT EXISTS itineraries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  time_slot TEXT NOT NULL,
  activity TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source);
CREATE INDEX IF NOT EXISTS idx_contacts_event_id ON contacts(event_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_roles_event_id ON volunteer_roles(event_id);
CREATE INDEX IF NOT EXISTS idx_volunteers_event_id ON volunteers(event_id);
CREATE INDEX IF NOT EXISTS idx_volunteers_role_id ON volunteers(role_id);
CREATE INDEX IF NOT EXISTS idx_additional_details_event_id ON additional_details(event_id);
CREATE INDEX IF NOT EXISTS idx_pre_event_tasks_event_id ON pre_event_tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_event_id ON itineraries(event_id);

-- Add unique constraint for contacts (user_id + phone combination)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'unique_user_phone') THEN
    ALTER TABLE contacts ADD CONSTRAINT unique_user_phone UNIQUE (user_id, phone);
  END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE additional_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_event_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;

-- RLS policies for contacts
CREATE POLICY "Users can view their own contacts" ON contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contacts" ON contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts" ON contacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts" ON contacts
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for volunteer_roles
CREATE POLICY "Users can view volunteer roles for events they own or have access to" ON volunteer_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = volunteer_roles.event_id AND shared_with = auth.uid()
    )
  );

CREATE POLICY "Users can insert volunteer roles for events they own or have edit access to" ON volunteer_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = volunteer_roles.event_id AND shared_with = auth.uid() AND permission_level = 'edit'
    )
  );

CREATE POLICY "Users can update volunteer roles for events they own or have edit access to" ON volunteer_roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = volunteer_roles.event_id AND shared_with = auth.uid() AND permission_level = 'edit'
    )
  );

CREATE POLICY "Users can delete volunteer roles for events they own" ON volunteer_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    )
  );

-- RLS policies for volunteers
CREATE POLICY "Users can view volunteers for events they own or have access to" ON volunteers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = volunteers.event_id AND shared_with = auth.uid()
    )
  );

CREATE POLICY "Users can insert volunteers for events they own or have edit access to" ON volunteers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = volunteers.event_id AND shared_with = auth.uid() AND permission_level = 'edit'
    )
  );

CREATE POLICY "Users can update volunteers for events they own or have edit access to" ON volunteers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = volunteers.event_id AND shared_with = auth.uid() AND permission_level = 'edit'
    )
  );

CREATE POLICY "Users can delete volunteers for events they own or have edit access to" ON volunteers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = volunteers.event_id AND shared_with = auth.uid() AND permission_level = 'edit'
    )
  );

-- RLS policies for additional_details
CREATE POLICY "Users can view additional details for events they own or have access to" ON additional_details
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = additional_details.event_id AND shared_with = auth.uid()
    )
  );

CREATE POLICY "Users can insert additional details for events they own or have edit access to" ON additional_details
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = additional_details.event_id AND shared_with = auth.uid() AND permission_level = 'edit'
    )
  );

CREATE POLICY "Users can update additional details for events they own or have edit access to" ON additional_details
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = additional_details.event_id AND shared_with = auth.uid() AND permission_level = 'edit'
    )
  );

-- RLS policies for pre_event_tasks
CREATE POLICY "Users can view pre-event tasks for events they own or have access to" ON pre_event_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = pre_event_tasks.event_id AND shared_with = auth.uid()
    )
  );

CREATE POLICY "Users can insert pre-event tasks for events they own or have edit access to" ON pre_event_tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = pre_event_tasks.event_id AND shared_with = auth.uid() AND permission_level = 'edit'
    )
  );

CREATE POLICY "Users can update pre-event tasks for events they own or have edit access to" ON pre_event_tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = pre_event_tasks.event_id AND shared_with = auth.uid() AND permission_level = 'edit'
    )
  );

-- RLS policies for itineraries
CREATE POLICY "Users can view itineraries for events they own or have access to" ON itineraries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = itineraries.event_id AND shared_with = auth.uid()
    )
  );

CREATE POLICY "Users can insert itineraries for events they own or have edit access to" ON itineraries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = itineraries.event_id AND shared_with = auth.uid() AND permission_level = 'edit'
    )
  );

CREATE POLICY "Users can update itineraries for events they own or have edit access to" ON itineraries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = itineraries.event_id AND shared_with = auth.uid() AND permission_level = 'edit'
    )
  );

-- Add triggers for updated_at columns
CREATE TRIGGER update_contacts_updated_at 
  BEFORE UPDATE ON contacts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_additional_details_updated_at 
  BEFORE UPDATE ON additional_details 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pre_event_tasks_updated_at 
  BEFORE UPDATE ON pre_event_tasks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_itineraries_updated_at 
  BEFORE UPDATE ON itineraries 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
