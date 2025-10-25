import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Package, Tags, ExternalLink } from 'lucide-react';
import { Separator } from '../ui/separator';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Produtos', icon: Package },
  { href: '/admin/categories', label: 'Categorias', icon: Tags },
  // { href: '/admin/orders', label: 'Pedidos', icon: ShoppingCart }, // Placeholder for future
  // { href: '/admin/users', label: 'Usuários', icon: Users }, // Placeholder for future
];

export const AdminSidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-64 flex-shrink-0 border-r bg-background p-4 flex flex-col">
      <div>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Admin</h2>
        <nav className="flex flex-col space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.href}
              asChild
              variant={location.pathname.startsWith(item.href) && (item.href !== '/admin' || location.pathname === '/admin') ? 'secondary' : 'ghost'}
              className="w-full justify-start"
            >
              <Link to={item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>
      </div>
      <div className="mt-auto">
        <Separator className="my-4" />
        <Button
          asChild
          variant="outline"
          className="w-full justify-start"
        >
          <Link to="/" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Ver Site
          </Link>
        </Button>
      </div>
    </aside>
  );
};