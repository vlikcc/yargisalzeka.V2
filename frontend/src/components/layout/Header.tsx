import { User, LogOut, Menu, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

interface HeaderProps { 
  className?: string;
  onMenuClick?: () => void;
}

export function Header({ className, onMenuClick }: HeaderProps) {
  const { state, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userName = state.user?.firstName || state.user?.email?.split('@')[0] || 'Kullanıcı';
  const userEmail = state.user?.email || '';

  return (
    <header className={`h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 justify-between ${className || ''}`}>      
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2">
          <img src="/logo.png" alt="Yargısal Zeka" className="w-8 h-8 object-contain" />
          <span className="font-semibold text-slate-900">Yargısal Zeka</span>
        </div>
      </div>

      {/* Right side - User menu */}
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary-700" />
          </div>
          <div className="hidden md:block text-left">
            <div className="text-sm font-medium text-slate-900">{userName}</div>
            <div className="text-xs text-slate-500">{userEmail}</div>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50 animate-fade-in">
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-900">{userName}</p>
              <p className="text-xs text-slate-500">{userEmail}</p>
            </div>
            
            <div className="py-1">
              <button
                onClick={() => { navigate('/app/profile'); setShowDropdown(false); }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                Profil Ayarları
              </button>
            </div>
            
            <div className="border-t border-slate-100 pt-1">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-error-600 hover:bg-error-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Çıkış Yap
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
