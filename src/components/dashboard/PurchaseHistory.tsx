import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { Download } from "lucide-react";

interface Purchase {
  id: string;
  book_id: string;
  created_at: string;
  amount: number;
  payment_status: string;
  books: {
    title: string;
    cover_url: string;
  };
}

const PurchaseHistory = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('purchases')
        .select('book_id, *, books(title, cover_url)')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchases(data || []);
    } catch (error: any) {
      console.error('Error fetching purchases:', error);
      toast.error("Failed to load purchase history");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (bookId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("check-purchase-auth", {
        body: { bookId },
      });

      if (error) throw error;

      if (data?.authorized) {
        window.open(data.downloadUrl, "_blank");
        toast.success("Download started");
      } else {
        toast.error("Unable to download");
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase History</CardTitle>
      </CardHeader>
      <CardContent>
        {purchases.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No purchases yet
          </p>
        ) : (
          <div className="space-y-3">
            {purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border"
              >
                <img
                  src={purchase.books.cover_url}
                  alt={purchase.books.title}
                  className="w-12 h-16 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{purchase.books.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(purchase.created_at), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-sm font-semibold text-primary">
                    Tsh {purchase.amount.toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <Badge
                    variant={purchase.payment_status === 'completed' ? 'default' : 'secondary'}
                  >
                    {purchase.payment_status}
                  </Badge>
                  {purchase.payment_status === 'completed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(purchase.book_id)}
                      className="gap-1"
                    >
                      <Download className="h-3 w-3" />
                      PDF
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PurchaseHistory;
