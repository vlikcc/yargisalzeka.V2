import { useAuth } from '../../contexts/AuthContext';
import { User, Mail, LogOut, Shield } from 'lucide-react';

export default function ProfilePage() {
  const { state, logout } = useAuth();
  const user = state.user;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-violet-500/20 to-violet-600/20 rounded-2xl flex items-center justify-center border border-violet-500/30">
          <User className="w-6 h-6 text-violet-400" />
        </div>
        <div>
          <h2 className="heading-3">Profil</h2>
          <p className="text-small">Hesap bilgilerinizi görüntüleyin</p>
        </div>
      </div>

      {user ? (
        <div className="space-y-4">
          {/* User Info Card */}
          <div className="card p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-2xl flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {user.firstName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {user.firstName} {user.lastName}
                </h3>
                <p className="text-slate-400">{user.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-500" />
                  <span className="text-slate-400">E-posta</span>
                </div>
                <span className="text-white">{user.email}</span>
              </div>

              {user.firstName && (
                <div className="flex items-center justify-between py-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-slate-500" />
                    <span className="text-slate-400">Ad Soyad</span>
                  </div>
                  <span className="text-white">{user.firstName} {user.lastName}</span>
                </div>
              )}

              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-slate-500" />
                  <span className="text-slate-400">Kullanıcı ID</span>
                </div>
                <span className="text-slate-300 font-mono text-sm">{user.id}</span>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Çıkış Yap
          </button>
        </div>
      ) : (
        <div className="card p-8 text-center">
          <p className="text-slate-400">Oturum bilgisi bulunamadı</p>
        </div>
      )}
    </div>
  );
}
