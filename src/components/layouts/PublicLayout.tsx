import { Header } from '@/components/Header';
import { Outlet } from 'react-router-dom';
import { WhatsAppButton } from '../WhatsAppButton';

export const PublicLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="pt-24">
        <Outlet />
      </main>
      <WhatsAppButton />
    </div>
  );
};