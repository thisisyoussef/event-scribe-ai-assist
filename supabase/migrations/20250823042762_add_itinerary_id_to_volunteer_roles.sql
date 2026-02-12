-- Add a strong link between volunteer roles and itinerary items
-- so roles are attached to a specific itinerary row instead of only matching by time

ALTER TABLE volunteer_roles
  ADD COLUMN IF NOT EXISTS itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_volunteer_roles_itinerary_id
  ON volunteer_roles(itinerary_id);


