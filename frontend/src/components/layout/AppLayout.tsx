import { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

// Yeni düzen: Üstte tam genişlik Header, altında sol Sidebar sağda içerik
export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-neutral-50 text-neutral-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header className="fixed top-0 left-64 right-0 z-40" />
        <main className="flex-1 pt-16 p-6 lg:p-8 bg-neutral-50/50 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
