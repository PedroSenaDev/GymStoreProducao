import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { Button } from './ui/button';
import { ShoppingCart, User, LogOut, LayoutDashboard, Menu, Settings } from 'lucide-react';
import { useSessionStore } from '@/store/sessionStore';
import { useProfile } from '@/hooks/useProfile';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  const navItems = [
    { to: '/', label: 'Início' },
    { to: '/products', label: 'Produtos' },
    { to: '/contact', label: 'Contato' },
  ];

  return (
    <header className="fixed top-0 z-50 w-full border-b bg-white/60 shadow-sm backdrop-blur-sm">
      <div className="container flex h-20 md:h-24 items-center justify-between">
        <div className="flex-shrink-0">
          <Logo />
        </div>

        <nav className="hidden md:flex items-center space-x-10 text-sm font-medium absolute left-1/2 -translate-x-1/2">
          {navItems.map(item => <NavLink key={item.to} to={item.to}>{item.label}</NavLink>)}
        </nav>
        
        <div className="flex items-center justify-end space-x-2">
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 transition-colors hover:bg-zinc-200">
                <ShoppingCart className="h-5 w-5 text-zinc-900" />
            </Button>

            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 transition-colors hover:bg-zinc-200">
                    <User className="h-5 w-5 text-zinc-900" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link to="/profile">
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Gerenciar Perfil</span>
                    </DropdownMenuItem>
                  </Link>
                  {profile?.isAdmin && (
                    <Link to="/admin">
                      <DropdownMenuItem className="cursor-pointer">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Painel Admin</span>
                      </DropdownMenuItem>
                    </Link>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login">
                  <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 transition-colors hover:bg-zinc-200">
                      <User className="h-5 w-5 text-zinc-900" />
                  </Button>
              </Link>
            )}

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