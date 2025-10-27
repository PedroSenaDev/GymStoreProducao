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
    <div className="container py-12 md:py-16">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <aside className="md:col-span-1">
          <nav className="flex flex-col space-y-2">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                    isActive && 'bg-muted text-primary font-semibold'
                  )
                }
              >
                <Icon className="h-5 w-5" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="md:col-span-3">
          <Outlet />
        </main>
      </div>
    </div>
  );
};