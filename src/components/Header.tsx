import { Link } from 'react-router-dom';
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
          {navItems.map(item => <NavLink key={item.to} to={item.to}>{item.label}</NavLink>)}
        </nav>
        
        {/* Right: Icons & Mobile Nav */}
        <div className="flex items-center justify-end space-x-2">
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 transition-colors hover:bg-zinc-200">
                <ShoppingCart className="h-5 w-5 text-zinc-900" />
            </Button>

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
                                        <Link to={item.to} className="block py-3 text-lg font-medium text-zinc-800 transition-colors hover:text-black">
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