import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CreditTopUpDialog from "./CreditTopUpDialog";
import PurchaseHistory from "./PurchaseHistory";
import DepositHistory from "./DepositHistory";
import { toast } from "sonner";
import { Wallet, ShoppingBag, TrendingUp } from "lucide-react";

const BuyerDashboard = () => {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Listen for balance refresh events and realtime profile updates
  useEffect(() => {
    const handler = () => {
      fetchDashboardData();
    };
    window.addEventListener('balance:refresh', handler);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchDashboardData();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    let channel: any;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        channel = supabase
          .channel('profiles-balance')
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
            (payload) => {
              const newBalance = Number((payload as any).new?.balance);
              if (!isNaN(newBalance)) setBalance(newBalance);
            }
          )
          .subscribe();
      }
    })();

    return () => {
      window.removeEventListener('balance:refresh', handler);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", user.id)
        .single();

      if (profile) {
        setBalance(Number(profile.balance));
      }

      // Fetch purchase stats
      const { data: purchases } = await supabase
        .from("purchases")
        .select("amount")
        .eq("buyer_id", user.id)
        .eq("payment_status", "completed");

      if (purchases) {
        setTotalPurchases(purchases.length);
        setTotalSpent(purchases.reduce((sum, p) => sum + Number(p.amount), 0));
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
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
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          My Library
        </h1>
        <p className="text-muted-foreground">Manage your books and balance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Balance Card */}
        <Card className="col-span-3 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Available Balance
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary mb-1">
              Tsh {balance.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Ready to spend</p>
          </CardContent>
        </Card>

        {/* Total Books */}
        <Card className="border-border/50">
          <CardContent className="pt-6 pb-4 text-center">
            <div className="flex justify-center mb-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <ShoppingBag className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <p className="text-2xl font-bold">{totalPurchases}</p>
            <p className="text-xs text-muted-foreground">Books Owned</p>
          </CardContent>
        </Card>

        {/* Total Spent */}
        <Card className="col-span-2 border-border/50">
          <CardContent className="pt-6 pb-4 text-center">
            <div className="flex justify-center mb-2">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <p className="text-2xl font-bold">Tsh {totalSpent.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Spent on Books</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Up Button */}
      <CreditTopUpDialog />

      {/* Purchase History */}
      <PurchaseHistory />

      {/* Deposit History */}
      <DepositHistory />
    </div>
  );
};

export default BuyerDashboard;