# Event Deletion & Recovery System

This document describes the event deletion functionality that allows users to safely delete events with the ability to recover them within 30 days.

## Features

### Soft Delete
- **Safe Deletion**: Events are not immediately removed from the database
- **30-Day Recovery Window**: Deleted events can be restored within 30 days
- **Automatic Cleanup**: Events older than 30 days are automatically and permanently removed
- **Data Preservation**: All associated volunteer roles, signups, and event data are preserved

### Recovery System
- **Recently Deleted Page**: Dedicated page to view and manage deleted events
- **One-Click Restoration**: Restore events with all associated data intact
- **Permanent Deletion**: Option to permanently delete events immediately
- **Countdown Timer**: Shows days remaining before automatic permanent deletion

## Database Schema

### New Fields Added to Events Table
```sql
ALTER TABLE events 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN deleted_by UUID REFERENCES auth.users(id);
```

### New Database Functions
- **`soft_delete_event(event_id, user_id)`**: Soft deletes an event
- **`restore_event(event_id, user_id)`**: Restores a soft deleted event
- **`cleanup_old_deleted_events()`**: Removes events older than 30 days

### Row Level Security (RLS)
- Users can only soft delete events they own
- Users can only view their own soft deleted events
- Regular event queries automatically exclude soft deleted events

## User Interface

### Dashboard
- **Delete Button**: Added to each event card (mobile and desktop)
- **Recently Deleted Link**: Button in header to access deleted events
- **Confirmation Dialog**: Confirms deletion with clear explanation

### Event Creation/Edit Page
- **Delete Button**: Available when editing existing events
- **Confirmation Dialog**: Same deletion confirmation process

### Recently Deleted Page
- **Event List**: Shows all soft deleted events with details
- **Recovery Options**: Restore or permanently delete each event
- **Countdown Display**: Shows days remaining before automatic deletion
- **Warning Banner**: Explains the 30-day recovery window

## User Experience

### Deleting an Event
1. Click delete button on event card or edit page
2. Confirm deletion in dialog
3. Event is moved to "Recently Deleted"
4. Success message explains recovery options

### Recovering an Event
1. Navigate to "Recently Deleted" page
2. Click "Restore Event" button
3. Event is restored with all data intact
4. Event reappears in main dashboard

### Permanent Deletion
1. On "Recently Deleted" page, click "Delete Permanently"
2. Confirm permanent deletion
3. Event is completely removed (cannot be recovered)

## Technical Implementation

### Frontend Components
- **`useEventDeletion` Hook**: Manages all deletion/recovery operations
- **`RecentlyDeleted` Page**: Displays and manages deleted events
- **Delete Buttons**: Added to Dashboard and EventCreation pages
- **Confirmation Dialogs**: Consistent deletion confirmation UI

### Backend Functions
- **Soft Delete**: Updates `deleted_at` timestamp instead of removing record
- **Recovery**: Clears `deleted_at` timestamp to restore event
- **Automatic Cleanup**: Database function removes old deleted events

### Security Features
- **Ownership Verification**: Users can only delete/restore their own events
- **Permission Checks**: Edit access required for deletion
- **Audit Trail**: `deleted_by` field tracks who deleted each event

## Maintenance

### Automatic Cleanup
The system automatically removes events older than 30 days using the `cleanup_old_deleted_events()` function.

### Manual Cleanup
Administrators can manually trigger cleanup using the Supabase Edge Function:
```bash
# Deploy the cleanup function
supabase functions deploy cleanup-deleted-events

# Call the function (requires service role key)
curl -X POST "https://your-project.supabase.co/functions/v1/cleanup-deleted-events" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## Best Practices

### For Users
- **Use Soft Delete**: Always use the delete button instead of manually removing data
- **Check Recently Deleted**: Review deleted events periodically
- **Plan Ahead**: Events are automatically removed after 30 days

### For Developers
- **Test Recovery**: Ensure all event data is properly restored
- **Monitor Cleanup**: Check that automatic cleanup is working correctly
- **Backup Strategy**: Consider additional backup for critical events

## Error Handling

### Common Scenarios
- **Permission Denied**: User doesn't own the event
- **Event Not Found**: Event was already permanently deleted
- **Database Errors**: Network or permission issues

### User Feedback
- Clear error messages explain what went wrong
- Success messages confirm actions and next steps
- Loading states prevent multiple submissions

## Future Enhancements

### Potential Features
- **Bulk Operations**: Delete/restore multiple events at once
- **Extended Recovery**: Configurable recovery window (e.g., 60 days)
- **Deletion Reasons**: Track why events were deleted
- **POC Override**: Allow admins to restore any deleted event
- **Export Deleted Data**: Backup deleted events before permanent removal
