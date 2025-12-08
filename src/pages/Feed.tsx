import { useState, useEffect } from "react";
import { Filter, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BookCard3D from "@/components/BookCard3D";
import AdSenseAd from "@/components/AdSenseAd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { slugify } from "@/lib/slugify";

const BOOKS_PER_PAGE = 20;

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

interface FeedProps {
  selectedCategory?: string | null;
}

const Feed = ({ selectedCategory: categoryFromProps }: FeedProps = {}) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"sales" | "date" | "views">("sales");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryFromProps || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [purchasedBooks, setPurchasedBooks] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (categoryFromProps !== undefined) {
      setSelectedCategory(categoryFromProps);
    }
  }, [categoryFromProps]);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [filter, selectedCategory, searchQuery]);

  useEffect(() => {
    fetchBooks();
  }, [filter, selectedCategory, searchQuery, currentPage]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", user.id)
        .single();
      if (profile) {
        setBalance(Number(profile.balance));
      }
      
      // Fetch purchased books
      const { data: purchases } = await supabase
        .from("purchases")
        .select("book_id")
        .eq("buyer_id", user.id)
        .eq("payment_status", "completed");
      
      if (purchases) {
        setPurchasedBooks(new Set(purchases.map(p => p.book_id)));
      }
    }
  };

  const fetchBooks = async () => {
    try {
      setLoading(true);
      
      const from = (currentPage - 1) * BOOKS_PER_PAGE;
      const to = from + BOOKS_PER_PAGE - 1;
      
      let query = supabase.from("books").select("*", { count: "exact" });

      // Only show approved books
      query = query.eq("review_status", "approved");

      // Apply search filter
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      // Apply category filter
      if (selectedCategory) {
        const { data: categories } = await supabase
          .from("categories")
          .select("id")
          .eq("name", selectedCategory)
          .single();
        
        if (categories) {
          query = query.eq("category_id", categories.id);
        }
      }

      // Apply sorting
      switch (filter) {
        case "sales":
          query = query.order("sales", { ascending: false });
          break;
        case "date":
          query = query.order("created_at", { ascending: false });
          break;
        case "views":
          query = query.order("views", { ascending: false });
          break;
        default:
          query = query.order("sales", { ascending: false });
      }

      // Apply pagination
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      
      setBooks(data || []);
      setTotalBooks(count || 0);
    } catch (error) {
      console.error("Error fetching books:", error);
      toast.error("Failed to load books");
    } finally {
      setLoading(false);
    }
  };

  const handleViewBook = async (bookId: string) => {
    try {
      await supabase.rpc("increment_book_views", { book_id: bookId });
      fetchBooks(); // Refresh to show updated view count
    } catch (error) {
      console.error("Error incrementing views:", error);
    }
  };

  const handlePurchase = async (bookId: string, phone: string) => {
    try {
      if (!user) {
        toast.error("Please login to purchase books");
        navigate("/auth");
        return;
      }

      // Check if already purchased
      if (purchasedBooks.has(bookId)) {
        toast.error("You already own this book");
        return;
      }

      const book = books.find((b) => b.id === bookId);
      if (!book) return;

      // Check if user has sufficient balance
      if (balance >= book.price) {
        // Charge from balance
        const { data, error } = await supabase.functions.invoke("charge-from-balance", {
          body: {
            bookId,
            amount: book.price,
          },
        });

        if (error) throw error;

        if (data?.success) {
          toast.success("Purchase successful! Book added to your library.");
          setBalance(balance - book.price);
          setPurchasedBooks(new Set([...purchasedBooks, bookId]));
          checkUser(); // Refresh purchased books
        } else {
          toast.error(data?.message || "Purchase failed");
        }
      } else {
        // Insufficient balance, prompt to top up
        toast.error(`Insufficient balance. Please top up at least Tsh ${(book.price - balance).toLocaleString()}`);
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Purchase error:", error);
      toast.error("Failed to complete purchase");
    }
  };

  const handleDownload = async (bookId: string) => {
    try {
      // Verify purchase authorization
      const { data, error } = await supabase.functions.invoke("check-purchase-auth", {
        body: { bookId },
      });

      if (error) throw error;

      if (data?.authorized) {
        window.open(data.downloadUrl, "_blank");
      } else {
        toast.error("You haven't purchased this book yet");
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download");
    }
  };

  return (
    <div className="p-4">
      {/* Search and Filter Section */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setFilter("sales")}>
              By Sales
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter("date")}>
              By Date
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter("views")}>
              By Views
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Books Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          No books found
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {books.map((book, index) => {
              const isFirstInRow = index % 2 === 0;
              const isLastInRow = index % 2 === 1 || index === books.length - 1;
              const rowIndex = Math.floor(index / 2);
              
              return (
                <div key={book.id}>
                  {isFirstInRow && (
                    <div className="grid grid-cols-2 gap-4">
                      <BookCard3D
                        id={book.id}
                        title={book.title}
                        coverUrl={book.cover_url}
                        price={book.price}
                        views={book.views}
                        onPurchase={handlePurchase}
                        onDownload={handleDownload}
                        canDownload={purchasedBooks.has(book.id)}
                        onTitleClick={() => {
                          handleViewBook(book.id);
                          if (book.price === 0) {
                            if (!user) {
                              toast.error("Please sign in to read this book");
                              navigate("/auth");
                              return;
                            }
                            const slug = slugify(book.title);
                            navigate(`/read/${slug}`);
                          } else {
                            const slug = slugify(book.title);
                            navigate(`/book/${slug}`);
                          }
                        }}
                      />
                      {books[index + 1] && (
                        <BookCard3D
                          id={books[index + 1].id}
                          title={books[index + 1].title}
                          coverUrl={books[index + 1].cover_url}
                          price={books[index + 1].price}
                          views={books[index + 1].views}
                          onPurchase={handlePurchase}
                          onDownload={handleDownload}
                          canDownload={purchasedBooks.has(books[index + 1].id)}
                          onTitleClick={() => {
                            handleViewBook(books[index + 1].id);
                            if (books[index + 1].price === 0) {
                              if (!user) {
                                toast.error("Please sign in to read this book");
                                navigate("/auth");
                                return;
                              }
                              const slug = slugify(books[index + 1].title);
                              navigate(`/read/${slug}`);
                            } else {
                              const slug = slugify(books[index + 1].title);
                              navigate(`/book/${slug}`);
                            }
                          }}
                        />
                      )}
                    </div>
                  )}
                  {isFirstInRow && (
                    <div className="w-full py-3 mt-4">
                      <AdSenseAd key={`ad-${rowIndex}-${currentPage}`} adType="in-feed" className="flex justify-center" />
                    </div>
                  )}
                </div>
              );
            }).filter((_, index) => index % 2 === 0)}
          </div>

          {/* Pagination Controls */}
          {totalBooks > BOOKS_PER_PAGE && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-4">
                Page {currentPage} of {Math.ceil(totalBooks / BOOKS_PER_PAGE)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalBooks / BOOKS_PER_PAGE), p + 1))}
                disabled={currentPage >= Math.ceil(totalBooks / BOOKS_PER_PAGE)}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Feed;