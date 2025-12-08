import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface WithdrawalDialogProps {
  balance: number;
}

const WithdrawalDialog = ({ balance }: WithdrawalDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    phone: "",
    name: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount);
    
    if (amount < 5000) {
      toast.error("Minimum withdrawal amount is Tsh 5,000");
      return;
    }

    if (amount > balance) {
      toast.error("Insufficient balance");
      return;
    }

    if (!formData.phone.match(/^(07|06)\d{8}$/)) {
      toast.error("Invalid phone number format");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-withdrawal", {
        body: {
          amount,
          phone: formData.phone,
          name: formData.name,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Withdrawal request submitted! Fee: Tsh ${data.fee.toLocaleString()}, You'll receive: Tsh ${data.netAmount.toLocaleString()}`);
        setOpen(false);
        setFormData({ amount: "", phone: "", name: "" });
      } else {
        toast.error(data?.error || "Withdrawal request failed");
      }
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast.error(error.message || "Failed to request withdrawal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full" size="lg">
          Request Withdrawal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Withdrawal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Available Balance</p>
            <p className="text-2xl font-bold text-primary">Tsh {balance.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">5% withdrawal fee applies</p>
          </div>
          <div>
            <Label htmlFor="amount">Amount (Tsh) *</Label>
            <Input
              id="amount"
              type="number"
              min="5000"
              step="100"
              placeholder="Minimum 5,000"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Submitting..." : "Submit Request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawalDialog;
