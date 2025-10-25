import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/auth/AuthProvider";
import ScrollToTop from "./components/ScrollToTop";

// Layouts
import { PublicLayout } from "./components/layouts/PublicLayout";
import AdminDashboardLayout from "./pages/admin/AdminDashboard";

// Public Pages
import Index from "./pages/Index";
import LoginPage from "./pages/Login";
import ProductsPage from "./pages/Products";
import ProductDetailPage from "./pages/ProductDetailPage";
import ContactPage from "./pages/Contact";
import PolicyPage from "./pages/PolicyPage";
import NotFound from "./pages/NotFound";

// Admin Pages
import DashboardHomePage from "./pages/admin/DashboardHomePage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminCategoriesPage from "./pages/admin/AdminCategoriesPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/product/:id" element={<ProductDetailPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/policy/:id" element={<PolicyPage />} />
            </Route>

            {/* Auth Routes (no layout) */}
            <Route path="/login" element={<LoginPage />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboardLayout />}>
               <Route index element={<DashboardHomePage />} />
               <Route path="products" element={<AdminProductsPage />} />
               <Route path="categories" element={<AdminCategoriesPage />} />
               <Route path="settings" element={<AdminSettingsPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;