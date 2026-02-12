// Enhanced Supabase client with better error handling and debugging
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://spkbyweazhaxjwnokugj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwa2J5d2VhemhheGp3bm9rdWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMDAyMTEsImV4cCI6MjA2NDY3NjIxMX0.h68BX9j0jyi7zAS5AXmVnq8iLqfz0gCX-SUTKMFpSMU";

// Create the Supabase client with enhanced configuration
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }
});

// Enhanced error logging function
export const logSupabaseError = (operation: string, error: any) => {
  console.error(`❌ Supabase ${operation} error:`, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
    status: error.status,
    statusText: error.statusText
  });
  
  // Log specific 406 error details
  if (error.status === 406) {
    console.error('🔍 406 Not Acceptable Error Details:', {
      operation,
      error: error.message,
      possibleCauses: [
        'RLS policy conflicts',
        'Authentication issues',
        'Invalid request headers',
        'Missing permissions'
      ]
    });
  }
};

// Helper function to test API connectivity
export const testAPIConnectivity = async () => {
  try {
    console.log('🧪 Testing Supabase API connectivity...');
    
    // Test basic auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('❌ Auth test failed:', authError);
      return false;
    }
    console.log('✅ Authentication working');
    
    // Test simple query
    const { data, error } = await supabase
      .from('events')
      .select('id')
      .limit(1);
    
    if (error) {
      logSupabaseError('connectivity test', error);
      return false;
    }
    
    console.log('✅ API connectivity working');
    return true;
  } catch (error) {
    console.error('❌ Connectivity test failed:', error);
    return false;
  }
};

// Export the original client as well for backward compatibility
export { supabase as default };
