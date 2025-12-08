import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BookDetailsDialog from "@/components/BookDetailsDialog";
import { toast } from "sonner";

interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  cover_url: string;
  price: number;
  views: number;
  sales: number;
  created_at: string;
  category_id: string | null;
}

const BookView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchBook(id);
    }
  }, [id]);

  const fetchBook = async (slugOrId: string) => {
    try {
      // Try to fetch by ID first (for backward compatibility)
      let query = supabase
        .from("books")
        .select("*");
      
      // Check if it's a UUID or a slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
      
      if (isUUID) {
        query = query.eq("id", slugOrId);
      } else {
        // It's a slug, search by title pattern
        const titlePattern = decodeURIComponent(slugOrId)
          .replace(/-/g, ' ')
          .toLowerCase();
        
        // Fetch all books and find the one with matching slug
        const { data: allBooks, error: fetchError } = await supabase
          .from("books")
          .select("*");
        
        if (fetchError) throw fetchError;
        
        const matchedBook = allBooks?.find(book => {
          const bookSlug = book.title
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
          return bookSlug === slugOrId;
        });
        
        if (matchedBook) {
          setBook(matchedBook);
          await supabase.rpc("increment_book_views", { book_id: matchedBook.id });
          
          // Check if book is free or purchased, redirect to reader
          if (matchedBook.price === 0) {
            // Free book - check auth first
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
              toast.error("Please sign in to read this book");
              navigate("/auth");
              return;
            }
            const slug = matchedBook.title
              .toLowerCase()
              .trim()
              .replace(/\s+/g, '-')
              .replace(/[^\w\-]+/g, '')
              .replace(/\-\-+/g, '-')
              .replace(/^-+/, '')
              .replace(/-+$/, '');
            navigate(`/read/${slug}`);
            return;
          } else {
            // Check if user has purchased
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { data: purchase } = await supabase
                .from("purchases")
                .select("*")
                .eq("book_id", matchedBook.id)
                .eq("buyer_id", user.id)
                .eq("payment_status", "completed")
                .single();
              
              if (purchase) {
                // User purchased - redirect to reader
                const slug = matchedBook.title
                  .toLowerCase()
                  .trim()
                  .replace(/\s+/g, '-')
                  .replace(/[^\w\-]+/g, '')
                  .replace(/\-\-+/g, '-')
                  .replace(/^-+/, '')
                  .replace(/-+$/, '');
                navigate(`/read/${slug}`);
                return;
              }
            }
          }
          
          setLoading(false);
          return;
        } else {
          toast.error("Book not found");
          navigate("/");
          return;
        }
      }
      
      const { data, error } = await query.single();

      if (error) throw error;

      if (data) {
        setBook(data);
        await supabase.rpc("increment_book_views", { book_id: data.id });
        
        // Check if book is free or purchased, redirect to reader
        if (data.price === 0) {
          // Free book - check auth first
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            toast.error("Please sign in to read this book");
            navigate("/auth");
            return;
          }
          const slug = data.title
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
          navigate(`/read/${slug}`);
          return;
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: purchase } = await supabase
              .from("purchases")
              .select("*")
              .eq("book_id", data.id)
              .eq("buyer_id", user.id)
              .eq("payment_status", "completed")
              .single();
            
              if (purchase) {
                const slug = data.title
                  .toLowerCase()
                  .trim()
                  .replace(/\s+/g, '-')
                  .replace(/[^\w\-]+/g, '')
                  .replace(/\-\-+/g, '-')
                  .replace(/^-+/, '')
                  .replace(/-+$/, '');
                navigate(`/read/${slug}`);
                return;
              }
          }
        }
      } else {
        toast.error("Book not found");
        navigate("/");
      }
    } catch (error) {
      console.error("Error fetching book:", error);
      toast.error("Failed to load book");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!book) return null;

  return (
    <div className="min-h-screen">
      <BookDetailsDialog
        open={true}
        onOpenChange={(open) => {
          if (!open) navigate("/");
        }}
        book={book}
      />
    </div>
  );
};

export default BookView;
