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
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get current time
    const now = new Date()
    console.log('Current time:', now.toISOString())

    // Find events that ended 5 hours ago
    const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000)
    console.log('Looking for events that ended before:', fiveHoursAgo.toISOString())

    // Get events that ended 5+ hours ago
    const { data: events, error: eventsError } = await supabaseClient
      .from('events')
      .select('id, title, end_datetime')
      .lt('end_datetime', fiveHoursAgo.toISOString())
      .is('deleted_at', null)

    if (eventsError) {
      console.error('Error fetching events:', eventsError)
      throw eventsError
    }

    console.log(`Found ${events?.length || 0} events that ended 5+ hours ago`)

    const results = []

    // Process each event
    for (const event of events || []) {
      console.log(`Processing event: ${event.title} (${event.id})`)
      
      try {
        // Get no-show volunteers for this event
        const { data: noShowVolunteers, error: noShowError } = await supabaseClient
          .from('volunteers')
          .select(`
            id,
            name,
            phone,
            volunteer_roles!inner(role_label)
          `)
          .eq('event_id', event.id)
          .eq('status', 'confirmed')
          .is('checked_in_at', null)

        if (noShowError) {
          console.error(`Error getting no-show volunteers for event ${event.id}:`, noShowError)
          continue
        }

        console.log(`Found ${noShowVolunteers?.length || 0} no-show volunteers for event ${event.title}`)

        if (noShowVolunteers && noShowVolunteers.length > 0) {
          // Get contact IDs for these volunteers
          const phoneNumbers = noShowVolunteers.map(v => v.phone)
          
          const { data: contacts, error: contactsError } = await supabaseClient
            .from('contacts')
            .select('id, name, phone')
            .in('phone', phoneNumbers)

          if (contactsError) {
            console.error(`Error fetching contacts for event ${event.id}:`, contactsError)
            continue
          }

          // Remove contacts from database
          const contactIds = contacts?.map(c => c.id) || []
          
          if (contactIds.length > 0) {
            const { error: deleteError } = await supabaseClient
              .from('contacts')
              .delete()
              .in('id', contactIds)

            if (deleteError) {
              console.error(`Error deleting contacts for event ${event.id}:`, deleteError)
              continue
            }

            console.log(`Deleted ${contactIds.length} contacts for event ${event.title}`)
          }

          results.push({
            eventId: event.id,
            eventTitle: event.title,
            noShowCount: noShowVolunteers.length,
            removedContacts: contacts?.map(c => ({
              id: c.id,
              name: c.name,
              phone: c.phone
            })) || []
          })
        }
      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error)
        results.push({
          eventId: event.id,
          eventTitle: event.title,
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedEvents: results.length,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in cleanup function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})























