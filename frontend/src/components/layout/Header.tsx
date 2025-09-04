import { Bell, User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const { state, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 glass border-b border-neutral-200/50 backdrop-blur-md flex items-center px-6 justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <div className="w-5 h-5 bg-white rounded-sm"></div>
        </div>
        <h1 className="text-xl font-semibold text-neutral-900">Yargısal Zeka</h1>
        <span className="px-2 py-1 bg-accent-100 text-accent-700 text-xs font-medium rounded-full">
          Beta
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button className="p-2 text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors duration-200">
          <Bell className="w-5 h-5" />
        </button>

        {/* User Menu */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <div className="text-sm font-medium text-neutral-900">
              {state.user?.firstName || state.user?.email}
            </div>
            <div className="text-xs text-neutral-500">
              {state.user?.email}
            </div>
          </div>

          <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-primary-600" />
          </div>

          <div className="relative group">
            <button className="p-2 text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors duration-200">
              <Settings className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-large border border-neutral-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="py-2">
                <button
                  onClick={() => navigate('/app/profile')}
                  className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors duration-200"
                >
                  Profil Ayarları
                </button>
                <button
                  onClick={() => navigate('/app/subscription')}
                  className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors duration-200"
                >
                  Abonelik
                </button>
                <div className="border-t border-neutral-200 my-1"></div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-error-600 hover:bg-error-50 hover:text-error-700 transition-colors duration-200 flex items-center"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Çıkış Yap
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
