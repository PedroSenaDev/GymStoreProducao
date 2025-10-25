import { useProfile } from '@/hooks/useProfile';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2, LayoutDashboard, Package, Tags, ExternalLink } from 'lucide-react';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/admin/AnimatedSidebar';
import { Separator } from '@/components/ui/separator';

const links = [
  { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard /> },
  { to: '/admin/products', label: 'Produtos', icon: <Package /> },
  { to: '/admin/categories', label: 'Categorias', icon: <Tags /> },
];

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
      <div className="flex flex-col md:flex-row min-h-screen w-full">
        <SidebarBody className="border-r">
          <div className="flex flex-col justify-between h-full p-2">
            <div className="flex flex-col">
              <h2 className="mb-4 text-lg font-semibold tracking-tight p-2">Admin</h2>
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
            <div>
              <Separator className="my-4" />
              <SidebarLink link={{ to: '/', label: 'Ver Site', icon: <ExternalLink /> }} />
            </div>
          </div>
        </SidebarBody>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </Sidebar>
  );
}