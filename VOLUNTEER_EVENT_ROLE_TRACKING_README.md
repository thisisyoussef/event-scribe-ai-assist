# Volunteer Event and Role Tracking Implementation

## Overview
This implementation adds comprehensive tracking of **every event and role** each volunteer signs up for, maintaining a complete volunteer history. This allows POC/admin users to filter contacts based on event and role information while preserving the full volunteer engagement history.

## What Was Implemented

### 1. Database Schema Updates
- **New `volunteer_signups` table** created to track every volunteer signup
- **Removed `event_id` and `role_id`** from contacts table to prevent overwriting
- **Foreign key relationships** properly established with `events` and `volunteer_roles` tables
- **Indexes exist** for performance optimization

### 2. TypeScript Interface Updates
- **Updated `Contact` interface** in `src/types/database.ts` - removed `event_id` and `role_id`
- **New `VolunteerSignup` interface** added to track individual signup records
- **Extended `ContactWithDetails` interface** now includes `volunteerHistory` array

### 3. Volunteer Signup Process Updates
- **Modified `src/hooks/useVolunteerSignup.tsx`** to use the new volunteer history system:
  - Creates/updates contact record with basic information (name, phone, gender, source)
  - **Records every signup** in the `volunteer_signups` table
  - **Prevents overwriting** previous volunteer history
  - **Maintains complete engagement record** across multiple events and roles

### 4. Contacts Page Enhancements
- **Extended Contact Interface**: Created `ContactWithDetails` interface that includes `volunteerHistory` array
- **Enhanced Data Loading**: Modified `loadContacts()` to fetch volunteer signup history from the new table
- **New Filter Options**: Added event and role filters that work with the complete volunteer history
- **Table Display**: Added new columns showing recent events and roles with history indicators
- **Mobile View**: Enhanced mobile contact cards to display complete volunteer history
- **Export Enhancement**: CSV export now includes volunteer history information

### 5. Filtering Capabilities
- **Event Filter**: Dropdown to filter contacts by specific event (works with complete volunteer history)
- **Role Filter**: Dropdown to filter contacts by specific volunteer role (works with complete volunteer history)
- **Combined Filtering**: All filters work together (search, source, gender, event, role)
- **Clear Filters**: Button to reset all active filters
- **History-Aware Filtering**: Filters show contacts who have volunteered for specific events/roles at any time

## How It Works

### 1. Volunteer Signup Flow
1. User signs up for a volunteer role on the public signup page
2. System creates/updates contact record with basic information:
   - `source: 'volunteer_signup'`
   - Contact details (name, phone, gender)
3. **System records the signup** in `volunteer_signups` table:
   - Links to contact, event, and role
   - Includes signup date and status
   - **Preserves all previous volunteer history**

### 2. Contact Management
1. POC/admin users can view all contacts in the Contacts page
2. **Volunteer contacts show complete volunteer history**:
   - Recent events and roles (with indicators for additional history)
   - Signup dates and status information
   - Mobile view shows detailed history with status indicators
3. Users can filter contacts by:
   - Event (shows contacts who volunteered for specific events at any time)
   - Role (shows contacts who volunteered for specific roles at any time)
   - Source (manual vs volunteer signup)
   - Gender (brother vs sister)
   - Text search (name, phone, email)

### 3. Data Relationships
- **`contacts` table**: Basic contact information (name, phone, gender, source)
- **`volunteer_signups` table**: Complete volunteer history linking:
  - `contact_id` → `contacts.id` (which contact)
  - `event_id` → `events.id` (which event)
  - `role_id` → `volunteer_roles.id` (which role)
- **`volunteer_roles.event_id`** → `events.id` (role belongs to event)
- **Multiple signups per contact**: One contact can have many volunteer signup records

## Benefits

1. **Complete Volunteer History**: POC users can see **every event and role** each contact has volunteered for
2. **No Data Loss**: Previous volunteer history is never overwritten when volunteers sign up for new events
3. **Improved Filtering**: Find contacts who volunteered for specific events/roles at any time
4. **Data Integrity**: Proper foreign key relationships ensure data consistency
5. **Enhanced Reporting**: Export contacts with complete volunteer engagement history
6. **User Experience**: Clear visual indicators for volunteer history and engagement levels
7. **Scalability**: System can handle volunteers participating in multiple events over time

## Technical Details

### Database Queries
```sql
-- Contacts with volunteer signup history
SELECT 
  contacts.*,
  volunteer_signups.event_id,
  volunteer_signups.role_id,
  volunteer_signups.signup_date,
  volunteer_signups.status
FROM contacts
LEFT JOIN volunteer_signups ON contacts.id = volunteer_signups.contact_id
WHERE contacts.user_id = $1
ORDER BY volunteer_signups.signup_date DESC

-- Get specific event/role signups for filtering
SELECT DISTINCT contact_id 
FROM volunteer_signups 
WHERE event_id = $1 OR role_id = $2
```

### Type Safety
- Extended `ContactWithDetails` interface ensures type safety
- Proper null handling for optional event/role relationships
- TypeScript compilation passes without errors

### Performance Considerations
- Database indexes exist on `event_id` and `role_id` columns
- Efficient joins using foreign key relationships
- Filtered queries optimize data retrieval

## Future Enhancements

1. **Event Date Filtering**: Filter contacts by event date ranges
2. **Role Category Filtering**: Group roles by categories (setup, cleanup, etc.)
3. **Contact History**: Show all events/roles a contact has signed up for
4. **Bulk Operations**: Bulk actions on filtered contact sets
5. **Analytics**: Contact engagement metrics by event/role

## Testing

The implementation has been tested for:
- TypeScript compilation (no errors)
- Database schema compatibility
- Foreign key relationship integrity
- Filter functionality
- Export functionality

## Database Migrations

Two new migration files have been created:

### 1. `20250823042784_add_contacts_foreign_keys.sql`
- Adds foreign key constraints for the contacts table (if needed for future optimizations)

### 2. `20250823042785_create_volunteer_signups_table.sql`
- **Creates the new `volunteer_signups` table** to track all volunteer signup history
- **Removes the need for `event_id` and `role_id`** in the contacts table
- **Establishes proper foreign key relationships** for the volunteer history system
- **Includes RLS policies** for security and access control

**Note**: The current implementation loads volunteer history data from the new `volunteer_signups` table, providing a robust and scalable solution for tracking multiple volunteer engagements per contact.

## Files Modified

1. **`src/types/database.ts`** - Updated Contact interface and added VolunteerSignup interface
2. **`src/hooks/useVolunteerSignup.tsx`** - Updated to use volunteer history system
3. **`src/pages/Contacts.tsx`** - Enhanced with complete volunteer history tracking and filtering
4. **`supabase/migrations/20250823042785_create_volunteer_signups_table.sql`** - New volunteer history table

## Database Schema

### Contacts Table (Simplified)
```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  source TEXT DEFAULT 'manual',
  gender TEXT CHECK (gender IN ('brother', 'sister')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### New Volunteer Signups Table
```sql
CREATE TABLE volunteer_signups (
  id UUID PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES volunteer_roles(id) ON DELETE CASCADE,
  signup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Key Improvements

1. **No More Data Loss**: Previous volunteer history is preserved when volunteers sign up for new events
2. **Complete History**: Every volunteer signup is recorded with full context
3. **Scalable Design**: System can handle volunteers participating in multiple events over time
4. **Better Filtering**: Filters work with complete volunteer history, not just current signup
5. **Enhanced UI**: Shows volunteer engagement levels and history indicators

The implementation is now complete and ready for use. POC/admin users can effectively track and filter contacts based on their complete volunteer engagement history across all events and roles.
