import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Layout from "./components/Layout";
import Feed from "./pages/Feed";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import AdminPanel from "./pages/AdminPanel";
import BookView from "./pages/BookView";
import InternalPdfReader from "./components/InternalPdfReader";
import NotFound from "./pages/NotFound";

import { MiniBrowserPrompt } from "./components/MiniBrowserPrompt";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <MiniBrowserPrompt />
        <PWAInstallPrompt />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Feed />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/adminpanel" element={<AdminPanel />} />
              <Route path="/book/:id" element={<BookView />} />
              <Route path="/read/:id" element={<InternalPdfReader />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
