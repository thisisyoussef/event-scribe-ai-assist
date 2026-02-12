# Volunteer Deletion Contacts Filtering Fix

## Problem
When volunteers removed themselves from volunteer roles (or were removed by admins), they still appeared in the Contacts database filters for those events. This happened because:

1. The `volunteers` table and `volunteer_signups` table are not directly linked
2. When a volunteer was deleted from the `volunteers` table, their corresponding record in `volunteer_signups` remained
3. The Contacts filtering system uses the `volunteer_signups` table to determine which contacts have volunteered for specific events/roles

## Solution
Modified the `delete-volunteer` Edge Function (`supabase/functions/delete-volunteer/index.ts`) to:

1. **Find the matching contact**: Look up the contact record that matches the volunteer's name and phone number
2. **Find the volunteer signup record**: Locate the corresponding record in `volunteer_signups` table using the contact ID, event ID, and role ID
3. **Delete the volunteer signup record**: Remove the record from `volunteer_signups` table before deleting the volunteer
4. **Delete the volunteer**: Proceed with the original volunteer deletion

## Technical Details

### Database Relationships
- `volunteers` table: Contains volunteer information (name, phone, gender, etc.)
- `volunteer_signups` table: Tracks volunteer history for contacts (links contact_id, event_id, role_id)
- `contacts` table: Contains contact information

### The Fix
The updated deletion process now:
1. Finds the contact by matching `name` and `phone` between `volunteers` and `contacts` tables
2. Uses the contact ID to find the corresponding `volunteer_signups` record
3. Deletes the `volunteer_signups` record first
4. Then deletes the `volunteers` record

### Code Changes
```typescript
// Find the contact that matches this volunteer's name and phone
const { data: contact, error: contactLookupError } = await supabaseServiceRole
  .from('contacts')
  .select('id')
  .eq('name', existingVolunteer.name)
  .eq('phone', existingVolunteer.phone)
  .maybeSingle();

if (contact) {
  // Find and delete the volunteer_signups record
  const { data: signupRecord, error: signupLookupError } = await supabaseServiceRole
    .from('volunteer_signups')
    .select('id, contact_id, event_id, role_id')
    .eq('contact_id', contact.id)
    .eq('event_id', existingVolunteer.event_id)
    .eq('role_id', existingVolunteer.role_id)
    .maybeSingle();

  if (signupRecord) {
    // Delete the volunteer_signups record
    await supabaseServiceRole
      .from('volunteer_signups')
      .delete()
      .eq('id', signupRecord.id);
  }
}
```

## Testing the Fix

### Manual Testing Steps
1. **Create a volunteer signup**:
   - Go to a volunteer signup page
   - Sign up a volunteer for an event/role
   - Verify they appear in Contacts page when filtering by that event/role

2. **Remove the volunteer**:
   - Either have the volunteer remove themselves (using phone verification)
   - Or have an admin remove them (using admin password)

3. **Verify the fix**:
   - Go to Contacts page
   - Filter by the event/role the volunteer was removed from
   - The volunteer should NO LONGER appear in the filtered results
   - The volunteer should still appear in Contacts if they have other volunteer history

### Expected Behavior
- ✅ Volunteers who are removed from events no longer appear in Contacts filters for those events
- ✅ Volunteers who are removed from events still appear in Contacts if they have other volunteer history
- ✅ The volunteer deletion process works for both self-removal and admin removal
- ✅ No data corruption or orphaned records

## Impact
- **Before**: Removed volunteers still appeared in Contacts filters, causing confusion
- **After**: Removed volunteers are properly excluded from Contacts filters, providing accurate filtering results

## Files Modified
- `supabase/functions/delete-volunteer/index.ts` - Updated to delete volunteer_signups records

## Related Documentation
- `VOLUNTEER_EVENT_ROLE_TRACKING_README.md` - Explains the volunteer signup tracking system
- `src/pages/Contacts.tsx` - Contains the filtering logic that benefits from this fix
