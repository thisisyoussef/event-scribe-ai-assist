-- Create a test user profile for immediate testing
-- Note: This creates a profile entry, but the user still needs to sign up through the auth system

-- Insert a sample profile that will be available once a user signs up with this email
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'test@example.com',
  'Test User',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Create a sample event for testing (optional)
INSERT INTO events (id, title, description, location, start_datetime, end_datetime, created_by, status, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Sample Event',
  'This is a sample event for testing the sharing functionality',
  'Community Center',
  NOW() + INTERVAL '7 days',
  NOW() + INTERVAL '7 days' + INTERVAL '4 hours',
  '00000000-0000-0000-0000-000000000001'::uuid,
  'published',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

