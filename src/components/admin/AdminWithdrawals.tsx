import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { toast } from "sonner";

interface Withdrawal {
  id: string;
  seller_id: string;
  name: string;
  phone: string;
  amount: number;
  net_amount: number;
  fee: number;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const AdminWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      toast.error("Failed to load withdrawals");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: "approved" | "rejected") => {
    setProcessingId(id);
    try {
      const withdrawal = withdrawals.find(w => w.id === id);
      if (!withdrawal) throw new Error("Withdrawal not found");

      // Update withdrawal status
      const { error } = await supabase
        .from("withdrawals")
        .update({
          status,
          admin_notes: notes[id] || null,
        })
        .eq("id", id);

      if (error) throw error;

      // If approved, update seller's total_withdrawn
      if (status === "approved") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("total_withdrawn")
          .eq("id", withdrawal.seller_id)
          .single();

        if (profile) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ 
              total_withdrawn: Number(profile.total_withdrawn) + Number(withdrawal.net_amount)
            })
            .eq("id", withdrawal.seller_id);

          if (profileError) {
            console.error("Error updating total_withdrawn:", profileError);
          }
        }
      } else if (status === "rejected") {
        // If rejected, refund the amount back to seller's balance
        const { data: profile } = await supabase
          .from("profiles")
          .select("balance")
          .eq("id", withdrawal.seller_id)
          .single();

        if (profile) {
          const { error: refundError } = await supabase
            .from("profiles")
            .update({ 
              balance: Number(profile.balance) + Number(withdrawal.amount)
            })
            .eq("id", withdrawal.seller_id);

          if (refundError) {
            console.error("Error refunding balance:", refundError);
          }
        }
      }

      toast.success(`Withdrawal ${status}`);
      fetchWithdrawals();
    } catch (error) {
      console.error("Error updating withdrawal:", error);
      toast.error("Failed to update withdrawal");
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
      {withdrawals.map((withdrawal) => (
        <Card key={withdrawal.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{withdrawal.name}</p>
                <p className="text-sm text-muted-foreground">{withdrawal.phone}</p>
              </div>
              <Badge
                variant={
                  withdrawal.status === "approved"
                    ? "default"
                    : withdrawal.status === "pending"
                    ? "secondary"
                    : "destructive"
                }
              >
                {withdrawal.status}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Amount</p>
                <p className="font-medium">Tsh {Number(withdrawal.amount).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fee</p>
                <p className="font-medium">Tsh {Number(withdrawal.fee).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Net</p>
                <p className="font-medium">Tsh {Number(withdrawal.net_amount).toLocaleString()}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {format(new Date(withdrawal.created_at), "MMM dd, yyyy HH:mm")}
            </p>

            {withdrawal.status === "pending" && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Admin notes (optional)"
                  value={notes[withdrawal.id] || ""}
                  onChange={(e) =>
                    setNotes({ ...notes, [withdrawal.id]: e.target.value })
                  }
                  className="min-h-[60px]"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleUpdateStatus(withdrawal.id, "approved")}
                    disabled={processingId === withdrawal.id}
                    className="flex-1"
                  >
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleUpdateStatus(withdrawal.id, "rejected")}
                    disabled={processingId === withdrawal.id}
                    variant="destructive"
                    className="flex-1"
                  >
                    Reject
                  </Button>
                </div>
              </div>
            )}

            {withdrawal.admin_notes && (
              <div className="text-sm bg-muted p-2 rounded">
                <p className="font-medium text-muted-foreground">Admin Notes:</p>
                <p>{withdrawal.admin_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminWithdrawals;
