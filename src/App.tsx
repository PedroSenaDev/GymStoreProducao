import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./components/auth/AuthProvider";
import ScrollToTop from "./components/ScrollToTop";

// Layouts
import { PublicLayout } from "./components/layouts/PublicLayout";
import { ProfileLayout } from "./components/layouts/ProfileLayout";
import AdminDashboardLayout from "./pages/admin/AdminDashboard";

// Public Pages
import Index from "./pages/Index";
import LoginPage from "./pages/Login";
import ProductsPage from "./pages/Products";
import ProductDetailPage from "./pages/ProductDetailPage";
import ContactPage from "./pages/Contact";
import PolicyPage from "./pages/PolicyPage";
import UpdatePasswordPage from "./pages/UpdatePassword";
import NotFound from "./pages/NotFound";

// Profile Pages
import ProfileDetailsPage from "./pages/profile/ProfileDetailsPage";
import AddressesPage from "./pages/profile/AddressesPage";
import OrdersPage from "./pages/profile/OrdersPage";

// Admin Pages
import DashboardHomePage from "./pages/admin/DashboardHomePage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminCategoriesPage from "./pages/admin/AdminCategoriesPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";

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

              {/* Profile Routes */}
              <Route path="/profile" element={<ProfileLayout />}>
                <Route index element={<Navigate to="details" replace />} />
                <Route path="details" element={<ProfileDetailsPage />} />
                <Route path="addresses" element={<AddressesPage />} />
                <Route path="orders" element={<OrdersPage />} />
              </Route>
            </Route>

            {/* Auth Routes (no layout) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/update-password" element={<UpdatePasswordPage />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboardLayout />}>
               <Route index element={<DashboardHomePage />} />
               <Route path="orders" element={<AdminOrdersPage />} />
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