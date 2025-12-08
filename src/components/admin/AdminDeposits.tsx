import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";

interface Deposit {
  id: string;
  buyer_id: string;
  phone: string;
  amount: number;
  payment_status: string;
  created_at: string;
}

const AdminDeposits = () => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDeposits();
  }, []);

  const fetchDeposits = async () => {
    try {
      const { data, error } = await supabase
        .from("deposits")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDeposits(data || []);
    } catch (error) {
      console.error("Error fetching deposits:", error);
      toast.error("Failed to load deposits");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (deposit: Deposit) => {
    // Check if already approved
    if (deposit.payment_status === "completed") {
      toast.error("This deposit has already been approved");
      return;
    }

    setProcessingId(deposit.id);
    try {
      // Update deposit status to completed
      const { error: depositError } = await supabase
        .from("deposits")
        .update({ payment_status: "completed" })
        .eq("id", deposit.id)
        .eq("payment_status", "pending"); // Only update if still pending

      if (depositError) throw depositError;

      // Increment buyer balance
      const { error: balanceError } = await supabase.rpc("increment_buyer_balance", {
        buyer_id: deposit.buyer_id,
        amount: deposit.amount,
      });

      if (balanceError) throw balanceError;

      toast.success("Deposit approved and balance credited");
      fetchDeposits();
    } catch (error) {
      console.error("Error approving deposit:", error);
      toast.error("Failed to approve deposit");
    } finally {
      setProcessingId(null);
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
    <div className="space-y-4">
      {deposits.map((deposit) => (
        <Card key={deposit.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium">Tsh {Number(deposit.amount).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{deposit.phone}</p>
              </div>
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
            </div>

            <p className="text-xs text-muted-foreground mb-3">
              {format(new Date(deposit.created_at), "MMM dd, yyyy HH:mm")}
            </p>

            {deposit.payment_status === "pending" && (
              <Button
                onClick={() => handleApprove(deposit)}
                disabled={processingId === deposit.id}
                className="w-full"
                size="sm"
              >
                {processingId === deposit.id ? "Processing..." : "Approve"}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminDeposits;
