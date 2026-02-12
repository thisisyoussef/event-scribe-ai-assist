-- Fix volunteer role times to match their itinerary times
-- Run this in the Supabase SQL Editor

-- First, let's see what needs to be fixed
SELECT 
  vr.id,
  vr.role_label,
  vr.shift_start as current_start,
  i.time_slot as itinerary_time,
  vr.shift_end as current_end
FROM volunteer_roles vr
JOIN itineraries i ON vr.itinerary_id = i.id
WHERE vr.shift_start != i.time_slot
  AND i.time_slot IS NOT NULL
  AND i.time_slot != '';

-- Now fix the times
UPDATE volunteer_roles 
SET shift_start = i.time_slot
FROM itineraries i
WHERE volunteer_roles.itinerary_id = i.id
  AND volunteer_roles.shift_start != i.time_slot
  AND i.time_slot IS NOT NULL
  AND i.time_slot != '';

-- Fix the end times to be 1 hour after start
UPDATE volunteer_roles 
SET shift_end_time = LPAD(
  FLOOR(
    (CAST(SPLIT_PART(i.time_slot, ':', 1) AS INTEGER) * 60 + 
     CAST(SPLIT_PART(i.time_slot, ':', 2) AS INTEGER) + 60) / 60
  )::TEXT, 
  2, '0'
) || ':' ||
LPAD(
  MOD(
    (CAST(SPLIT_PART(i.time_slot, ':', 1) AS INTEGER) * 60 + 
     CAST(SPLIT_PART(i.time_slot, ':', 2) AS INTEGER) + 60), 
    60
  )::TEXT, 
  2, '0'
),
shift_end = LPAD(
  FLOOR(
    (CAST(SPLIT_PART(i.time_slot, ':', 1) AS INTEGER) * 60 + 
     CAST(SPLIT_PART(i.time_slot, ':', 2) AS INTEGER) + 60) / 60
  )::TEXT, 
  2, '0'
) || ':' ||
LPAD(
  MOD(
    (CAST(SPLIT_PART(i.time_slot, ':', 1) AS INTEGER) * 60 + 
     CAST(SPLIT_PART(i.time_slot, ':', 2) AS INTEGER) + 60), 
    60
  )::TEXT, 
  2, '0'
)
FROM itineraries i
WHERE volunteer_roles.itinerary_id = i.id
  AND i.time_slot IS NOT NULL
  AND i.time_slot != '';

-- Verify the fix
SELECT 
  vr.id,
  vr.role_label,
  vr.shift_start as new_start,
  i.time_slot as itinerary_time,
  vr.shift_end as new_end
FROM volunteer_roles vr
JOIN itineraries i ON vr.itinerary_id = i.id
WHERE i.time_slot IS NOT NULL
  AND i.time_slot != '';
