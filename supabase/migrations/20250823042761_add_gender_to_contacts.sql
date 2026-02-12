-- Add gender field to contacts table
-- This migration adds the gender field to support brother/sister labeling

-- Add gender column to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('brother', 'sister'));

-- Add email column to contacts table if it doesn't exist
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for gender filtering
CREATE INDEX IF NOT EXISTS idx_contacts_gender ON contacts(gender);

-- Update existing contacts to have a default gender if needed
-- This is optional and can be commented out if not needed
-- UPDATE contacts SET gender = 'brother' WHERE gender IS NULL AND source = 'volunteer_signup';
