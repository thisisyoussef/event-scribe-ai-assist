#!/bin/bash
# Unpublish script: Sets the old "Tarawih Night" event from Feb 20, 2026 back to draft
# This event has been replaced by separate "Tarawih" and "Youth Qiyam" events
#
# Usage: Pass the event ID as the first argument
#   ./seed_unpublish_tarawih_night_feb20.sh <event-id>

SUPABASE_URL="https://hnfmormzizymhkqrihhm.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZm1vcm16aXp5bWhrcXJpaGhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzU4NTMxNCwiZXhwIjoyMDc5MTYxMzE0fQ.wgV8h5MqkBTOKtOrsenbZi_4P7cMTdG-VfR8bOngzE0"

if [ -z "$1" ]; then
  echo "Usage: $0 <event-id>"
  echo ""
  echo "This script sets the old 'Tarawih Night' event from Friday, February 20, 2026"
  echo "back to draft (unpublished). It has been replaced by separate Tarawih and"
  echo "Youth Qiyam events."
  echo ""
  echo "To find the event ID, query the events table for title='Tarawih Night'"
  echo "with start_datetime on 2026-02-21 (UTC)."
  exit 1
fi

EVENT_ID="$1"

echo "=== Unpublishing 'Tarawih Night' event (ID: ${EVENT_ID}) ==="

RESPONSE=$(curl -s -w "\n%{http_code}" \
  "${SUPABASE_URL}/rest/v1/events?id=eq.${EVENT_ID}" \
  -X PATCH \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "status": "draft",
    "is_public": false
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "  [OK] Event ${EVENT_ID} set to draft (unpublished)"
else
  echo "  [FAIL] HTTP ${HTTP_CODE}: ${BODY}"
  exit 1
fi

echo ""
echo "=== Done! ==="
echo "The old 'Tarawih Night' event from Friday, February 20, 2026 is now unpublished."
echo "Use seed_tarawih.sh and seed_tarawih_night.sh to create the proper published events."
