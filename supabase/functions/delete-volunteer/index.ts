
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { volunteerId, volunteerName, adminPassword, phoneVerification, volunteerPhone } = await req.json();

    if (!volunteerId || !volunteerName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: volunteerId, volunteerName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify either admin password or phone verification
    let isAuthorized = false;
    
    if (adminPassword) {
      // Admin override path
      const expectedPassword = "admin123"; // This should match the frontend
      if (adminPassword === expectedPassword) {
        isAuthorized = true;
      }
    } else if (phoneVerification && volunteerPhone) {
      // Self-deletion path - verify phone number matches
      if (phoneVerification === volunteerPhone) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid admin password or phone verification" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role key to bypass RLS
    const supabaseServiceRole = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`[DELETION] Starting deletion process for volunteer ${volunteerId} (${volunteerName})`);

    // Verify the volunteer exists
    const { data: existingVolunteer, error: checkError } = await supabaseServiceRole
      .from('volunteers')
      .select('*')
      .eq('id', volunteerId)
      .maybeSingle();

    if (checkError) {
      console.error(`[DELETION] Error checking volunteer existence:`, checkError);
      return new Response(
        JSON.stringify({ error: `Failed to verify volunteer: ${checkError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!existingVolunteer) {
      console.log(`[DELETION] Volunteer ${volunteerId} not found in database`);
      return new Response(
        JSON.stringify({ error: `${volunteerName} was not found in the database` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[DELETION] Volunteer found in database:`, existingVolunteer);

    // First, find and delete the corresponding volunteer_signups record
    // This ensures the volunteer no longer appears in Contacts filtering
    console.log(`[DELETION] Looking for volunteer_signups record for volunteer ${volunteerId}`);
    
    // Find the contact that matches this volunteer's name and phone
    const { data: contact, error: contactLookupError } = await supabaseServiceRole
      .from('contacts')
      .select('id')
      .eq('name', existingVolunteer.name)
      .eq('phone', existingVolunteer.phone)
      .maybeSingle();

    if (contactLookupError) {
      console.error(`[DELETION] Error looking up contact:`, contactLookupError);
    } else if (contact) {
      console.log(`[DELETION] Found matching contact:`, contact);
      
      // Now find the volunteer_signups record
      const { data: signupRecord, error: signupLookupError } = await supabaseServiceRole
        .from('volunteer_signups')
        .select('id, contact_id, event_id, role_id')
        .eq('contact_id', contact.id)
        .eq('event_id', existingVolunteer.event_id)
        .eq('role_id', existingVolunteer.role_id)
        .maybeSingle();

      if (signupLookupError) {
        console.error(`[DELETION] Error looking up volunteer_signups record:`, signupLookupError);
        // Continue with volunteer deletion even if signup lookup fails
      } else if (signupRecord) {
        console.log(`[DELETION] Found volunteer_signups record:`, signupRecord);
        
        // Delete the volunteer_signups record
        const { error: signupDeleteError, count: signupDeleteCount } = await supabaseServiceRole
          .from('volunteer_signups')
          .delete({ count: 'exact' })
          .eq('id', signupRecord.id);

        if (signupDeleteError) {
          console.error(`[DELETION] Error deleting volunteer_signups record:`, signupDeleteError);
          // Continue with volunteer deletion even if signup deletion fails
        } else {
          console.log(`[DELETION] Successfully deleted volunteer_signups record. Rows affected: ${signupDeleteCount}`);
        }
      } else {
        console.log(`[DELETION] No volunteer_signups record found for volunteer ${volunteerId}`);
      }
    } else {
      console.log(`[DELETION] No matching contact found for volunteer ${volunteerId}`);
    }

    // Perform the actual deletion using service role (bypasses RLS)
    const { error: deleteError, count } = await supabaseServiceRole
      .from('volunteers')
      .delete({ count: 'exact' })
      .eq('id', volunteerId);

    if (deleteError) {
      console.error(`[DELETION] Delete operation failed:`, deleteError);
      return new Response(
        JSON.stringify({ error: `Failed to delete volunteer: ${deleteError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[DELETION] Delete operation completed. Rows affected: ${count}`);

    if (count === 0) {
      console.log(`[DELETION] No rows were deleted - volunteer may have already been removed`);
      return new Response(
        JSON.stringify({ error: "The volunteer may have already been removed" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the deletion was successful
    const { data: verificationData, error: verifyError } = await supabaseServiceRole
      .from('volunteers')
      .select('id')
      .eq('id', volunteerId)
      .maybeSingle();

    if (verifyError && verifyError.code !== 'PGRST116') {
      console.error(`[DELETION] Verification query failed:`, verifyError);
      return new Response(
        JSON.stringify({ error: "Could not verify if volunteer was deleted successfully" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (verificationData) {
      console.error(`[DELETION] CRITICAL: Volunteer ${volunteerId} still exists after deletion!`);
      return new Response(
        JSON.stringify({ error: "The volunteer could not be removed from the database" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[DELETION] SUCCESS: Volunteer ${volunteerId} (${volunteerName}) has been completely removed from the database and volunteer signup history`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${volunteerName} has been successfully removed from the event and will no longer appear in contact filters` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[DELETION] Unexpected error during deletion:`, error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred while deleting the volunteer" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
