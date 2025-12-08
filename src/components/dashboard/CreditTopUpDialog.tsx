import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

// Background polling manager
const activePolls = new Map<string, boolean>();

const CreditTopUpDialog = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userPhone, setUserPhone] = useState("");
  const [formData, setFormData] = useState({
    amount: "",
    phone: "",
  });

  useEffect(() => {
    fetchUserPhone();
  }, []);

  const fetchUserPhone = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", user.id)
          .single();
        if (profile) {
          setUserPhone(profile.phone);
          setFormData(prev => ({ ...prev, phone: profile.phone }));
        }
      }
    } catch (error) {
      console.error("Error fetching user phone:", error);
    }
  };

  const checkPaymentStatus = async (transactionId: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("check-payment-status", {
      body: { transactionId },
    });

    if (error) throw error;
    return data?.zenopayStatus || 'PENDING';
  };

  const pollPaymentStatus = async (transactionId: string, isBackground = false) => {
    // Prevent duplicate polling for same transaction
    if (activePolls.has(transactionId)) {
      return false;
    }
    
    activePolls.set(transactionId, true);
    
    const delays = [2000, 5000, 10000, 30000]; // Exponential backoff: 2s, 5s, 10s, 30s
    const maxDuration = 3 * 60 * 1000; // 3 minutes
    const startTime = Date.now();
    let attemptIndex = 0;

    while (Date.now() - startTime < maxDuration && activePolls.get(transactionId)) {
      try {
        const status = await checkPaymentStatus(transactionId);
        
          if (status === 'COMPLETED') {
            // Notify app to refresh balance immediately
            window.dispatchEvent(new CustomEvent('balance:refresh', { detail: { transactionId } }));
            if (!isBackground) {
              toast.success("Payment completed! Your credit has been topped up.");
              setOpen(false);
              setFormData({ amount: "", phone: "" });
            }
            activePolls.delete(transactionId);
            return true;
          } else if (status === 'FAILED') {
          if (!isBackground) {
            toast.error("Payment failed. Please try again.");
          }
          activePolls.delete(transactionId);
          return false;
        }

        // Wait before next attempt with exponential backoff
        const delay = delays[Math.min(attemptIndex, delays.length - 1)];
        await new Promise(resolve => setTimeout(resolve, delay));
        attemptIndex++;
      } catch (error) {
        console.error('Status check error:', error);
      }
    }

    // Timeout reached
    activePolls.delete(transactionId);
    if (!isBackground) {
      toast.error("Payment verification timed out. Please check your deposit history.");
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount);
    
    if (amount < 1000) {
      toast.error("Minimum top-up amount is Tsh 1,000");
      return;
    }

    if (!formData.phone.match(/^(07|06)\d{8}$/)) {
      toast.error("Invalid phone number format");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-deposit", {
        body: {
          amount,
          phone: formData.phone,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Payment initiated! Please check your phone and complete the payment.");
        
        // Start background polling (continues even if dialog closes)
        pollPaymentStatus(data.transactionId, true);
        
        // Close dialog immediately to not block user
        setOpen(false);
        setFormData({ amount: "", phone: "" });
      } else {
        toast.error(data?.error || "Top-up failed");
      }
    } catch (error: any) {
      console.error('Top-up error:', error);
      toast.error(error.message || "Failed to initiate top-up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          Top Up Credit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Top Up Credit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount (Tsh) *</Label>
            <Input
              id="amount"
              type="number"
              min="1000"
              step="100"
              placeholder="Minimum 1,000"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="07XXXXXXXX"
              maxLength={10}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={!!userPhone}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              You'll receive a payment prompt on this number
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Processing..." : "Initiate Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreditTopUpDialog;
