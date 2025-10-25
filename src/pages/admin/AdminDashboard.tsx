import { useProfile } from '@/hooks/useProfile';
import { Link, Navigate, Outlet } from 'react-router-dom';
import { Loader2, LayoutDashboard, Package, Tags, ExternalLink, Settings } from 'lucide-react';
import { Sidebar, SidebarBody, SidebarHeader, SidebarLink } from '@/components/admin/AdminSidebar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const links = [
  { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
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
          <div>
            <Separator className="my-4 bg-sidebar-border" />
            <div className="px-2">
              <SidebarLink link={{ to: '/', label: 'Ver Site', icon: <ExternalLink size={20} /> }} />
            </div>
          </div>
        </div>
      </SidebarBody>
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
        <Outlet />
      </main>
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