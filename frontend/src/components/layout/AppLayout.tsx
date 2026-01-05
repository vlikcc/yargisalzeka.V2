import { ReactNode, useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Home, Search, FileText, History, CreditCard, User, Edit2, Bookmark } from 'lucide-react';

const mobileNavItems = [
  { to: '/app', label: 'Ana Sayfa', icon: Home },
  { to: '/app/search', label: 'Arama', icon: Search },
  { to: '/app/saved', label: 'Kaydedilenler', icon: Bookmark },
  { to: '/app/petitions', label: 'Dilekçeler', icon: FileText },
  { to: '/app/editor', label: 'Editör', icon: Edit2 },
  { to: '/app/history', label: 'Geçmiş', icon: History },
  { to: '/app/subscription', label: 'Abonelik', icon: CreditCard },
  { to: '/app/profile', label: 'Profil', icon: User },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 glass transform transition-transform duration-300 lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img
              src="/images/logo-symbol.png"
              alt="Yargısal Zeka"
              className="w-8 h-8 object-contain drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]"
            />
            <span className="font-semibold text-white">Yargısal Zeka</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {mobileNavItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          className="sticky top-0 z-30"
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-auto">
          <div className="container-app py-6 lg:py-8">
            <div className="animate-fade-in">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
