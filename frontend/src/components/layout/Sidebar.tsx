import { NavLink } from 'react-router-dom';
import {
  Home,
  Search,
  FileText,
  CreditCard,
  History,
  User,
  Shield,
  Users,
  Activity,
  Bookmark,
  Edit2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { to: '/app', label: 'Ana Sayfa', icon: Home },
  { to: '/app/search', label: 'Arama', icon: Search },
  { to: '/app/saved', label: 'Kaydedilenler', icon: Bookmark },
  { to: '/app/petitions', label: 'Dilekçeler', icon: FileText },
  { to: '/app/editor', label: 'Editör', icon: Edit2 },
  { to: '/app/history', label: 'Geçmiş', icon: History },
  { to: '/app/subscription', label: 'Abonelik', icon: CreditCard },
  { to: '/app/profile', label: 'Profil', icon: User },
];

const adminItems = [
  { to: '/admin', label: 'Dashboard', icon: Shield },
  { to: '/admin/users', label: 'Kullanıcılar', icon: Users },
  { to: '/admin/monitoring', label: 'Sistem', icon: Activity },
];

export function Sidebar() {
  const { state } = useAuth();
  const isAdmin = state.user?.role === 'Admin' || state.user?.role === 'SuperAdmin';

  return (
    <aside className="w-64 glass border-r border-white/10 hidden lg:flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img
            src="/images/logo-symbol.png"
            alt="Yargısal Zeka"
            className="w-8 h-8 object-contain drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]"
          />
          <span className="font-semibold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Yargısal Zeka
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/app'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}

        {/* Admin Section */}
        {isAdmin && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="px-3 mb-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
              Admin
            </div>
            {adminItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                    ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="px-3 py-2 text-xs text-slate-500">
          © 2026 Yargısal Zeka
        </div>
      </div>
    </aside>
  );
}
