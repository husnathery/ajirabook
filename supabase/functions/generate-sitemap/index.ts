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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('Fetching books for sitemap...');

    // Fetch all published books with cover images
    const { data: books, error } = await supabase
      .from('books')
      .select('id, title, updated_at, author, description, cover_url')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching books:', error);
      throw error;
    }

    console.log(`Fetched ${books?.length || 0} books`);

    // Use the production domain
    const baseUrl = 'https://dirajumla-publishers.com';

    // Create slug from title
    const slugify = (text: string): string => {
      return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
    };

    // Escape XML special characters
    const escapeXml = (str: string) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    // Generate sitemap XML with all book details
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Auth Page -->
  <url>
    <loc>${baseUrl}/auth</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  
  ${books?.map(book => {
    const slug = slugify(book.title);
    return `
  <!-- ${escapeXml(book.title)} by ${escapeXml(book.author)} -->
  <url>
    <loc>${baseUrl}/book/${encodeURIComponent(slug)}</loc>
    <lastmod>${new Date(book.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
    <image:image>
      <image:loc>${escapeXml(book.cover_url)}</image:loc>
      <image:title>${escapeXml(book.title)}</image:title>
      <image:caption>${escapeXml(`${book.title} by ${book.author} - ${book.description?.substring(0, 100) || ''}`)}</image:caption>
    </image:image>
  </url>`;
  }).join('') || ''}
  
</urlset>`;

    return new Response(sitemap, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error: any) {
    console.error('Error generating sitemap:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate sitemap' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
