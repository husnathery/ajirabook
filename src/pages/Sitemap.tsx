import { useEffect } from "react";

const Sitemap = () => {
  useEffect(() => {
    // Redirect to the edge function that generates the sitemap dynamically
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    window.location.href = `${supabaseUrl}/functions/v1/generate-sitemap?apikey=${anonKey}`;
  }, []);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>Redirecting to sitemap...</p>
    </div>
  );
};

export default Sitemap;
