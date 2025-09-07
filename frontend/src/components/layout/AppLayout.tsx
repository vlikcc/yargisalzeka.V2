import { ReactNode, useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

// Modern layout with responsive sidebar and glass morphism effects
export function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-neutral-50 via-primary-50/5 to-neutral-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Mobile sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 glass border-r border-white/10 backdrop-blur-xl transform transition-transform duration-300 lg:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar />
      </aside>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col relative">
        <Header 
          className="fixed top-0 left-0 lg:left-72 right-0 z-30" 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />
        
        <main className="flex-1 pt-16 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className="p-6 lg:p-8">
              <div className="max-w-7xl mx-auto animate-fade-in">
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
