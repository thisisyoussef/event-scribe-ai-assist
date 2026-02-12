-- Debug phone number format and check existing contacts
-- This will help us understand why the ON CONFLICT might not be working

-- Check existing contacts and their phone formats
DO $$
DECLARE
  contact_record RECORD;
BEGIN
  RAISE NOTICE '=== EXISTING CONTACTS ===';
  FOR contact_record IN 
    SELECT id, name, phone, email, source, role, user_id, created_at 
    FROM contacts 
    ORDER BY created_at DESC 
    LIMIT 5
  LOOP
    RAISE NOTICE 'Contact: ID=%, Name=%, Phone=%, Email=%, Source=%, Role=%, UserID=%, Created=%', 
      contact_record.id, 
      contact_record.name, 
      contact_record.phone, 
      contact_record.email, 
      contact_record.source, 
      contact_record.role, 
      contact_record.user_id, 
      contact_record.created_at;
  END LOOP;
  
  -- Check phone number constraints
  RAISE NOTICE '=== PHONE CONSTRAINTS ===';
  RAISE NOTICE 'Phone column type: %', (SELECT data_type FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'phone');
  
  -- Check unique constraints on phone
  RAISE NOTICE 'Unique constraints on phone:';
  FOR contact_record IN 
    SELECT conname, contype 
    FROM pg_constraint 
    WHERE conrelid = 'contacts'::regclass 
    AND array_position(conkey, (SELECT attnum FROM pg_attribute WHERE attrelid = 'contacts'::regclass AND attname = 'phone')) IS NOT NULL
  LOOP
    RAISE NOTICE 'Constraint: % (Type: %)', contact_record.conname, contact_record.contype;
  END LOOP;
  
  -- Check indexes on phone
  RAISE NOTICE 'Indexes on phone:';
  FOR contact_record IN 
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = 'contacts' 
    AND indexdef LIKE '%phone%'
  LOOP
    RAISE NOTICE 'Index: % - %', contact_record.indexname, contact_record.indexdef;
  END LOOP;
END$$;
