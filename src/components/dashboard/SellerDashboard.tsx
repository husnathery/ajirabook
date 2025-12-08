import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BookUploadDialog from "./BookUploadDialog";
import BookEditDialog from "./BookEditDialog";
import WithdrawalDialog from "./WithdrawalDialog";
import WithdrawalHistory from "./WithdrawalHistory";
import SalesHistory from "./SalesHistory";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Book {
  id: string;
  title: string;
  cover_url: string;
  price: number;
  sales: number;
  views: number;
  description: string;
  category_id: string | null;
}

const SellerDashboard = () => {
  const [stats, setStats] = useState({ balance: 0, totalWithdrawn: 0 });
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [deleteBookId, setDeleteBookId] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    fetchBooks();
  }, []);

  const fetchStats = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("balance, total_withdrawn")
        .eq("id", user.id)
        .single();

      if (profile) {
        setStats({
          balance: Number(profile.balance),
          totalWithdrawn: Number(profile.total_withdrawn),
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  const fetchBooks = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("books")
        .select("id, title, cover_url, price, sales, views, description, category_id")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error("Error fetching books:", error);
      toast.error("Failed to load books");
    }
  };

  const handleDeleteBook = async () => {
    if (!deleteBookId) return;

    try {
      const { error } = await supabase
        .from("books")
        .delete()
        .eq("id", deleteBookId);

      if (error) throw error;

      toast.success("Book deleted successfully");
      setBooks(books.filter(b => b.id !== deleteBookId));
      setDeleteBookId(null);
    } catch (error) {
      console.error("Error deleting book:", error);
      toast.error("Failed to delete book");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Author Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              Tsh {stats.balance.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Withdrawn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              Tsh {stats.totalWithdrawn.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <BookUploadDialog />
        <WithdrawalDialog balance={stats.balance} />
      </div>

      {/* My Books */}
      <Card>
        <CardHeader>
          <CardTitle>My Books</CardTitle>
        </CardHeader>
        <CardContent>
          {books.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No books published yet
            </p>
          ) : (
            <div className="space-y-3">
              {books.map((book) => (
                <div
                  key={book.id}
                  className="flex items-center gap-3 p-3 border border-border rounded-lg"
                >
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="w-16 h-16 object-cover rounded"
                    onError={(e) => {
                      e.currentTarget.src = '';
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{book.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      Tsh {book.price.toLocaleString()} • {book.sales} sales • {book.views} views
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookEditDialog
                      bookId={book.id}
                      currentDescription={book.description}
                      currentCategoryId={book.category_id}
                      onUpdate={fetchBooks}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteBookId(book.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdrawal History */}
      <WithdrawalHistory />

      {/* Sales History */}
      <SalesHistory />

      <AlertDialog open={!!deleteBookId} onOpenChange={() => setDeleteBookId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Book</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this book? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBook}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SellerDashboard;