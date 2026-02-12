-- Replace view with column
-- This migration was accidentally deleted and is being restored

-- Drop the view if it exists
DROP VIEW IF EXISTS contacts_with_stats;

-- The volunteer_count column should already exist from the previous migration
-- This migration ensures the view is replaced with the column approach
