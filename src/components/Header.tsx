import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from './Logo';
import { Button } from './ui/button';
import { ShoppingCart, Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose
} from "@/components/ui/sheet";
import { UserNav } from './UserNav';
import { useCartStore } from '@/store/cartStore';
import { CartSheet } from './CartSheet';
import { Badge } from './ui/badge';

const NavLink = ({ to, children, onClick }: { to: string; children: React.ReactNode; onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void }) => (
  <Link
    to={to}
    onClick={onClick}
    className="relative z-10 text-sm font-medium text-zinc-900 transition-colors duration-300 ease-out group px-3 py-2 rounded-md hover:text-white notranslate"
    translate="no"
  >
    {children}
    <span className="absolute inset-0 h-full w-full rounded-md -z-10 scale-x-0 origin-left transition-transform duration-300 ease-out group-hover:scale-x-100 bg-black" />
  </Link>
);

export const Header = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const cartItems = useCartStore(state => state.items);
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isHomePage) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navItems = [
    { to: '/', label: 'Início' },
    { to: '/products', label: 'Produtos' },
    { to: '/contact', label: 'Contato' },
  ];

  return (
    <header className="fixed top-0 z-50 w-full border-b bg-white/60 shadow-sm backdrop-blur-sm">
      <div className="container flex h-20 items-center justify-between md:grid md:h-24 md:grid-cols-3">
        {/* Left: Logo */}
        <div className="flex justify-start">
          <Logo />
        </div>

        {/* Center: Desktop Nav */}
        <nav className="hidden md:flex justify-center items-center space-x-10 text-sm font-medium">
          {navItems.map(item => (
            <NavLink 
              key={item.to} 
              to={item.to} 
              onClick={item.to === '/' ? handleHomeClick : undefined}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        
        {/* Right: Icons & Mobile Nav */}
        <div className="flex items-center justify-end space-x-2">
            <Button variant="ghost" size="icon" className="relative rounded-full h-10 w-10 transition-colors hover:bg-zinc-200" onClick={() => setIsCartOpen(true)}>
                <ShoppingCart className="h-5 w-5 text-zinc-900" />
                {cartItems.length > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full p-0 text-xs">
                    {cartItems.length}
                  </Badge>
                )}
            </Button>
            <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />

            <UserNav />

            <div className="md:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 transition-colors hover:bg-zinc-200">
                            <Menu className="h-5 w-5 text-zinc-900" />
                            <span className="sr-only">Abrir menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                        <div className="p-6">
                            <div className="mb-8">
                                <Logo />
                            </div>
                            <nav className="flex flex-col space-y-4">
                                {navItems.map(item => (
                                    <SheetClose asChild key={item.to}>
                                        <Link 
                                          to={item.to} 
                                          onClick={item.to === '/' ? handleHomeClick : undefined}
                                          className="block py-3 text-lg font-medium text-zinc-800 transition-colors hover:text-black notranslate"
                                          translate="no"
                                        >
                                            {item.label}
                                        </Link>
                                    </SheetClose>
                                ))}
                            </nav>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </div>
      </div>
    </header>
  );
};