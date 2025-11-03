import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export const Logo = ({ className }: { className?: string }) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isHomePage) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // Se não estiver na página inicial, o Link navegará e o componente ScrollToTop cuidará da rolagem.
  };

  return (
    <Link 
      to="/" 
      onClick={handleClick}
      className={cn("text-2xl font-semibold tracking-widest uppercase transition-opacity hover:opacity-80", className)}
    >
      <span className="font-black">GYM</span>
      <span className="font-light">STORE</span>
    </Link>
  );
};