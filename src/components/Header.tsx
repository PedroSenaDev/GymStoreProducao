import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from './Logo';
import { Button } from './ui/button';
import { ShoppingCart, User, LogOut } from 'lucide-react';
import { useSessionStore } from '@/store/sessionStore';
import { cn } from '@/lib/utils';

const NavLink = ({ to, children, isTransparent }: { to: string; children: React.ReactNode; isTransparent: boolean }) => (
  <Link
    to={to}
    className={cn(
      "relative z-10 text-sm font-medium transition-colors duration-300 ease-out group px-3 py-2 rounded-md",
      isTransparent ? "text-white" : "text-zinc-900 hover:text-white"
    )}
  >
    {children}
    <span className={cn(
      "absolute inset-0 h-full w-full rounded-md -z-10 scale-x-0 origin-left transition-transform duration-300 ease-out group-hover:scale-x-100",
      isTransparent ? "bg-white/20" : "bg-black"
    )} />
  </Link>
);

export const Header = () => {
  const { session, logout } = useSessionStore();
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    if (isHomePage) {
      window.addEventListener('scroll', handleScroll);
      handleScroll(); // Check on initial load
      return () => window.removeEventListener('scroll', handleScroll);
    } else {
      setScrolled(true);
    }
  }, [isHomePage]);

  const isTransparent = isHomePage && !scrolled;

  return (
    <header className={cn(
      "fixed top-0 z-50 w-full transition-all duration-300",
      isTransparent ? "border-transparent" : "border-b bg-white/80 shadow-sm backdrop-blur-sm"
    )}>
      <div className="container flex h-24 items-center">
        <div className="mr-4 hidden md:flex">
          <Logo variant={isTransparent ? 'light' : 'dark'} />
        </div>
        <nav className="hidden md:flex items-center space-x-10 text-sm font-medium mx-auto">
          <NavLink to="/" isTransparent={isTransparent}>Início</NavLink>
          <NavLink to="/products" isTransparent={isTransparent}>Produtos</NavLink>
          <NavLink to="/contact" isTransparent={isTransparent}>Contato</NavLink>
        </nav>
        {/* Mobile Logo */}
        <div className="md:hidden flex-1">
            <Logo variant={isTransparent ? 'light' : 'dark'} />
        </div>
        <div className="flex items-center justify-end space-x-2">
            <Button variant="ghost" size="icon" className={cn("rounded-full h-10 w-10 transition-colors", isTransparent ? "hover:bg-white/20" : "hover:bg-zinc-200")}>
                <ShoppingCart className={cn("h-5 w-5", isTransparent ? "text-white" : "text-zinc-900")} />
            </Button>
            {session ? (
              <Button variant="ghost" size="icon" className={cn("rounded-full h-10 w-10 transition-colors", isTransparent ? "hover:bg-white/20" : "hover:bg-zinc-200")} onClick={logout}>
                  <LogOut className={cn("h-5 w-5", isTransparent ? "text-white" : "text-zinc-900")} />
              </Button>
            ) : (
              <Link to="/login">
                  <Button variant="ghost" size="icon" className={cn("rounded-full h-10 w-10 transition-colors", isTransparent ? "hover:bg-white/20" : "hover:bg-zinc-200")}>
                      <User className={cn("h-5 w-5", isTransparent ? "text-white" : "text-zinc-900")} />
                  </Button>
              </Link>
            )}
        </div>
      </div>
    </header>
  );
};