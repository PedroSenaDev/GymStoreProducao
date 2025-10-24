import { Link } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';

export const Logo = () => {
  return (
    <Link to="/" className="flex items-center gap-2 text-2xl font-semibold tracking-widest text-white uppercase transition-opacity hover:opacity-80">
      <Dumbbell className="h-6 w-6" />
      GYMSTORE
    </Link>
  );
};