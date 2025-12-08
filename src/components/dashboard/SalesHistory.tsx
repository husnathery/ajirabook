import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

interface Sale {
  id: string;
  created_at: string;
  amount: number;
  payment_status: string;
  books: {
    title: string;
    cover_url: string;
  };
}

const SalesHistory = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First get seller's books
      const { data: books } = await supabase
        .from('books')
        .select('id')
        .eq('seller_id', user.id);

      if (!books || books.length === 0) {
        setLoading(false);
        return;
      }

      const bookIds = books.map(b => b.id);

      // Then get purchases for those books
      const { data, error } = await supabase
        .from('purchases')
        .select('*, books(title, cover_url)')
        .in('book_id', bookIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error: any) {
      console.error('Error fetching sales:', error);
      toast.error("Failed to load sales history");
    } finally {
      setLoading(false);
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
        <CardTitle>Sales History</CardTitle>
      </CardHeader>
      <CardContent>
        {sales.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No sales yet
          </p>
        ) : (
          <div className="space-y-3">
            {sales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border"
              >
                <img
                  src={sale.books.cover_url}
                  alt={sale.books.title}
                  className="w-12 h-16 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{sale.books.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(sale.created_at), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-sm font-semibold text-primary">
                    Tsh {sale.amount.toLocaleString()}
                  </p>
                </div>
                <Badge
                  variant={sale.payment_status === 'completed' ? 'default' : 'secondary'}
                >
                  {sale.payment_status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SalesHistory;
