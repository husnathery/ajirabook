import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminWithdrawals from "@/components/admin/AdminWithdrawals";
import AdminDeposits from "@/components/admin/AdminDeposits";
import AdminCategories from "@/components/admin/AdminCategories";
import AdminStats from "@/components/admin/AdminStats";
import AdminBooks from "@/components/admin/AdminBooks";
import AdminBookReviews from "@/components/admin/AdminBookReviews";
import AdminSettings from "@/components/admin/AdminSettings";

interface AdminPanelProps {
  skipAuthCheck?: boolean;
}

const AdminPanel = ({ skipAuthCheck = false }: AdminPanelProps) => {
  const [loading, setLoading] = useState(!skipAuthCheck);
  const [isAdmin, setIsAdmin] = useState(skipAuthCheck);

  useEffect(() => {
    if (!skipAuthCheck) {
      checkAdmin();
    }
  }, [skipAuthCheck]);

  const checkAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleData?.role === "admin") {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      toast.error("Failed to verify admin access");
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

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Admin Panel</h1>

      <AdminStats />

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="books">Books</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          <TabsTrigger value="deposits">Deposits</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <AdminUsers />
        </TabsContent>

        <TabsContent value="books">
          <AdminBooks />
        </TabsContent>

        <TabsContent value="reviews">
          <AdminBookReviews />
        </TabsContent>

        <TabsContent value="withdrawals">
          <AdminWithdrawals />
        </TabsContent>

        <TabsContent value="deposits">
          <AdminDeposits />
        </TabsContent>

        <TabsContent value="categories">
          <AdminCategories />
        </TabsContent>

        <TabsContent value="settings">
          <AdminSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
