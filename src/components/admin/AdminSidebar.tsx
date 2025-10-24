import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Package, Users } from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Produtos', icon: Package },
  { href: '/admin/users', label: 'Usuários', icon: Users },
];

export const AdminSidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-64 flex-shrink-0 border-r bg-background p-4">
      <h2 className="mb-4 text-lg font-semibold tracking-tight">Admin</h2>
      <nav className="flex flex-col space-y-1">
        {navItems.map((item) => (
          <Button
            key={item.href}
            asChild
            variant={location.pathname === item.href ? 'secondary' : 'ghost'}
            className="w-full justify-start"
          >
            <Link to={item.href}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </Link>
          </Button>
        ))}
      </nav>
    </aside>
  );
};