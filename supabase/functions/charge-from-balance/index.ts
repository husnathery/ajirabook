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

    const { bookId, amount } = await req.json();

    if (!bookId || amount === undefined || amount === null) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('balance, phone')
      .eq('id', user.id)
      .single();

    // For non-free books, check if user has sufficient balance
    if (amount > 0 && (!profile || Number(profile.balance) < amount)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get book details
    const { data: book } = await supabase
      .from('books')
      .select('*, seller_id')
      .eq('id', bookId)
      .single();

    if (!book) {
      return new Response(
        JSON.stringify({ error: 'Book not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate transaction ID
    const transactionId = `${amount > 0 ? 'BAL' : 'FREE'}${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Only process balance changes for non-free books
    if (amount > 0) {
      // Deduct from buyer balance
      await supabase.rpc('decrement_buyer_balance', {
        buyer_id: user.id,
        amount: amount,
      });

      // Calculate seller earnings (90% to seller, 10% platform fee)
      const sellerEarnings = Number(amount) * 0.9;

      // Add to seller balance
      await supabase.rpc('increment_seller_balance', {
        seller_id: book.seller_id,
        amount: sellerEarnings,
      });
    }

    // Create purchase record
    const { error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        book_id: bookId,
        buyer_id: user.id,
        buyer_phone: profile?.phone || '',
        amount: amount,
        transaction_id: transactionId,
        payment_status: 'completed',
      });

    if (purchaseError) {
      console.error('Purchase record error:', purchaseError);
      throw purchaseError;
    }

    // Update book sales
    await supabase.rpc('increment_book_sales', { book_id: bookId });

    console.log(`Purchase completed from balance: ${transactionId} for book ${bookId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Purchase successful',
        transactionId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in charge-from-balance:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Purchase failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
