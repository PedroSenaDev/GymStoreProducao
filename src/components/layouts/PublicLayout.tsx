import { Header } from '@/components/Header';
import { Outlet, useLocation } from 'react-router-dom';
import { WhatsAppButton } from '../WhatsAppButton';

export const PublicLayout = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className={!isHomePage ? 'pt-24' : ''}>
        <Outlet />
      </main>
      <WhatsAppButton />
    </div>
  );
};