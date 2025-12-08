import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Deposit {
  id: string;
  created_at: string;
  amount: number;
  payment_status: string;
  phone: string;
  transaction_id: string;
}

const DepositHistory = () => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchDeposits();
  }, [currentPage]);

  const fetchDeposits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get total count
      const { count } = await supabase
        .from("deposits")
        .select("*", { count: "exact", head: true })
        .eq("buyer_id", user.id);

      setTotalCount(count || 0);

      // Get paginated data
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error } = await supabase
        .from("deposits")
        .select("*")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      setDeposits(data || []);
    } catch (error) {
      console.error("Error fetching deposits:", error);
      toast.error("Failed to load deposit history");
    } finally {
      setLoading(false);
    }
  };

  const isWithin10Minutes = (createdAt: string) => {
    const createdDate = new Date(createdAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - createdDate.getTime()) / (1000 * 60);
    return diffMinutes <= 10;
  };

  const handleCheckStatus = async (transactionId: string, depositId: string) => {
    setCheckingStatus(depositId);
    try {
      const { data, error } = await supabase.functions.invoke("check-payment-status", {
        body: { transactionId },
      });

      if (error) throw error;

      // Refresh deposits to get updated status
      await fetchDeposits();
      
      const status = data?.zenopayStatus || 'PENDING';
      if (status === 'COMPLETED') {
        // Notify dashboard to refresh balance
        window.dispatchEvent(new CustomEvent('balance:refresh', { detail: { transactionId } }));
        toast.success("Payment verified and completed!");
      } else if (status === 'FAILED') {
        toast.error("Payment failed.");
      } else {
        toast.info("Payment still pending. Please wait.");
      }
    } catch (error: any) {
      console.error("Error checking status:", error);
      toast.error("Failed to check payment status");
    } finally {
      setCheckingStatus(null);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (deposits.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No deposit history yet
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Top-Up History</h2>
      
      {deposits.map((deposit) => {
        const canCheckStatus = deposit.payment_status === 'pending' && isWithin10Minutes(deposit.created_at);
        
        return (
          <Card key={deposit.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium">Tsh {Number(deposit.amount).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(deposit.created_at), "MMM dd, yyyy HH:mm")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{deposit.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    deposit.payment_status === "completed"
                      ? "default"
                      : deposit.payment_status === "pending"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {deposit.payment_status}
                </Badge>
                {canCheckStatus && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCheckStatus(deposit.transaction_id, deposit.id)}
                    disabled={checkingStatus === deposit.id}
                  >
                    <RefreshCw className={`h-3 w-3 ${checkingStatus === deposit.id ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default DepositHistory;
