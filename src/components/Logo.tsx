import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export const Logo = ({ className }: { className?: string }) => {
  return (
    <Link to="/" className={cn("text-2xl font-semibold tracking-widest uppercase transition-opacity hover:opacity-80", className)}>
      <span className="font-black">GYM</span>
      <span className="font-light">STORE</span>
    </Link>
  );
};