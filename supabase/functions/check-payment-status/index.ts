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
    const { transactionId } = await req.json();

    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: 'Transaction ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const zenopayApiKey = Deno.env.get('ZENOPAY_API_KEY');

    if (!zenopayApiKey) {
      throw new Error('Payment provider not configured');
    }

    // Check payment status from Zenopay using correct endpoint
    const statusResponse = await fetch(
      `https://zenoapi.com/api/payments/order-status?order_id=${encodeURIComponent(transactionId)}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': zenopayApiKey,
        },
      }
    );

    if (!statusResponse.ok) {
      throw new Error(`Zenopay API error: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();
    console.log(`Status check for ${transactionId}:`, JSON.stringify(statusData));

    // Extract payment status from Zenopay response
    let zenopayPaymentStatus = 'PENDING';
    if (statusData.result === 'SUCCESS' && statusData.data && statusData.data.length > 0) {
      zenopayPaymentStatus = statusData.data[0].payment_status || 'PENDING';
    }

    // Auto-update database status if Zenopay shows terminal status
    const shouldUpdateDB = zenopayPaymentStatus === 'COMPLETED' || zenopayPaymentStatus === 'FAILED';
    
    // Check if it's a purchase or deposit and return status
    if (transactionId.startsWith('VTB')) {
      const { data: purchase } = await supabase
        .from('purchases')
        .select('payment_status')
        .eq('transaction_id', transactionId)
        .single();

      // Auto-update if Zenopay shows completed/failed and DB still shows pending
      if (shouldUpdateDB && purchase?.payment_status === 'pending') {
        const dbStatus = zenopayPaymentStatus === 'COMPLETED' ? 'completed' : 'failed';
        await supabase
          .from('purchases')
          .update({ payment_status: dbStatus })
          .eq('transaction_id', transactionId);
      }

      return new Response(
        JSON.stringify({
          status: purchase?.payment_status || 'pending',
          zenopayStatus: zenopayPaymentStatus,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (transactionId.startsWith('DEP')) {
      const { data: deposit } = await supabase
        .from('deposits')
        .select('payment_status, buyer_id, amount')
        .eq('transaction_id', transactionId)
        .single();

      // Auto-update if Zenopay shows completed/failed and DB still shows pending
      if (shouldUpdateDB && deposit?.payment_status === 'pending') {
        const dbStatus = zenopayPaymentStatus === 'COMPLETED' ? 'completed' : 'failed';
        
        // Update deposit status
        await supabase
          .from('deposits')
          .update({ payment_status: dbStatus })
          .eq('transaction_id', transactionId);

        // Credit buyer balance if completed
        if (zenopayPaymentStatus === 'COMPLETED' && deposit.buyer_id && deposit.amount) {
          await supabase.rpc('increment_buyer_balance', {
            buyer_id: deposit.buyer_id,
            amount: deposit.amount
          });
          console.log(`Credited ${deposit.amount} to buyer ${deposit.buyer_id}`);
        }
      }

      return new Response(
        JSON.stringify({
          status: deposit?.payment_status || 'pending',
          zenopayStatus: zenopayPaymentStatus,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid transaction ID' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error checking payment status:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
