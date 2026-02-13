#!/bin/bash
# Seed script: Tarawih Night - February 20, 2026
# Creates event + 9 volunteer roles

SUPABASE_URL="https://hnfmormzizymhkqrihhm.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZm1vcm16aXp5bWhrcXJpaGhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzU4NTMxNCwiZXhwIjoyMDc5MTYxMzE0fQ.wgV8h5MqkBTOKtOrsenbZi_4P7cMTdG-VfR8bOngzE0"
CREATED_BY="265071b5-1324-4128-8d16-d6d1aba069ff"

# Feb 20, 2026 9:00 PM EST = Feb 21, 2026 02:00 UTC
# Feb 21, 2026 12:30 AM EST = Feb 21, 2026 05:30 UTC

echo "=== Creating Tarawih Night event ==="

EVENT_RESPONSE=$(curl -s -w "\n%{http_code}" \
  "${SUPABASE_URL}/rest/v1/events" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "title": "Tarawih Night",
    "description": "Tarawih Night - February 20, 2026",
    "location": "269899 Northwestern Highway (New UMMA)",
    "start_datetime": "2026-02-21T02:00:00+00:00",
    "end_datetime": "2026-02-21T05:30:00+00:00",
    "sms_enabled": true,
    "day_before_time": "09:00",
    "day_of_time": "15:00",
    "status": "draft",
    "is_public": true,
    "created_by": "'"${CREATED_BY}"'"
  }')

HTTP_CODE=$(echo "$EVENT_RESPONSE" | tail -1)
EVENT_BODY=$(echo "$EVENT_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "201" ]; then
  echo "ERROR creating event (HTTP $HTTP_CODE):"
  echo "$EVENT_BODY"
  exit 1
fi

EVENT_ID=$(echo "$EVENT_BODY" | python3 -c "import sys,json; print(json.loads(sys.stdin.read())[0]['id'])")
echo "Event created with ID: ${EVENT_ID}"

echo ""
echo "=== Creating volunteer roles ==="

# Function to create a role
create_role() {
  local label="$1"
  local brothers="$2"
  local sisters="$3"
  local shift_start="$4"
  local shift_end="$5"

  ROLE_RESPONSE=$(curl -s -w "\n%{http_code}" \
    "${SUPABASE_URL}/rest/v1/volunteer_roles" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d '{
      "event_id": "'"${EVENT_ID}"'",
      "role_label": "'"${label}"'",
      "slots_brother": '"${brothers}"',
      "slots_sister": '"${sisters}"',
      "slots_flexible": 0,
      "shift_start": "'"${shift_start}"'",
      "shift_end": "'"${shift_end}"'",
      "shift_end_time": "'"${shift_end}"'"
    }')

  HTTP_CODE=$(echo "$ROLE_RESPONSE" | tail -1)
  ROLE_BODY=$(echo "$ROLE_RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" = "201" ]; then
    ROLE_ID=$(echo "$ROLE_BODY" | python3 -c "import sys,json; print(json.loads(sys.stdin.read())[0]['id'])")
    echo "  [OK] ${label} (${brothers}B/${sisters}S, ${shift_start}-${shift_end}) -> ${ROLE_ID}"
  else
    echo "  [FAIL] ${label} (HTTP ${HTTP_CODE}): ${ROLE_BODY}"
  fi
}

# Entrance roles (9:00 PM - 10:30 PM)
create_role "Sisters' Entrance"   0 4 "21:00" "22:30"
create_role "Family Entrance"     2 2 "21:00" "22:30"
create_role "Brothers' Entrance"  4 0 "21:00" "22:30"

# Usher roles (9:00 PM - 12:00 AM)
create_role "Stair Ushers"        8 4 "21:00" "00:00"
create_role "Masala Ushers"       4 4 "21:00" "00:00"
create_role "Hallway Ushers"      1 2 "21:00" "00:00"

# Other roles (9:00 PM - 12:00 AM)
create_role "Floaters"            2 3 "21:00" "00:00"
create_role "Refreshments"        4 0 "21:00" "00:00"

# Cleaning (11:00 PM - 12:30 AM)
create_role "Cleaning"            4 4 "23:00" "00:30"

echo ""
echo "=== Done! ==="
echo "Event ID: ${EVENT_ID}"
echo "Total roles created: 9"
echo ""
echo "Summary:"
echo "  Entrances (9:00 PM - 10:30 PM):"
echo "    - Sisters' Entrance:  4 sisters"
echo "    - Family Entrance:    2 brothers, 2 sisters"
echo "    - Brothers' Entrance: 4 brothers"
echo "  Ushers (9:00 PM - 12:00 AM):"
echo "    - Stair Ushers:    8 brothers, 4 sisters"
echo "    - Masala Ushers:   4 brothers, 4 sisters"
echo "    - Hallway Ushers:  1 brother, 2 sisters"
echo "  Other (9:00 PM - 12:00 AM):"
echo "    - Floaters:      2 brothers, 3 sisters"
echo "    - Refreshments:  4 brothers"
echo "  Cleaning (11:00 PM - 12:30 AM):"
echo "    - Cleaning:      4 brothers, 4 sisters"
