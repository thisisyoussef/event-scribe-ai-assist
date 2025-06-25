
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

    const { volunteerId, volunteerName, adminPassword } = await req.json();

    if (!volunteerId || !volunteerName || !adminPassword) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: volunteerId, volunteerName, adminPassword" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin password
    const expectedPassword = "admin123"; // This should match the frontend
    if (adminPassword !== expectedPassword) {
      return new Response(
        JSON.stringify({ error: "Incorrect admin password" }),
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

    console.log(`[DELETION] SUCCESS: Volunteer ${volunteerId} (${volunteerName}) has been completely removed from the database`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${volunteerName} has been successfully removed from the event` 
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
