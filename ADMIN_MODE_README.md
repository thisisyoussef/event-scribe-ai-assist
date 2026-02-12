# Admin Mode Feature

## Overview
The admin mode feature allows users with elevated privileges to manage all events in the system, regardless of ownership. This is useful for system administrators who need to oversee and manage events across all users.

## How to Activate Admin Mode

1. **Navigate to Settings**: Go to the Settings page in your application
2. **Go to Admin Tab**: Click on the "Admin" tab in the settings
3. **Enter Admin Code**: Input the admin code: `ADMINMODE`
4. **Activate**: Click the "Activate Admin Mode" button

## Admin Privileges

Once admin mode is activated, you will have the following elevated privileges:

### Event Management
- **Delete Any Event**: Delete events regardless of who created them
- **View All Events**: See all events in the system, not just your own
- **Access All Deleted Events**: View and manage all soft-deleted events
- **Permanently Delete All**: Permanently remove all deleted events and templates

### Visual Indicators
- **Admin Badge**: A golden "Admin Mode" badge appears in the Dashboard header
- **Event Ownership**: Events created by other users are marked with "Other User" badges
- **Settings Tab**: Admin tab shows current admin status and privileges

## Security Features

- **Admin Code**: The admin code `ADMINMODE` is hardcoded and cannot be changed without code modification
- **Database Policies**: Row-level security policies are updated to allow admins to delete any event
- **User Metadata**: Admin status is stored in both the database and user metadata for persistence
- **Session Management**: Admin status is maintained across sessions and page refreshes

## Database Changes

The following database migrations are required:

1. **Add Admin Field**: `20250823042839_add_admin_field_to_profiles.sql`
   - Adds `is_admin` boolean field to profiles table
   - Creates `activate_admin_mode` function
   - Updates user metadata with admin status

2. **Update Event Policies**: `20250823042840_allow_admins_to_delete_any_event.sql`
   - Allows admins to delete any event
   - Updates RLS policies for events table

## Technical Implementation

### Frontend Components
- **Settings Page**: Admin tab with activation interface
- **Dashboard**: Admin badge and event ownership indicators
- **useAdminStatus Hook**: Custom hook for managing admin state

### Backend Functions
- **activate_admin_mode**: Supabase RPC function to validate and activate admin mode
- **Updated RLS Policies**: Database policies that respect admin privileges

## Usage Examples

### Deleting Another User's Event
1. Navigate to Dashboard
2. Find the event you want to delete
3. Click the delete button (admin privileges allow deletion regardless of ownership)
4. Confirm deletion

### Viewing All Deleted Events
1. Go to Recently Deleted page
2. As an admin, you'll see all deleted events from all users
3. You can restore or permanently delete any event

### Managing All Templates
1. Access Templates page
2. View and manage all event templates in the system
3. Delete templates regardless of ownership

## Important Notes

- **Permanent**: Admin mode activation is permanent until manually deactivated
- **Irreversible Actions**: Be careful with permanent deletions as they cannot be undone
- **Audit Trail**: All admin actions are logged in the database
- **User Responsibility**: Admins should use their privileges responsibly

## Deactivating Admin Mode

Currently, admin mode cannot be deactivated through the UI. To deactivate:
1. Manually update the database: `UPDATE profiles SET is_admin = FALSE WHERE id = 'user_id'`
2. Update user metadata: Remove `is_admin: true` from user metadata
3. Refresh the application

## Future Enhancements

- **Admin Dashboard**: Dedicated admin interface for system management
- **User Management**: Ability to manage other users' accounts
- **Audit Logs**: Detailed logging of all admin actions
- **Role-Based Access**: Multiple admin levels with different privileges
- **Admin Code Management**: Ability to change admin codes or use multiple codes
