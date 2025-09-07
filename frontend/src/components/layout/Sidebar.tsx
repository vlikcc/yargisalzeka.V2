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
  { to: '/app', label: 'Dashboard', icon: Home, gradient: 'from-blue-500 to-blue-700' },
  { to: '/app/search', label: 'Akıllı Arama', icon: Search, gradient: 'from-primary-500 to-primary-700' },
  { to: '/app/petitions', label: 'Dilekçeler', icon: FileText, gradient: 'from-green-500 to-green-700' },
  { to: '/app/history', label: 'Geçmiş', icon: History, gradient: 'from-amber-500 to-amber-700' },
  { to: '/app/subscription', label: 'Abonelik', icon: CreditCard, gradient: 'from-purple-500 to-purple-700' },
  { to: '/app/profile', label: 'Profil', icon: User, gradient: 'from-pink-500 to-pink-700' },
];

const adminNavigationItems = [
  { to: '/admin', label: 'Admin Dashboard', icon: Shield, gradient: 'from-red-500 to-red-700' },
  { to: '/admin/users', label: 'Kullanıcı Yönetimi', icon: Users, gradient: 'from-orange-500 to-orange-700' },
  { to: '/admin/monitoring', label: 'Sistem Monitoring', icon: Activity, gradient: 'from-cyan-500 to-cyan-700' },
];

export function Sidebar() {
  const { state } = useAuth();
  const isAdmin = state.user?.role === 'Admin' || state.user?.role === 'SuperAdmin';
  return (
    <aside className="w-72 glass border-r border-white/10 backdrop-blur-xl hidden lg:flex flex-col">
      {/* Logo Section */}
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-glow animate-float">
            <div className="w-6 h-6 bg-white rounded-lg"></div>
          </div>
          <span className="text-lg font-bold gradient-text">Yargısal Zeka</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-6 space-y-2">
        {navigationItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app'}
              className={({ isActive }) =>
                `relative flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group overflow-hidden ${
                  isActive
                    ? 'text-white shadow-glow'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} rounded-xl`}></div>
                  )}
                  <div className="relative flex items-center space-x-3 w-full">
                    <div className={`p-2 rounded-lg transition-all duration-300 ${
                      isActive 
                        ? 'bg-white/20' 
                        : 'bg-neutral-100 group-hover:bg-primary-100'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        isActive 
                          ? 'text-white' 
                          : 'text-neutral-600 group-hover:text-primary-600'
                      }`} />
                    </div>
                    <span className={`flex-1 ${
                      isActive ? 'font-semibold' : ''
                    }`}>{item.label}</span>
                    {isActive && (
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    )}
                  </div>
                </>
              )}
            </NavLink>
          );
        })}

        {/* Admin Navigation - Only visible for admin users */}
        {isAdmin && (
          <>
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="px-4 py-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Admin Paneli
              </div>
              <div className="mt-2 space-y-2">
                {adminNavigationItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `relative flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group overflow-hidden ${
                          isActive
                            ? 'text-white shadow-glow'
                            : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/50'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} rounded-xl`}></div>
                          )}
                          <div className="relative flex items-center space-x-3 w-full">
                            <div className={`p-2 rounded-lg transition-all duration-300 ${
                              isActive 
                                ? 'bg-white/20' 
                                : 'bg-neutral-100 group-hover:bg-red-100'
                            }`}>
                              <Icon className={`w-5 h-5 ${
                                isActive 
                                  ? 'text-white' 
                                  : 'text-neutral-600 group-hover:text-red-600'
                              }`} />
                            </div>
                            <span className={`flex-1 ${
                              isActive ? 'font-semibold' : ''
                            }`}>{item.label}</span>
                            {isActive && (
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            )}
                          </div>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </nav>

      {/* Footer Section */}
      <div className="p-6 border-t border-white/10">
        <div className="glass-card p-4 hover:shadow-glow transition-all duration-300 cursor-pointer">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-soft">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-neutral-900">Kullanım İstatistikleri</p>
              <p className="text-xs text-neutral-500">Aylık kullanımınızı takip edin</p>
            </div>
          </div>
          <div className="mt-3 h-2 bg-neutral-100 rounded-full overflow-hidden">
            <div className="h-full w-3/4 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full animate-pulse-gentle"></div>
          </div>
        </div>
      </div>
    </aside>
  );
}
