import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the cleanup function
    const { data, error } = await supabase.rpc('cleanup_old_deleted_events');

    if (error) {
      console.error('Error cleaning up deleted events:', error);
      return new Response(
        JSON.stringify({ error: "Failed to cleanup deleted events" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[CLEANUP] Successfully cleaned up ${data} old deleted events`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Cleaned up ${data} old deleted events`,
        deletedCount: data
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Unexpected error during cleanup:', error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred during cleanup" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
