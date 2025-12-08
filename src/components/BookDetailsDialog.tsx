import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Share2, BookOpen } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { slugify } from "@/lib/slugify";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface BookDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: {
    id: string;
    title: string;
    author: string;
    description: string;
    cover_url: string;
    price: number;
    views: number;
  } | null;
}

const BookDetailsDialog = ({ open, onOpenChange, book }: BookDetailsDialogProps) => {
  const navigate = useNavigate();
  const [canRead, setCanRead] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkReadAccess();
  }, [book]);

  const checkReadAccess = async () => {
    if (!book) return;
    
    setChecking(true);
    
    // Free books can be read by anyone
    if (book.price === 0) {
      setCanRead(true);
      setChecking(false);
      return;
    }

    // Check if user has purchased
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: purchase } = await supabase
        .from("purchases")
        .select("*")
        .eq("book_id", book.id)
        .eq("buyer_id", user.id)
        .eq("payment_status", "completed")
        .single();
      
      setCanRead(!!purchase);
    } else {
      setCanRead(false);
    }
    
    setChecking(false);
  };

  if (!book) return null;

  const handleShare = () => {
    const slug = slugify(book.title);
    const shareUrl = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard!");
  };

  const handleReadBook = () => {
    navigate(`/read/${book.id}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Book Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Book Cover */}
          <div className="flex justify-center">
            <img
              src={book.cover_url}
              alt={book.title}
              className="w-48 h-48 object-cover rounded-lg shadow-lg"
              onError={(e) => {
                e.currentTarget.src = '';
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          {/* Book Info */}
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-primary">{book.title}</h3>
              <p className="text-sm text-muted-foreground">by {book.author}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-1">Description</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {book.description}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{book.views} views</span>
              </div>
              <div className="text-lg font-bold text-primary">
                Tsh {book.price.toLocaleString()}
              </div>
            </div>

            <div className="flex gap-2">
              {canRead && !checking && (
                <Button
                  onClick={handleReadBook}
                  className="flex-1 gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Read Book
                </Button>
              )}
              <Button
                onClick={handleShare}
                variant="outline"
                className={canRead ? "flex-1 gap-2" : "w-full gap-2"}
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookDetailsDialog;
