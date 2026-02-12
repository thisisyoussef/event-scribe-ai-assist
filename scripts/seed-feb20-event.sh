#!/bin/bash
# Seed script: Create Taraweeh Night event for Friday Feb 20, 2026
# Usage: bash scripts/seed-feb20-event.sh

set -e

SUPABASE_URL="https://hnfmormzizymhkqrihhm.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZm1vcm16aXp5bWhrcXJpaGhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzU4NTMxNCwiZXhwIjoyMDc5MTYxMzE0fQ.wgV8h5MqkBTOKtOrsenbZi_4P7cMTdG-VfR8bOngzE0"
API="$SUPABASE_URL/rest/v1"

echo "Creating event..."

# 1. Insert event
EVENT_RESPONSE=$(curl -s -X POST "$API/events" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "title": "Taraweeh Night – Friday Feb 20",
    "description": "Taraweeh prayer night at WCCC. Volunteers should arrive by taraweeh / the time listed on their slot.",
    "location": "26899 Northwestern Highway, Southfield, Michigan",
    "start_datetime": "2026-02-21T03:00:00.000Z",
    "end_datetime": "2026-02-21T05:00:00.000Z",
    "status": "published",
    "created_by": "c5dfcb80-fc36-41a1-8bea-90e926d91914"
  }')

# Extract event id
EVENT_ID=$(echo "$EVENT_RESPONSE" | node -e "
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  const id = Array.isArray(d) ? d[0]?.id : d?.id;
  if (!id) { console.error('Failed to create event:', JSON.stringify(d)); process.exit(1); }
  process.stdout.write(id);
")

echo "  ✓ Event created: $EVENT_ID"

# 2. Insert volunteer roles (with shift_end_time matching shift_end, slots_flexible=0)
echo "Creating volunteer roles..."

ROLES_RESPONSE=$(curl -s -X POST "$API/volunteer_roles" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "[
    {
      \"event_id\": \"$EVENT_ID\",
      \"role_label\": \"Welcoming & Ushers Shift 1 | 8:45 PM\",
      \"shift_start\": \"20:45\",
      \"shift_end\": \"22:30\",
      \"shift_end_time\": \"22:30\",
      \"slots_brother\": 5,
      \"slots_sister\": 5,
      \"slots_flexible\": 0,
      \"suggested_poc\": null,
      \"notes\": \"\"
    },
    {
      \"event_id\": \"$EVENT_ID\",
      \"role_label\": \"Welcoming & Ushers Shift 2 | 10:30 PM\",
      \"shift_start\": \"22:30\",
      \"shift_end\": \"00:00\",
      \"shift_end_time\": \"00:00\",
      \"slots_brother\": 6,
      \"slots_sister\": 5,
      \"slots_flexible\": 0,
      \"suggested_poc\": null,
      \"notes\": \"\"
    },
    {
      \"event_id\": \"$EVENT_ID\",
      \"role_label\": \"Serving Adeni/Refreshments | 10:50 – 11:30 PM\",
      \"shift_start\": \"22:50\",
      \"shift_end\": \"23:30\",
      \"shift_end_time\": \"23:30\",
      \"slots_brother\": 5,
      \"slots_sister\": 5,
      \"slots_flexible\": 0,
      \"suggested_poc\": null,
      \"notes\": \"\"
    },
    {
      \"event_id\": \"$EVENT_ID\",
      \"role_label\": \"Clean Up (End of the Night)\",
      \"shift_start\": \"23:30\",
      \"shift_end\": \"00:00\",
      \"shift_end_time\": \"00:00\",
      \"slots_brother\": 4,
      \"slots_sister\": 4,
      \"slots_flexible\": 0,
      \"suggested_poc\": null,
      \"notes\": \"\"
    }
  ]")

# Print results
echo "$ROLES_RESPONSE" | node -e "
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  if (!Array.isArray(d) || d.length === 0) {
    console.error('Failed to create roles:', JSON.stringify(d));
    process.exit(1);
  }
  console.log('  ✓ ' + d.length + ' volunteer roles created:');
  for (const r of d) {
    const total = (r.slots_brother || 0) + (r.slots_sister || 0) + (r.slots_flexible || 0);
    console.log('      – ' + r.role_label + ' (' + total + ' slots: ' + r.slots_brother + 'B/' + r.slots_sister + 'S)');
  }
  console.log('\nDone! Event is live.');
"
