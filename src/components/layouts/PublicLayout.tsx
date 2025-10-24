import { Header } from '@/components/Header';
import { Outlet } from 'react-router-dom';
import { WhatsAppButton } from '../WhatsAppButton';

export const PublicLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-black">
      <Header />
      <main>
        <Outlet />
      </main>
      <WhatsAppButton />
    </div>
  );
};