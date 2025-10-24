import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { Button } from './ui/button';
import { ShoppingCart, User } from 'lucide-react';

export const Header = () => {
  return (
    <header className="absolute top-0 z-50 w-full">
      <div className="container flex h-20 items-center text-white">
        <div className="mr-4 hidden md:flex">
          <Logo />
        </div>
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium mx-auto">
          <Link to="/" className="transition-colors hover:text-white/80">Início</Link>
          <Link to="/products" className="transition-colors hover:text-white/80">Produtos</Link>
          <Link to="/contact" className="transition-colors hover:text-white/80">Contato</Link>
        </nav>
        {/* Mobile Logo */}
        <div className="md:hidden flex-1">
            <Logo />
        </div>
        <div className="flex items-center justify-end space-x-4">
            <Button variant="ghost" size="icon" className="hover:bg-white/10">
                <ShoppingCart className="h-5 w-5" />
            </Button>
            <Link to="/login">
                <Button variant="ghost" size="icon" className="hover:bg-white/10">
                    <User className="h-5 w-5" />
                </Button>
            </Link>
        </div>
      </div>
    </header>
  );
};