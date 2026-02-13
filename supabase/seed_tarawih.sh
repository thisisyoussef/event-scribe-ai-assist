#!/bin/bash
# Seed script: Tarawih - February 20, 2026
# Creates event + 6 volunteer roles
# Status: PUBLISHED (live)

SUPABASE_URL="https://hnfmormzizymhkqrihhm.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZm1vcm16aXp5bWhrcXJpaGhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzU4NTMxNCwiZXhwIjoyMDc5MTYxMzE0fQ.wgV8h5MqkBTOKtOrsenbZi_4P7cMTdG-VfR8bOngzE0"
CREATED_BY="265071b5-1324-4128-8d16-d6d1aba069ff"

# Feb 20, 2026 7:30 PM EST = Feb 21, 2026 00:30 UTC
# Feb 20, 2026 9:00 PM EST = Feb 21, 2026 02:00 UTC

echo "=== Creating Tarawih event ==="

EVENT_RESPONSE=$(curl -s -w "\n%{http_code}" \
  "${SUPABASE_URL}/rest/v1/events" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "title": "Tarawih",
    "description": "Tarawih - February 20, 2026",
    "location": "269899 Northwestern Highway (New UMMA)",
    "start_datetime": "2026-02-21T00:30:00+00:00",
    "end_datetime": "2026-02-21T02:00:00+00:00",
    "sms_enabled": true,
    "day_before_time": "09:00",
    "day_of_time": "15:00",
    "status": "published",
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
  local flexible="$4"
  local shift_start="$5"
  local shift_end="$6"

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
      "slots_flexible": '"${flexible}"',
      "shift_start": "'"${shift_start}"'",
      "shift_end": "'"${shift_end}"'",
      "shift_end_time": "'"${shift_end}"'"
    }')

  HTTP_CODE=$(echo "$ROLE_RESPONSE" | tail -1)
  ROLE_BODY=$(echo "$ROLE_RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" = "201" ]; then
    ROLE_ID=$(echo "$ROLE_BODY" | python3 -c "import sys,json; print(json.loads(sys.stdin.read())[0]['id'])")
    echo "  [OK] ${label} (${brothers}B/${sisters}S/${flexible}F, ${shift_start}-${shift_end}) -> ${ROLE_ID}"
  else
    echo "  [FAIL] ${label} (HTTP ${HTTP_CODE}): ${ROLE_BODY}"
  fi
}

# All roles run 7:30 PM - 9:00 PM
create_role "Welcomers"        4 2 0 "19:30" "21:00"
create_role "Water Stocking"   2 2 0 "19:30" "21:00"
create_role "Bathroom Checks"  2 2 0 "19:30" "21:00"
create_role "Noise Control"    2 2 0 "19:30" "21:00"
create_role "Clean Up"         2 2 0 "19:30" "21:00"
create_role "Venue Readiness"  0 0 2 "19:30" "21:00"

echo ""
echo "=== Done! ==="
echo "Event ID: ${EVENT_ID}"
echo "Status: PUBLISHED (live)"
echo "Total roles created: 6"
echo ""
echo "Summary (7:30 PM - 9:00 PM):"
echo "  - Welcomers:        4 brothers, 2 sisters"
echo "  - Water Stocking:   2 brothers, 2 sisters"
echo "  - Bathroom Checks:  2 brothers, 2 sisters"
echo "  - Noise Control:    2 brothers, 2 sisters"
echo "  - Clean Up:         2 brothers, 2 sisters"
echo "  - Venue Readiness:  2 flexible"
echo ""
echo "Total: 12 brothers, 10 sisters, 2 flexible = 24 volunteers"
