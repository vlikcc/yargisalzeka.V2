import { NavLink } from 'react-router-dom';
import {
  Home,
  Search,
  FileText,
  CreditCard,
  History,
  User,
  BarChart3,
  Settings,
  Shield,
  Users,
  Activity
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navigationItems = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/search', label: 'Akıllı Arama', icon: Search },
  { to: '/petitions', label: 'Dilekçeler', icon: FileText },
  { to: '/history', label: 'Geçmiş', icon: History },
  { to: '/subscription', label: 'Abonelik', icon: CreditCard },
  { to: '/profile', label: 'Profil', icon: User },
];

const adminNavigationItems = [
  { to: '/admin', label: 'Admin Dashboard', icon: Shield },
  { to: '/admin/users', label: 'Kullanıcı Yönetimi', icon: Users },
  { to: '/admin/monitoring', label: 'Sistem Monitoring', icon: Activity },
];

export function Sidebar() {
  const { state } = useAuth();
  const isAdmin = state.user?.role === 'Admin' || state.user?.role === 'SuperAdmin';
  return (
    <aside className="w-64 glass border-r border-neutral-200/50 backdrop-blur-md hidden md:flex flex-col">
      {/* Logo Section */}
      <div className="h-16 flex items-center px-6 border-b border-neutral-200/50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <div className="w-5 h-5 bg-white rounded-sm"></div>
          </div>
          <span className="text-lg font-semibold text-neutral-900">Yargısal Zeka</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-soft'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-700'}`} />
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full"></div>
                  )}
                </>
              )}
            </NavLink>
          );
        })}

        {/* Admin Navigation - Only visible for admin users */}
        {isAdmin && (
          <>
            <div className="border-t border-neutral-200/50 pt-4 mt-4">
              <div className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                Admin Paneli
              </div>
              {adminNavigationItems.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                        isActive
                          ? 'bg-red-600 text-white shadow-soft'
                          : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-700'}`} />
                        <span>{item.label}</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full"></div>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </>
        )}
      </nav>

      {/* Footer Section */}
      <div className="p-4 border-t border-neutral-200/50">
        <div className="flex items-center space-x-3 p-3 bg-neutral-50 rounded-lg">
          <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-neutral-900">Kullanım İstatistikleri</p>
            <p className="text-xs text-neutral-500">Aylık kullanımınızı takip edin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
