import { Link } from 'react-router-dom';

export const Logo = () => {
  return (
    <Link to="/" className="text-2xl font-semibold tracking-widest uppercase transition-opacity hover:opacity-80">
      <span className="font-black text-zinc-900">GYM</span>
      <span className="font-light text-zinc-500">STORE</span>
    </Link>
  );
};