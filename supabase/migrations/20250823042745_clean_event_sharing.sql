-- Clean event sharing migration - only essential tables
-- Create events table if it doesn't exist
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  sms_enabled BOOLEAN DEFAULT true,
  day_before_time TEXT DEFAULT '09:00',
  day_of_time TEXT DEFAULT '15:00',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event_shares table for managing event sharing
CREATE TABLE IF NOT EXISTS event_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL,
  shared_with UUID NOT NULL,
  permission_level TEXT NOT NULL CHECK (permission_level IN ('view', 'edit')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, shared_with)
);

-- Create profiles table for easier user lookup
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_event_shares_event_id ON event_shares(event_id);
CREATE INDEX IF NOT EXISTS idx_event_shares_shared_with ON event_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_event_shares_shared_by ON event_shares(shared_by);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);

-- Add RLS policies
ALTER TABLE event_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Event shares policies
CREATE POLICY "Users can view their own shares and shares shared with them" ON event_shares
  FOR SELECT USING (
    auth.uid() = shared_by OR auth.uid() = shared_with
  );

CREATE POLICY "Users can create shares for events they own" ON event_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update shares they created" ON event_shares
  FOR UPDATE USING (auth.uid() = shared_by);

CREATE POLICY "Users can delete shares they created" ON event_shares
  FOR DELETE USING (auth.uid() = shared_by);

-- Events policies
CREATE POLICY "Users can view events they own or have access to" ON events
  FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = id AND shared_with = auth.uid()
    )
  );

CREATE POLICY "Users can create events" ON events
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update events they own or have edit access to" ON events
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = id AND shared_with = auth.uid() AND permission_level = 'edit'
    )
  );

CREATE POLICY "Users can delete events they own" ON events
  FOR DELETE USING (created_by = auth.uid());

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_event_shares_updated_at 
  BEFORE UPDATE ON event_shares 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at 
  BEFORE UPDATE ON events 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


