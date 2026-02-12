-- Create volunteer_signups table to track all volunteer signup history
-- This allows volunteers to sign up for multiple events/roles while maintaining contact history

CREATE TABLE IF NOT EXISTS volunteer_signups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES volunteer_roles(id) ON DELETE CASCADE,
  signup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_volunteer_signups_contact_id ON volunteer_signups(contact_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_signups_event_id ON volunteer_signups(event_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_signups_role_id ON volunteer_signups(role_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_signups_signup_date ON volunteer_signups(signup_date);

-- Add unique constraint to prevent duplicate signups for the same contact/event/role combination
ALTER TABLE volunteer_signups 
ADD CONSTRAINT unique_volunteer_signup UNIQUE (contact_id, event_id, role_id);

-- Enable RLS
ALTER TABLE volunteer_signups ENABLE ROW LEVEL SECURITY;

-- RLS policies for volunteer_signups
CREATE POLICY "Users can view volunteer signups for events they own or have access to" ON volunteer_signups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = volunteer_signups.event_id AND shared_with = auth.uid()
    )
  );

CREATE POLICY "Users can insert volunteer signups for events they own or have edit access to" ON volunteer_signups
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = volunteer_signups.event_id AND shared_with = auth.uid() AND permission_level = 'edit'
    )
  );

CREATE POLICY "Users can update volunteer signups for events they own or have edit access to" ON volunteer_signups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = volunteer_signups.event_id AND shared_with = auth.uid() AND permission_level = 'edit'
    )
  );

CREATE POLICY "Users can delete volunteer signups for events they own" ON volunteer_signups
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    )
  );

-- Add comment to document the purpose
COMMENT ON TABLE volunteer_signups IS 'Tracks all volunteer signup history for contacts across different events and roles';
COMMENT ON CONSTRAINT unique_volunteer_signup ON volunteer_signups IS 'Prevents duplicate signups for the same contact/event/role combination';
