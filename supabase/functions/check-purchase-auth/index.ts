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
        JSON.stringify({ authorized: false, error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ authorized: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { bookId } = await req.json();

    if (!bookId) {
      return new Response(
        JSON.stringify({ authorized: false, error: 'Book ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has purchased this book
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select('*, books(pdf_url, title)')
      .eq('book_id', bookId)
      .eq('buyer_id', user.id)
      .eq('payment_status', 'completed')
      .single();

    if (purchaseError || !purchase) {
      return new Response(
        JSON.stringify({ authorized: false, error: 'No completed purchase found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate signed URL for PDF download
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('book-pdfs')
      .createSignedUrl(purchase.books.pdf_url, 3600); // 1 hour expiry

    if (urlError || !signedUrl) {
      console.error('Error creating signed URL:', urlError);
      throw new Error('Failed to generate download link');
    }

    console.log(`Download authorized for user ${user.id}, book ${bookId}`);

    return new Response(
      JSON.stringify({
        authorized: true,
        downloadUrl: signedUrl.signedUrl,
        bookTitle: purchase.books.title,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in check-purchase-auth:', error);
    return new Response(
      JSON.stringify({ authorized: false, error: error.message || 'Authorization failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
