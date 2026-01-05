import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { adminService } from '../../services/adminService';
import { Shield, Users, Activity, Settings, CreditCard, BarChart2, Bell, DollarSign, LockKeyhole, RefreshCw, Loader2 } from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  recentUsers: number;
  inactiveUsers: number;
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  services: {
    name: string;
    status: 'up' | 'down' | 'unknown';
    responseTime?: number;
    lastCheck: string;
    url?: string;
  }[];
}

export default function AdminDashboard() {
  const { state } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsResponse, healthResponse] = await Promise.all([
        adminService.getAdminStats(),
        adminService.getSystemHealth()
      ]);

      setStats(statsResponse);
      setSystemHealth(healthResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-violet-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Admin paneli yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={loadDashboardData} className="btn-secondary">Tekrar Dene</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500/20 to-violet-600/20 rounded-2xl flex items-center justify-center border border-violet-500/30">
            <Shield className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="heading-3">Admin Dashboard</h1>
            <p className="text-small">Sistem yönetimi ve monitoring paneli</p>
          </div>
        </div>
        <button onClick={loadDashboardData} className="btn-secondary">
          <RefreshCw className="w-4 h-4 mr-2" />
          Yenile
        </button>
      </div>

      {/* İstatistik Kartları */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Toplam Kullanıcı" value={stats.totalUsers} color="cyan" />
          <StatCard title="Aktif Kullanıcı" value={stats.activeUsers} color="emerald" />
          <StatCard title="Admin Kullanıcı" value={stats.adminUsers} color="violet" />
          <StatCard title="Son 7 Gün" value={stats.recentUsers} color="amber" />
          <StatCard title="Pasif Kullanıcı" value={stats.inactiveUsers} color="red" />
        </div>
      )}

      {/* Sistem Durumu */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="heading-4 mb-4">Sistem Durumu</h2>
          {systemHealth ? (
            <div className="space-y-3">
              <div className={`px-4 py-2 rounded-xl font-medium ${systemHealth.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  systemHealth.status === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                Sistem Durumu: {systemHealth.status === 'healthy' ? 'Sağlıklı' :
                  systemHealth.status === 'warning' ? 'Uyarı' : 'Hata'}
              </div>

              <div className="space-y-2">
                {systemHealth.services.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-white/5">
                    <div>
                      <span className="font-medium text-white">{service.name}</span>
                      <div className="text-xs text-slate-500">Son kontrol: {service.lastCheck}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {service.responseTime && (
                        <span className="text-xs text-slate-400">{service.responseTime}ms</span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${service.status === 'up' ? 'bg-emerald-500/10 text-emerald-400' :
                          service.status === 'down' ? 'bg-red-500/10 text-red-400' :
                            'bg-slate-700 text-slate-400'
                        }`}>
                        {service.status === 'up' ? 'Çalışıyor' :
                          service.status === 'down' ? 'Durdu' : 'Bilinmiyor'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-slate-500">Sistem durumu bilgisi yüklenemedi</div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="heading-4 mb-4">Hızlı İşlemler</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <QuickAction to="/admin/users" icon={<Users className="w-5 h-5" />} label="Kullanıcı Yönetimi" />
            <QuickAction to="/admin/plans" icon={<CreditCard className="w-5 h-5" />} label="Abonelik Planları" />
            <QuickAction to="/admin/analytics" icon={<BarChart2 className="w-5 h-5" />} label="Kullanım Analitiği" />
            <QuickAction to="/admin/monitoring" icon={<Activity className="w-5 h-5" />} label="Sistem İzleme" />
            <QuickAction to="/admin/security" icon={<LockKeyhole className="w-5 h-5" />} label="Güvenlik" />
            <QuickAction to="/admin/settings" icon={<Settings className="w-5 h-5" />} label="Sistem Ayarları" />
            <QuickAction to="/admin/announcements" icon={<Bell className="w-5 h-5" />} label="Duyurular" />
            <QuickAction to="/admin/revenue" icon={<DollarSign className="w-5 h-5" />} label="Gelir Raporları" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    violet: 'text-violet-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
  };

  return (
    <div className="card p-4">
      <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
      <div className="text-sm text-slate-400">{title}</div>
    </div>
  );
}

function QuickAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-800/50 border border-white/5 rounded-xl hover:bg-slate-800 hover:border-violet-500/30 transition-all text-center"
    >
      <div className="text-violet-400">{icon}</div>
      <span className="text-sm font-medium text-slate-300">{label}</span>
    </Link>
  );
}
