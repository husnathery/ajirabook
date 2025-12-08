import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X, Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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

const AdminBookReviews = () => {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectBookId, setRejectBookId] = useState<string | null>(null);
  const [rejectBookData, setRejectBookData] = useState<{ coverUrl: string; pdfUrl: string } | null>(null);

  useEffect(() => {
    fetchPendingBooks();
  }, []);

  const fetchPendingBooks = async () => {
    try {
      // First fetch books with pending status
      const { data: booksData, error: booksError } = await supabase
        .from("books")
        .select(`
          *,
          categories (name)
        `)
        .eq("review_status", "pending")
        .order("created_at", { ascending: false });

      if (booksError) throw booksError;

      // Then fetch seller profiles separately
      if (booksData && booksData.length > 0) {
        const sellerIds = [...new Set(booksData.map(book => book.seller_id))];
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, phone")
          .in("id", sellerIds);

        if (profilesError) {
          console.error("Error fetching seller profiles:", profilesError);
        }

        // Merge profile data with books
        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        const booksWithProfiles = booksData.map(book => ({
          ...book,
          profiles: profilesMap.get(book.seller_id) || null
        }));

        setBooks(booksWithProfiles);
      } else {
        setBooks([]);
      }
    } catch (error) {
      console.error("Error fetching pending books:", error);
      toast.error("Failed to load pending books");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (bookId: string) => {
    try {
      const { error } = await supabase
        .from("books")
        .update({ review_status: "approved" })
        .eq("id", bookId);

      if (error) throw error;

      toast.success("Book approved successfully!");
      setBooks(books.filter(b => b.id !== bookId));
    } catch (error) {
      console.error("Error approving book:", error);
      toast.error("Failed to approve book");
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectBookId || !rejectBookData) return;

    try {
      // Delete cover image from storage
      if (rejectBookData.coverUrl) {
        const coverPath = rejectBookData.coverUrl.split('/book-covers/')[1];
        if (coverPath) {
          await supabase.storage.from('book-covers').remove([coverPath]);
        }
      }

      // Delete PDF from storage
      if (rejectBookData.pdfUrl) {
        await supabase.storage.from('book-pdfs').remove([rejectBookData.pdfUrl]);
      }

      // Delete book record
      const { error } = await supabase
        .from("books")
        .delete()
        .eq("id", rejectBookId);

      if (error) throw error;

      toast.success("Book rejected and deleted successfully!");
      setBooks(books.filter(b => b.id !== rejectBookId));
      setRejectBookId(null);
      setRejectBookData(null);
    } catch (error) {
      console.error("Error rejecting book:", error);
      toast.error("Failed to reject book");
    }
  };

  const handleDownloadPDF = async (pdfUrl: string, title: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('book-pdfs')
        .createSignedUrl(pdfUrl, 60);

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
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
    <>
    <Card>
      <CardHeader>
        <CardTitle>Pending Book Reviews ({books.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {books.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No books pending review
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cover</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {books.map((book) => (
                  <TableRow key={book.id}>
                    <TableCell>
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-12 h-16 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{book.title}</TableCell>
                    <TableCell>{book.author}</TableCell>
                    <TableCell>
                      {book.categories?.name || (
                        <Badge variant="secondary">Uncategorized</Badge>
                      )}
                    </TableCell>
                    <TableCell>Tsh {book.price.toLocaleString()}</TableCell>
                    <TableCell>{book.profiles?.phone}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPDF(book.pdf_url, book.title)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApprove(book.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setRejectBookId(book.id);
                            setRejectBookData({ coverUrl: book.cover_url, pdfUrl: book.pdf_url });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>

    <AlertDialog open={!!rejectBookId} onOpenChange={() => { setRejectBookId(null); setRejectBookData(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject Book</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to reject this book? This will permanently delete the book record
            and all associated files (cover image and PDF) from storage. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRejectConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Reject & Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default AdminBookReviews;
