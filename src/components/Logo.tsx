import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export const Logo = ({ variant = 'dark' }: { variant?: 'light' | 'dark' }) => {
  return (
    <Link to="/" className="text-2xl font-semibold tracking-widest uppercase transition-opacity hover:opacity-80">
      <span className={cn("font-black", variant === 'dark' ? "text-zinc-900" : "text-white")}>GYM</span>
      <span className={cn("font-light", variant === 'dark' ? "text-zinc-900" : "text-zinc-400")}>STORE</span>
    </Link>
  );
};