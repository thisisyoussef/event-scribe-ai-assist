
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  to: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { to, message }: SMSRequest = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: 'Phone number and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const rawFrom = Deno.env.get('TWILIO_PHONE_NUMBER') || '';
    const messagingServiceSid = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID') || '';

    // Normalize numbers to E.164
    const sanitize = (num: string) => {
      const digits = (num || '').replace(/[^\d+]/g, '');
      if (digits.startsWith('+')) return digits;
      if (/^1\d{10}$/.test(digits)) return `+${digits}`;
      if (/^\d{10}$/.test(digits)) return `+1${digits}`;
      return digits ? `+${digits}` : '';
    };

    const toNumber = sanitize(to);
    const fromNumber = rawFrom ? sanitize(rawFrom) : '';

    if (!accountSid || !authToken || (!fromNumber && !messagingServiceSid)) {
      console.error('Missing Twilio credentials or sender identity (phone or messaging service SID)');
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!toNumber || !/^\+[1-9]\d{7,14}$/.test(toNumber)) {
      return new Response(
        JSON.stringify({ error: 'Invalid destination phone number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create basic auth header for Twilio API
    const credentials = btoa(`${accountSid}:${authToken}`);
    
    // Prepare form data for Twilio API
    const formData = new URLSearchParams();
    formData.append('To', toNumber);
    if (messagingServiceSid) {
      formData.append('MessagingServiceSid', messagingServiceSid);
    } else {
      formData.append('From', fromNumber);
    }
    formData.append('Body', message);

    console.log(`Sending SMS to ${toNumber}: ${message}`);

    // Send SMS via Twilio API
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('Twilio API error:', result);
      return new Response(
        JSON.stringify({ error: 'Failed to send SMS', details: result }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('SMS sent successfully:', result.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: result.sid,
        status: result.status 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-sms function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);
