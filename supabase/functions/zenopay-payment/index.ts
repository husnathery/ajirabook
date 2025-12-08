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
    const { phone, amount, bookId } = await req.json();

    if (!phone || !amount || !bookId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get book details
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('*, seller_id')
      .eq('id', bookId)
      .single();

    if (bookError || !book) {
      throw new Error('Book not found');
    }

    // Format phone number for Tanzania
    const formattedPhone = phone.startsWith('0') ? `255${phone.substring(1)}` : phone;

    // Generate unique transaction ID
    const transactionId = `VTB${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Initiate Zenopay payment
    const zenopayApiKey = Deno.env.get('ZENOPAY_API_KEY');
    
    if (!zenopayApiKey) {
      console.error('ZENOPAY_API_KEY not configured');
      throw new Error('Payment provider not configured');
    }
    
    console.log(`Initiating payment for ${formattedPhone}, amount: ${amount}, transaction: ${transactionId}`);
    
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

    // Get current user (if authenticated)
    const authHeader = req.headers.get('Authorization');
    let buyerId = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      buyerId = user?.id || null;
    }

    // Create purchase record
    const { error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        book_id: bookId,
        buyer_id: buyerId,
        buyer_phone: phone,
        amount: amount,
        transaction_id: transactionId,
        payment_status: 'pending',
      });

    if (purchaseError) {
      console.error('Purchase record error:', purchaseError);
      throw purchaseError;
    }

    console.log(`Payment initiated: ${transactionId} for book ${bookId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment initiated. Please check your phone.',
        transactionId,
        zenopayReference: paymentData.reference,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in zenopay-payment:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Payment failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
