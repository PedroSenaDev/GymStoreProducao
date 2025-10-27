import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { User, LogOut, LayoutDashboard, Settings } from 'lucide-react';
import { useSessionStore } from '@/store/sessionStore';
import { useProfile } from '@/hooks/useProfile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const UserNav = () => {
    const { session, logout } = useSessionStore();
    const { data: profile } = useProfile();

    if (!session) {
        return (
            <Link to="/login">
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 transition-colors hover:bg-zinc-200">
                    <User className="h-5 w-5 text-zinc-900" />
                </Button>
            </Link>
        );
    }

    return (
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
    );
}