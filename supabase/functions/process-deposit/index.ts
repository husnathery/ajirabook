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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { amount, phone } = await req.json();

    if (!amount || !phone) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number
    const formattedPhone = phone.startsWith('0') ? `255${phone.substring(1)}` : phone;

    // Generate transaction ID
    const transactionId = `DEP${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Initiate Zenopay payment
    const zenopayApiKey = Deno.env.get('ZENOPAY_API_KEY');
    
    if (!zenopayApiKey) {
      console.error('ZENOPAY_API_KEY not configured');
      throw new Error('Payment provider not configured');
    }
    
    console.log(`Initiating deposit for ${formattedPhone}, amount: ${amount}, transaction: ${transactionId}`);
    
    const paymentResponse = await fetch('https://zenoapi.com/api/payments/mobile_money_tanzania', {
      method: 'POST',
      headers: {
        'x-api-key': zenopayApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order_id: transactionId,
        buyer_phone: formattedPhone,
        amount: amount,
        buyer_email: 'customer@vitabu.com',
        buyer_name: 'Vitabu Customer',
        webhook_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/zenopay-webhook`,
      }),
    });

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok) {
      console.error('Zenopay error:', paymentData);
      throw new Error(paymentData.message || 'Payment initiation failed');
    }

    // Create deposit record
    const { error: depositError } = await supabase
      .from('deposits')
      .insert({
        buyer_id: user.id,
        phone: phone,
        amount: amount,
        transaction_id: transactionId,
        payment_status: 'pending',
      });

    if (depositError) {
      console.error('Deposit record error:', depositError);
      throw depositError;
    }

    console.log(`Deposit initiated: ${transactionId} for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Top-up initiated. Please check your phone.',
        transactionId,
        zenopayReference: paymentData.reference,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in process-deposit:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Deposit failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
