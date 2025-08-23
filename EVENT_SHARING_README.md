# Event Sharing System

This document describes the event sharing functionality that allows users to share events with other accounts, providing different permission levels for viewing and editing.

## Features

### Permission Levels
- **View Only**: Users can view event details, volunteer roster, and volunteer signup information
- **Can Edit**: Users can modify event details, manage volunteer roles, and delete volunteers

### Sharing Management
- Share events with other users by email address
- Update existing sharing permissions
- Remove sharing access
- View all current shares for an event

### Access Control
- Automatic permission checking throughout the application
- UI elements adapt based on user permissions
- Secure access to shared events

## Database Schema

### New Tables

#### `event_shares`
```sql
CREATE TABLE event_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL CHECK (permission_level IN ('view', 'edit')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, shared_with)
);
```

### Row Level Security (RLS)
- Users can only view shares they created or are shared with
- Users can only create shares for events they own
- Users can only update/delete shares they created

## Components

### EventSharingDialog
- **Location**: `src/components/event-creation/EventSharingDialog.tsx`
- **Purpose**: Manage event sharing with other users
- **Features**:
  - Add new users to share with
  - Set permission levels (view/edit)
  - View current shares
  - Remove sharing access

### SharedEvents Page
- **Location**: `src/pages/SharedEvents.tsx`
- **Purpose**: Display events shared with the current user
- **Features**:
  - List all shared events
  - Show permission levels
  - Navigate to view/edit based on permissions

## Hooks

### useEventSharing
- **Location**: `src/hooks/useEventSharing.tsx`
- **Purpose**: Manage all event sharing operations
- **Functions**:
  - `shareEvent()`: Share event with user
  - `getEventShares()`: Get shares for an event
  - `getSharedEvents()`: Get events shared with current user
  - `removeShare()`: Remove sharing access
  - `checkEventAccess()`: Check user permissions for an event

## API Endpoints

### Supabase Edge Function: share-event
- **Location**: `supabase/functions/share-event/index.ts`
- **Purpose**: Handle event sharing server-side
- **Features**:
  - User lookup by email
  - Create/update event shares
  - Proper error handling

## Usage

### Sharing an Event
1. Navigate to the Dashboard
2. Click the "Share" button on any published event
3. Enter the email address of the user to share with
4. Select permission level (View Only or Can Edit)
5. Click "Share Event"

### Managing Shared Events
1. Navigate to "Shared Events" in the navigation menu
2. View all events shared with you
3. Click "View" to see event details
4. Click "Edit" if you have edit permissions

### Permission-Based Access
- **View Only**: Can view event details and volunteer roster
- **Can Edit**: Can modify event details, manage roles, and delete volunteers

## Security Features

### Row Level Security (RLS)
- Database-level access control
- Users can only access data they own or have been shared with

### Permission Validation
- Frontend permission checking before allowing actions
- Backend validation in Edge Functions
- Automatic redirect for unauthorized access

### Audit Trail
- Track who shared what with whom
- Timestamp of sharing actions
- Permission level changes

## Migration

To set up the event sharing system:

1. **Run the migration**:
   ```bash
   supabase db push
   ```

2. **Deploy the Edge Function**:
   ```bash
   supabase functions deploy share-event
   ```

3. **Update environment variables**:
   Ensure `SUPABASE_SERVICE_ROLE_KEY` is set for the Edge Function

## Future Enhancements

### Planned Features
- Bulk sharing operations
- Share expiration dates
- Advanced permission levels (e.g., "Can Manage Volunteers")
- Share analytics and tracking
- Email notifications for shared events

### Integration Opportunities
- Calendar integration for shared events
- Slack/Teams notifications
- API endpoints for external integrations

## Troubleshooting

### Common Issues

#### "User not found" error
- Ensure the email address is correct
- User must have an account in the system

#### Permission denied errors
- Check if the event is shared with the current user
- Verify permission levels match the required action

#### Edge Function errors
- Check Supabase function logs
- Verify service role key permissions
- Ensure function is deployed correctly

### Debug Mode
Enable detailed logging by setting environment variables:
```bash
SUPABASE_DEBUG=true
```

## Support

For issues or questions about the event sharing system:
1. Check the Supabase logs
2. Review the browser console for frontend errors
3. Verify database permissions and RLS policies
4. Test with a fresh user account to isolate permission issues
