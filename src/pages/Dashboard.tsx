import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SellerDashboard from "@/components/dashboard/SellerDashboard";
import BuyerDashboard from "@/components/dashboard/BuyerDashboard";
import AdminPanel from "@/pages/AdminPanel";
import { toast } from "sonner";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUser(user);

      // Get user roles (may have multiple)
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (rolesData && rolesData.length > 0) {
        // Prioritize admin > seller > buyer
        const roles = rolesData.map(r => r.role);
        if (roles.includes('admin')) {
          setRole('admin');
        } else if (roles.includes('seller')) {
          setRole('seller');
        } else if (roles.includes('buyer')) {
          setRole('buyer');
        }
      }
    } catch (error) {
      console.error("Auth check error:", error);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (role === "admin") {
    return <AdminPanel skipAuthCheck />;
  } else if (role === "seller") {
    return <SellerDashboard />;
  } else if (role === "buyer") {
    return <BuyerDashboard />;
  }

  return (
    <div className="p-4 text-center">
      <p className="text-muted-foreground">Loading dashboard...</p>
    </div>
  );
};

export default Dashboard;