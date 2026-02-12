# Function Search Path Security Fix

## Issue Description

The security scanner detected that the `public.soft_delete_event_template` function (and potentially other functions) had a **mutable search_path** vulnerability. This is a security concern where functions can potentially access unintended schemas or objects due to search path manipulation.

## Security Risk

When a PostgreSQL function doesn't explicitly set its search path, it inherits the search path from the calling context. This can lead to:

1. **Schema hijacking**: An attacker could manipulate the search path to access unintended schemas
2. **Object confusion**: Functions might operate on objects from unexpected schemas
3. **Privilege escalation**: Potential access to objects the function shouldn't have access to

## Functions Fixed

The following functions have been updated to include `SET search_path = public`:

### Template Management Functions
- `soft_delete_event_template(template_id UUID, user_uuid UUID)`
- `restore_event_template(template_id UUID, user_uuid UUID)`
- `cleanup_old_deleted_templates()`

### Event Management Functions (Previously Fixed)
- `soft_delete_event(event_id UUID, user_id UUID)`
- `restore_event(event_id UUID, user_id UUID)`
- `cleanup_old_deleted_events()`

### System Functions (Previously Fixed)
- `update_updated_at_column()`
- `handle_new_user()`

### RPC Functions (Already Secure)
- `get_shared_event_detail(p_event_id uuid)`
- `get_events_shared_by_user()`
- `get_event_shares_with_emails(p_event_id uuid)`
- `get_shared_events_with_meta()`
- `get_previously_shared_users()`

## Solution Applied

Each vulnerable function has been updated to include:

```sql
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
```

This ensures that:
1. **Explicit search path**: The function always operates within the `public` schema
2. **Immutable context**: The search path cannot be manipulated by the calling context
3. **Security**: Prevents potential schema hijacking attacks

## Migration Applied

**File**: `supabase/migrations/20250823042781_fix_function_search_paths_security.sql`

This migration:
1. Drops the vulnerable function definitions
2. Recreates them with explicit `SET search_path = public`
3. Maintains all existing functionality and permissions
4. Applies the security fix without breaking changes

## Verification

After applying this migration, you can verify the fix by checking:

```sql
-- Check if functions have explicit search_path
SELECT 
  proname,
  prosrc
FROM pg_proc 
WHERE proname IN (
  'soft_delete_event_template',
  'restore_event_template', 
  'cleanup_old_deleted_templates'
);
```

The functions should now show `SET search_path = public` in their definition.

## Best Practices Going Forward

1. **Always include `SET search_path`** when creating `SECURITY DEFINER` functions
2. **Use explicit schema references** in function bodies (e.g., `public.table_name`)
3. **Test functions** with different search path contexts
4. **Regular security audits** of database functions

## Related Documentation

- [PostgreSQL Security Best Practices](https://www.postgresql.org/docs/current/security.html)
- [Function Security in Supabase](https://supabase.com/docs/guides/database/functions)
- [RLS and Function Security](https://supabase.com/docs/guides/auth/row-level-security)

---

# Additional Security Fixes Applied

## RLS Disabled in Public - RESOLVED ✅

**Issue**: Table `public.volunteer_roles_backup` was public but RLS was not enabled.

**Root Cause**: This table was created as a temporary backup during the migration to support multiple coordinators per volunteer role. It was never intended to be a permanent table and lacked proper security controls.

**Solution Applied**: 
- **Migration**: `20250823042782_remove_volunteer_roles_backup_table.sql`
- **Action**: Dropped the unnecessary backup table that had RLS disabled
- **Security Impact**: Eliminated a potential data exposure vulnerability

**Why This Approach**: 
- The table was only used during a one-time migration
- No application code references this table
- Removing it eliminates the security risk entirely
- Cleaner database schema without unused backup tables

**Verification**: After applying this migration, the security scanner should no longer flag the `volunteer_roles_backup` table as having RLS disabled.
