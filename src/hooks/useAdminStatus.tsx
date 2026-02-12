import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export const useAdminStatus = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          setIsAdmin(false);
          setUser(null);
          setLoading(false);
          return;
        }

        setUser(user);
        
        // Check admin status from profiles table (authoritative source)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        
        if (profileError || !profile) {
          // Fallback to user metadata if profile check fails
          const adminStatus = user.user_metadata?.is_admin || false;
          setIsAdmin(adminStatus);
        } else {
          setIsAdmin(profile.is_admin || false);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        setLoading(false);
      }
    };

    checkAdminStatus();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          setIsAdmin(false);
          setUser(null);
        } else if (session?.user) {
          setUser(session.user);
          const adminStatus = session.user.user_metadata?.is_admin || false;
          setIsAdmin(adminStatus);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const refreshAdminStatus = async () => {
    if (!user) return;
    
    try {
      // Refresh user data and check profiles table
      const { data: { user: refreshedUser }, error } = await supabase.auth.getUser();
      
      if (error || !refreshedUser) {
        setIsAdmin(false);
        return;
      }

      setUser(refreshedUser);
      
      // Check admin status from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', refreshedUser.id)
        .single();
      
      if (profileError || !profile) {
        // Fallback to user metadata if profile check fails
        const adminStatus = refreshedUser.user_metadata?.is_admin || false;
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(profile.is_admin || false);
      }
    } catch (error) {
      console.error('Error refreshing admin status:', error);
    }
  };

  return {
    isAdmin,
    loading,
    user,
    refreshAdminStatus
  };
};
