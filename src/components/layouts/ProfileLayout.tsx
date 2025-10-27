import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { User, MapPin, Package } from 'lucide-react';
import { useSessionStore } from '@/store/sessionStore';
import { cn } from '@/lib/utils';

const navLinks = [
  { to: '/profile/details', label: 'Meu Perfil', icon: User },
  { to: '/profile/addresses', label: 'Meus Endereços', icon: MapPin },
  { to: '/profile/orders', label: 'Meus Pedidos', icon: Package },
];

export const ProfileLayout = () => {
  const session = useSessionStore((state) => state.session);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-col gap-8 md:flex-row md:gap-12">
        <aside className="md:w-1/4 lg:w-1/5">
          <nav className="flex flex-wrap gap-2 md:flex-col md:space-y-1 md:gap-0">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-primary flex-shrink-0',
                    isActive ? 'bg-muted font-semibold text-primary' : 'text-muted-foreground'
                  )
                }
              >
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};