-- Drop contacts with stats view
-- This migration was accidentally deleted and is being restored

-- Drop the view if it exists
DROP VIEW IF EXISTS contacts_with_stats;

-- Ensure we're using the column-based approach instead of views
