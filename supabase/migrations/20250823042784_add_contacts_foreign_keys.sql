-- Add foreign key constraints for contacts table
-- This migration adds the missing foreign key relationships that are expected by the TypeScript types

-- Add foreign key constraint for event_id
ALTER TABLE contacts 
ADD CONSTRAINT contacts_event_id_fkey 
FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;

-- Add foreign key constraint for role_id
ALTER TABLE contacts 
ADD CONSTRAINT contacts_role_id_fkey 
FOREIGN KEY (role_id) REFERENCES volunteer_roles(id) ON DELETE SET NULL;

-- Add comment to document the purpose
COMMENT ON CONSTRAINT contacts_event_id_fkey ON contacts IS 'Links contacts to events when they come from volunteer signups';
COMMENT ON CONSTRAINT contacts_role_id_fkey ON contacts IS 'Links contacts to volunteer roles when they come from volunteer signups';
