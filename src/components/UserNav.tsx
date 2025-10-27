import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { User } from 'lucide-react';
import { useSessionStore } from '@/store/sessionStore';
import { Skeleton } from '@/components/ui/skeleton';

export const UserNav = () => {
    const { session, isLoading } = useSessionStore();

    if (isLoading) {
        return <Skeleton className="h-10 w-10 rounded-full" />;
    }

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
        <Link to="/profile">
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 transition-colors hover:bg-zinc-200">
                <User className="h-5 w-5 text-zinc-900" />
            </Button>
        </Link>
    );
}