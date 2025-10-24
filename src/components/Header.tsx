import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { Button } from './ui/button';
import { ShoppingCart, User, LogOut } from 'lucide-react';
import { useSessionStore } from '@/store/sessionStore';

const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link to={to} className="relative text-sm font-medium text-white/90 transition-colors hover:text-white group">
    {children}
    <span className="absolute bottom-[-4px] left-0 h-[2px] w-full scale-x-0 bg-white transition-transform duration-300 ease-out group-hover:scale-x-100" />
  </Link>
);

export const Header = () => {
  const { session, logout } = useSessionStore();

  return (
    <header className="absolute top-0 z-50 w-full">
      <div className="container flex h-24 items-center text-white">
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
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-white/10 transition-colors">
                <ShoppingCart className="h-5 w-5" />
            </Button>
            {session ? (
              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-white/10 transition-colors" onClick={logout}>
                  <LogOut className="h-5 w-5" />
              </Button>
            ) : (
              <Link to="/login">
                  <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-white/10 transition-colors">
                      <User className="h-5 w-5" />
                  </Button>
              </Link>
            )}
        </div>
      </div>
    </header>
  );
};