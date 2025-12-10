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
  Scale,
  Bookmark
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { to: '/app', label: 'Ana Sayfa', icon: Home },
  { to: '/app/search', label: 'Arama', icon: Search },
  { to: '/app/saved', label: 'Kaydedilenler', icon: Bookmark },
  { to: '/app/petitions', label: 'Dilekçeler', icon: FileText },
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
    <aside className="w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-800 rounded-lg flex items-center justify-center">
            <Scale className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-900">Yargısal Zeka</span>
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
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-800'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}

        {/* Admin Section */}
        {isAdmin && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="px-3 mb-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
              Admin
            </div>
            {adminItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-800'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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
      <div className="p-4 border-t border-slate-100">
        <div className="px-3 py-2 text-xs text-slate-400">
          © 2024 Yargısal Zeka
        </div>
      </div>
    </aside>
  );
}
