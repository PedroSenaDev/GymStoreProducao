import { Header } from '@/components/Header';
import { Outlet, useLocation } from 'react-router-dom';
import { WhatsAppButton } from '../WhatsAppButton';
import { cn } from '@/lib/utils';
import { Footer } from '../Footer';
import { BirthdayRewardNotifier } from '../BirthdayRewardNotifier';

export const PublicLayout = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className={cn('flex-grow', !isHomePage && 'pt-20 md:pt-24')}>
        <Outlet />
      </main>
      <WhatsAppButton />
      <BirthdayRewardNotifier />
      <Footer />
    </div>
  );
};