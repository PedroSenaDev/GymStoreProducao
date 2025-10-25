import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { Button } from './ui/button';
import { ShoppingCart, User, LogOut, LayoutDashboard } from 'lucide-react';
import { useSessionStore } from '@/store/sessionStore';
import { useProfile } from '@/hooks/useProfile';

const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link
    to={to}
    className="relative z-10 text-sm font-medium text-zinc-900 transition-colors duration-300 ease-out group px-3 py-2 rounded-md hover:text-white"
  >
    {children}
    <span className="absolute inset-0 h-full w-full rounded-md -z-10 scale-x-0 origin-left transition-transform duration-300 ease-out group-hover:scale-x-100 bg-black" />
  </Link>
);

export const Header = () => {
  const { session, logout } = useSessionStore();
  const { data: profile } = useProfile();

  return (
    <header className="fixed top-0 z-50 w-full border-b bg-white/60 shadow-sm backdrop-blur-sm">
      <div className="container flex h-24 items-center">
        <div className="mr-4 hidden md:flex">
          <Logo />
        </div>
        <nav className="hidden md:flex items-center space-x-10 text-sm font-medium mx-auto">
          <NavLink to="/">Início</NavLink>
          <NavLink to="/products">Produtos</NavLink>
          <NavLink to="/contact">Contato</NavLink>
        </nav>
        {/* Mobile Logo */}
        <div className="md:hidden flex-1">
            <Logo />
        </div>
        <div className="flex items-center justify-end space-x-2">
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 transition-colors hover:bg-zinc-200">
                <ShoppingCart className="h-5 w-5 text-zinc-900" />
            </Button>

            {profile?.isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 transition-colors hover:bg-zinc-200">
                  <LayoutDashboard className="h-5 w-5 text-zinc-900" />
                </Button>
              </Link>
            )}

            {session ? (
              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 transition-colors hover:bg-zinc-200" onClick={logout}>
                  <LogOut className="h-5 w-5 text-zinc-900" />
              </Button>
            ) : (
              <Link to="/login">
                  <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 transition-colors hover:bg-zinc-200">
                      <User className="h-5 w-5 text-zinc-900" />
                  </Button>
              </Link>
            )}
        </div>
      </div>
    </header>
  );
};