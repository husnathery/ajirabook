import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();

    if (!phone || !phone.match(/^0\d{9}$/)) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Format phone number for Tanzania (+255)
    const formattedPhone = `255${phone.substring(1)}`;

    // Send OTP via NextSMS
    const nextsmsUsername = Deno.env.get('NEXTSMS_USERNAME');
    const nextsmsPassword = Deno.env.get('NEXTSMS_PASSWORD');
    const senderId = Deno.env.get('NEXTSMS_SENDER_ID');

    if (!nextsmsUsername || !nextsmsPassword || !senderId) {
      console.error('NextSMS config missing. Ensure NEXTSMS_USERNAME, NEXTSMS_PASSWORD and NEXTSMS_SENDER_ID are set.');
      return new Response(
        JSON.stringify({ error: 'SMS provider not configured. Contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const smsResponse = await fetch('https://messaging-service.co.tz/api/sms/v1/text/single', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${nextsmsUsername}:${nextsmsPassword}`)}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        from: senderId,
        to: formattedPhone,
        text: `Your Vitabu verification code is: ${otp}. Valid for 10 minutes.`,
      }),
    });

    const respText = await smsResponse.text();
    let respJson: any = null;
    try { respJson = JSON.parse(respText); } catch {}

    if (!smsResponse.ok) {
      console.error('NextSMS HTTP error:', respText);
      throw new Error('Failed to send SMS');
    }

    const statusName =
      respJson?.messages?.[0]?.status?.name ||
      respJson?.messages?.[0]?.status?.groupName ||
      respJson?.status?.name;

    console.log('NextSMS response:', respText);

    if (statusName && String(statusName).toUpperCase().includes('REJECT')) {
      throw new Error('SMS rejected by provider. Check approved sender name and phone format.');
    }

    // Store OTP in database (temporary_passwords table for reuse)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const { error: dbError } = await supabase
      .from('temporary_passwords')
      .insert({
        phone,
        temp_password: otp,
        expires_at: expiresAt.toISOString(),
        used: false,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    console.log(`OTP sent successfully to ${phone}`);

    return new Response(
      JSON.stringify({ success: true, message: 'OTP sent successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-otp:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
