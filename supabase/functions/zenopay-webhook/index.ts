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
    const webhookData = await req.json();
    console.log('Zenopay webhook received:', JSON.stringify(webhookData));

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { order_id, status } = webhookData;

    if (!order_id) {
      throw new Error('Missing order_id in webhook data');
    }

    console.log(`Processing webhook for order ${order_id}, status: ${status}`);

    // Check if it's a purchase or deposit
    if (order_id.startsWith('VTB')) {
      // It's a book purchase
      const { data: purchase } = await supabase
        .from('purchases')
        .select('*, books(price, seller_id)')
        .eq('transaction_id', order_id)
        .single();

      if (!purchase) {
        console.error(`Purchase not found for transaction ${order_id}`);
        return new Response(JSON.stringify({ error: 'Purchase not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (status === 'success' || status === 'completed') {
        // Update purchase status
        await supabase
          .from('purchases')
          .update({ payment_status: 'completed' })
          .eq('id', purchase.id);

        // Update book sales count
        await supabase.rpc('increment_book_sales', { book_id: purchase.book_id });

        // Calculate seller earnings (90% to seller, 10% platform fee)
        const sellerEarnings = Number(purchase.books.price) * 0.9;

        // Update seller balance
        await supabase.rpc('increment_seller_balance', {
          seller_id: purchase.books.seller_id,
          amount: sellerEarnings,
        });

        console.log(`Purchase ${order_id} completed successfully`);
      } else if (status === 'failed' || status === 'cancelled') {
        await supabase
          .from('purchases')
          .update({ payment_status: 'failed' })
          .eq('id', purchase.id);

        console.log(`Purchase ${order_id} failed`);
      }
    } else if (order_id.startsWith('DEP')) {
      // It's a deposit
      const { data: deposit } = await supabase
        .from('deposits')
        .select('*')
        .eq('transaction_id', order_id)
        .single();

      if (!deposit) {
        console.error(`Deposit not found for transaction ${order_id}`);
        return new Response(JSON.stringify({ error: 'Deposit not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (status === 'success' || status === 'completed') {
        // Update deposit status
        await supabase
          .from('deposits')
          .update({ payment_status: 'completed' })
          .eq('id', deposit.id);

        // Add credit to buyer balance
        await supabase.rpc('increment_buyer_balance', {
          buyer_id: deposit.buyer_id,
          amount: Number(deposit.amount),
        });

        console.log(`Deposit ${order_id} completed, added ${deposit.amount} to buyer balance`);
      } else if (status === 'failed' || status === 'cancelled') {
        await supabase
          .from('deposits')
          .update({ payment_status: 'failed' })
          .eq('id', deposit.id);

        console.log(`Deposit ${order_id} failed`);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
