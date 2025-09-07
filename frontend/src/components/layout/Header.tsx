import { Bell, User, Settings, LogOut, Search, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

interface HeaderProps { 
  className?: string;
  onMenuClick?: () => void;
}

export function Header({ className, onMenuClick }: HeaderProps) {
  const { state, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className={`h-16 glass border-b border-white/10 backdrop-blur-xl flex items-center px-4 md:px-6 justify-between ${className || ''}`}>      
      <div className="flex items-center space-x-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 hover:bg-primary-50 rounded-xl transition-colors"
        >
          <Menu className="w-5 h-5 text-neutral-700" />
        </button>
        
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-glow animate-pulse-gentle">
            <div className="w-6 h-6 bg-white rounded-lg"></div>
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text hidden sm:block">Yargısal Zeka</h1>
            <span className="px-2.5 py-0.5 bg-gradient-to-r from-accent-100 to-accent-200 text-accent-800 text-xs font-semibold rounded-full">
              Beta
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Search button - Mobile only */}
        <button className="md:hidden p-2.5 hover:bg-primary-50 rounded-xl transition-all duration-200 hover:scale-105">
          <Search className="w-5 h-5 text-neutral-600" />
        </button>
        
        {/* Notifications */}
        <button className="relative p-2.5 text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200 hover:scale-105">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full animate-pulse"></span>
        </button>

        {/* User Menu */}
        <div className="flex items-center space-x-3">
          <div className="text-right hidden md:block">
            <div className="text-sm font-semibold text-neutral-900">
              {state.user?.firstName || state.user?.email?.split('@')[0]}
            </div>
            <div className="text-xs text-neutral-500">
              {state.user?.email}
            </div>
          </div>

          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center shadow-soft hover:shadow-medium transition-all duration-200">
            <User className="w-5 h-5 text-primary-700" />
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2.5 text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200 hover:scale-105"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            <div className={`absolute right-0 top-full mt-2 w-56 glass rounded-2xl shadow-xl border border-white/20 transform transition-all duration-200 z-50 ${showDropdown ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-2 invisible'}`}>
              <div className="p-2">
                <div className="px-4 py-3 border-b border-neutral-100">
                  <p className="text-sm font-semibold text-neutral-900">{state.user?.firstName || 'Kullanıcı'}</p>
                  <p className="text-xs text-neutral-500">{state.user?.email}</p>
                </div>
                <div className="py-2">
                  <button
                    onClick={() => { navigate('/app/profile'); setShowDropdown(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-neutral-700 hover:bg-primary-50 hover:text-primary-900 transition-colors duration-200 rounded-xl flex items-center space-x-3"
                  >
                    <User className="w-4 h-4" />
                    <span>Profil Ayarları</span>
                  </button>
                  <button
                    onClick={() => { navigate('/app/subscription'); setShowDropdown(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-neutral-700 hover:bg-primary-50 hover:text-primary-900 transition-colors duration-200 rounded-xl flex items-center space-x-3"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Abonelik Yönetimi</span>
                  </button>
                </div>
                <div className="border-t border-neutral-100 pt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-error-600 hover:bg-error-50 hover:text-error-700 transition-colors duration-200 rounded-xl flex items-center space-x-3"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Çıkış Yap</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
