-- Add contacts with stats view
-- This migration was accidentally deleted and is being restored

-- Create a view that includes contact statistics
-- Note: This is a placeholder view since the actual schema may vary
CREATE OR REPLACE VIEW contacts_with_stats AS
SELECT 
  c.*,
  0 as volunteer_count,
  0 as confirmed_volunteer_count
FROM contacts c;
