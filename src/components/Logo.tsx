import { Link } from 'react-router-dom';

export const Logo = () => {
  return (
    <Link to="/" className="text-2xl font-semibold tracking-widest text-white uppercase transition-opacity hover:opacity-80">
      <span className="font-black">GYM</span>
      <span className="font-light text-zinc-400">STORE</span>
    </Link>
  );
};