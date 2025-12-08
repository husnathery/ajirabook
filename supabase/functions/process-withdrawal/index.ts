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

    const { amount, phone, name } = await req.json();

    if (!amount || !phone || !name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check seller's balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    if (Number(profile.balance) < amount) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate fee (5% withdrawal fee)
    const fee = amount * 0.05;
    const netAmount = amount - fee;

    // Deduct the full amount from seller's balance
    const { error: balanceError } = await supabase
      .from('profiles')
      .update({ balance: Number(profile.balance) - amount })
      .eq('id', user.id);

    if (balanceError) {
      console.error('Balance update error:', balanceError);
      throw balanceError;
    }

    // Create withdrawal request
    const { error: withdrawalError } = await supabase
      .from('withdrawals')
      .insert({
        seller_id: user.id,
        amount: amount,
        fee: fee,
        net_amount: netAmount,
        phone: phone,
        name: name,
        status: 'pending',
      });

    if (withdrawalError) {
      console.error('Withdrawal creation error:', withdrawalError);
      // Rollback balance deduction
      await supabase
        .from('profiles')
        .update({ balance: Number(profile.balance) })
        .eq('id', user.id);
      throw withdrawalError;
    }

    console.log(`Withdrawal request created for user ${user.id}, amount: ${amount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Withdrawal request submitted successfully',
        fee: fee,
        netAmount: netAmount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in process-withdrawal:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Withdrawal request failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
