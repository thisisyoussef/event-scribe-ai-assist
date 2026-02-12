-- Fix contacts unique constraint to handle empty phone numbers
-- This prevents issues when POC contacts are created without phone numbers

-- Drop the existing unique constraint
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS unique_user_phone;

-- Create a new unique constraint that handles empty phone numbers
-- Only enforce uniqueness when both user_id and phone are not empty
CREATE UNIQUE INDEX unique_user_phone_non_empty 
ON contacts (user_id, phone) 
WHERE phone != '';

-- Add comment explaining the constraint
COMMENT ON INDEX unique_user_phone_non_empty IS 'Unique constraint for user_id + phone combination, only enforced when phone is not empty';
