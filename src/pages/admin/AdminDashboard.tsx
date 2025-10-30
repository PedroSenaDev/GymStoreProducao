import { useProfile } from '@/hooks/useProfile';
import { Link, Navigate, Outlet } from 'react-router-dom';
import { Loader2, LayoutDashboard, Package, Tags, User, LogOut, Settings, ExternalLink, ShoppingCart } from 'lucide-react';
import { Sidebar, SidebarBody, SidebarHeader, SidebarLink } from '@/components/admin/AdminSidebar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSessionStore } from '@/store/sessionStore';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const links = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { to: '/admin/orders', label: 'Pedidos', icon: <ShoppingCart size={20} /> },
  { to: '/admin/products', label: 'Produtos', icon: <Package size={20} /> },
  { to: '/admin/categories', label: 'Categorias', icon: <Tags size={20} /> },
  { to: '/admin/settings', label: 'Configurações', icon: <Settings size={20} /> },
];

const SidebarLogo = () => {
  return (
    <Link to="/" className="flex items-center text-2xl font-semibold tracking-widest uppercase transition-opacity hover:opacity-80 text-sidebar-foreground">
      <div
        className={cn(
            "whitespace-pre"
        )}
      >
        <span className="font-black">GYM</span>
        <span className="font-light">STORE</span>
      </div>
    </Link>
  )
}

const AdminLayoutContent = () => {
  const { logout } = useSessionStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
          queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
          queryClient.invalidateQueries({ queryKey: ['products'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-muted/40">
      <SidebarBody className="border-r border-sidebar-border">
        <div className="flex flex-col justify-between h-full text-sidebar-foreground">
          <div>
            <SidebarHeader>
              <SidebarLogo />
            </SidebarHeader>
            <div className="flex flex-col gap-1 px-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
        </div>
      </SidebarBody>
      <div className="flex flex-col flex-1">
        <header className="flex h-16 items-center justify-end gap-4 border-b bg-background px-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link to="/profile">
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Gerenciar Perfil</span>
                </DropdownMenuItem>
              </Link>
              <Link to="/">
                <DropdownMenuItem className="cursor-pointer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  <span>Ver Site</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default function AdminDashboardLayout() {
  const { data: profile, isLoading } = useProfile();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!profile?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <Sidebar>
      <AdminLayoutContent />
    </Sidebar>
  );
}