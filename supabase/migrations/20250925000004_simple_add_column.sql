-- Simple add column
-- This migration was accidentally deleted and is being restored

-- Ensure volunteer_count column exists with proper constraints
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS volunteer_count INTEGER DEFAULT 0 NOT NULL;

-- Add check constraint to ensure non-negative values
ALTER TABLE contacts 
ADD CONSTRAINT check_volunteer_count_non_negative 
CHECK (volunteer_count >= 0);
