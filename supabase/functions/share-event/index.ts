import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Log the request for debugging
    console.log('Function called with method:', req.method);
    
    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment variables - URL:', supabaseUrl ? 'Set' : 'Missing', 'Key:', serviceRoleKey ? 'Set' : 'Missing');
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Function configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const body = await req.json();
    console.log('Request body:', body);
    
    const { eventId, userEmail, permissionLevel, action, currentUserId } = body;
    
    // Validate required fields
    if (!eventId || !userEmail || !permissionLevel || !action || !currentUserId) {
      console.error('Missing required fields:', { eventId, userEmail, permissionLevel, action, currentUserId });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: eventId, userEmail, permissionLevel, action, currentUserId' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (action === 'share') {
      // Get user ID from email - try to find in profiles or users table first
      let userData = null;
      let userError = null;
      
      console.log('Looking for user with email:', userEmail);
      
      try {
        // First try to get from profiles table if it exists
        const { data: profileData, error: profileError } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('email', userEmail)
          .single();
        
        console.log('Profile lookup result:', { profileData, profileError });
        
        if (profileData) {
          userData = { user: { id: profileData.id } };
          console.log('Found user in profiles table:', profileData.id);
        } else if (profileError && profileError.code !== 'PGRST116') {
          userError = profileError;
          console.log('Profile lookup error:', profileError);
        }
      } catch (e) {
        console.log('Profile lookup exception:', e);
        // Profile table might not exist, continue to auth.users
      }
      
      // If no profile found, try auth.users
      if (!userData) {
        try {
          console.log('Trying auth.admin.getUserByEmail...');
          const { data: authData, error: authError } = await supabaseClient.auth.admin.getUserByEmail(userEmail);
          console.log('Auth lookup result:', { authData, authError });
          
          if (authData?.user) {
            userData = authData;
            console.log('Found user in auth system:', authData.user.id);
            
            // Also create a profile entry for future lookups
            try {
              const profileInsertResult = await supabaseClient
                .from('profiles')
                .insert({
                  id: authData.user.id,
                  email: userEmail,
                  full_name: authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || userEmail
                })
                .onConflict('id')
                .ignore();
              console.log('Profile insert result:', profileInsertResult);
            } catch (profileInsertError) {
              console.log('Profile insert failed (non-critical):', profileInsertError);
            }
          } else {
            userError = authError;
            console.log('Auth lookup error:', authError);
          }
        } catch (e) {
          userError = e;
          console.log('Auth lookup exception:', e);
        }
      }
      
      if (userError || !userData?.user) {
        console.log('Final result: User not found. userData:', userData, 'userError:', userError);
        return new Response(
          JSON.stringify({ error: 'User not found with that email address' }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Check if already shared
      try {
        const { data: existingShare, error: shareCheckError } = await supabaseClient
          .from('event_shares')
          .select('*')
          .eq('event_id', eventId)
          .eq('shared_with', userData.user.id)
          .single();

        console.log('Share check result:', { existingShare, shareCheckError });

        if (existingShare) {
          // Update existing share
          const { error: updateError } = await supabaseClient
            .from('event_shares')
            .update({ permission_level: permissionLevel })
            .eq('id', existingShare.id);

          if (updateError) {
            console.error('Update share error:', updateError);
            return new Response(
              JSON.stringify({ error: 'Failed to update sharing permissions' }),
              { 
                status: 200, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }

          return new Response(
            JSON.stringify({ message: 'Share updated successfully' }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      } catch (shareCheckException) {
        console.log('Share check exception:', shareCheckException);
        // Continue to create new share
      }

      // Create new share
      try {
        const { error: shareError } = await supabaseClient
          .from('event_shares')
          .insert({
            event_id: eventId,
            shared_by: currentUserId,
            shared_with: userData.user.id,
            permission_level: permissionLevel,
          });

        if (shareError) {
          console.error('Create share error:', shareError);
          return new Response(
            JSON.stringify({ error: 'Failed to share event: ' + shareError.message }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        console.log('Share created successfully');
        return new Response(
          JSON.stringify({ message: 'Event shared successfully' }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } catch (shareCreateException) {
        console.error('Share creation exception:', shareCreateException);
        return new Response(
          JSON.stringify({ error: 'Failed to share event due to an exception' }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
