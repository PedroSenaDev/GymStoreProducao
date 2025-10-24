import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { Button } from './ui/button';
import { useSession } from '@/context/SessionContext';
import { User, LogOut } from 'lucide-react';

export const Header = () => {
  const { session, logout } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Logo />
        </div>
        <nav className="flex items-center space-x-6 text-sm font-medium">
          <Link to="/" className="transition-colors hover:text-foreground/80 text-foreground/60">Home</Link>
          <Link to="/products" className="transition-colors hover:text-foreground/80 text-foreground/60">Produtos</Link>
          <Link to="/contact" className="transition-colors hover:text-foreground/80 text-foreground/60">Contato</Link>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4">
          {session ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline-block">{session.user.email}</span>
              <Button variant="ghost" size="icon" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button asChild>
              <Link to="/login">
                <User className="mr-2 h-4 w-4" /> Login
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};