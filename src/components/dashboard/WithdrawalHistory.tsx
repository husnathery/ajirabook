import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";

interface Withdrawal {
  id: string;
  amount: number;
  fee: number;
  net_amount: number;
  status: string;
  created_at: string;
  admin_notes: string | null;
}

const WithdrawalHistory = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      toast.error("Failed to load withdrawal history");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdrawal History</CardTitle>
      </CardHeader>
      <CardContent>
        {withdrawals.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No withdrawal requests yet
          </p>
        ) : (
          <div className="space-y-3">
            {withdrawals.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="p-3 border border-border rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      Tsh {Number(withdrawal.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Fee: Tsh {Number(withdrawal.fee).toLocaleString()} • Net: Tsh{" "}
                      {Number(withdrawal.net_amount).toLocaleString()}
                    </p>
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
                <p className="text-xs text-muted-foreground">
                  {format(new Date(withdrawal.created_at), "MMM dd, yyyy HH:mm")}
                </p>
                {withdrawal.admin_notes && (
                  <div className="text-xs bg-muted p-2 rounded">
                    <p className="font-medium">Admin Notes:</p>
                    <p>{withdrawal.admin_notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WithdrawalHistory;
