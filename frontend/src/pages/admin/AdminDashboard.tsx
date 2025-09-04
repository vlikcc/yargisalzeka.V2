import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { adminService } from '../../services/adminService';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';

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

  if (loading) return <LoadingState message="Admin paneli yükleniyor..." />;
  if (error) return <ErrorState description={error} onRetry={loadDashboardData} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Sistem yönetimi ve monitoring paneli</p>
        </div>
        <Button onClick={loadDashboardData} variant="outline" className="font-medium">
          Yenile
        </Button>
      </div>

      {/* İstatistik Kartları */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
            <div className="text-sm text-gray-600">Toplam Kullanıcı</div>
          </Card>

          <Card className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
            <div className="text-sm text-gray-600">Aktif Kullanıcı</div>
          </Card>

          <Card className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.adminUsers}</div>
            <div className="text-sm text-gray-600">Admin Kullanıcı</div>
          </Card>

          <Card className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.recentUsers}</div>
            <div className="text-sm text-gray-600">Son 7 Gün</div>
          </Card>

          <Card className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.inactiveUsers}</div>
            <div className="text-sm text-gray-600">Pasif Kullanıcı</div>
          </Card>
        </div>
      )}

      {/* Sistem Durumu */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Sistem Durumu</h2>
          {systemHealth ? (
            <div className="space-y-3">
              <div className={`px-3 py-2 rounded-lg font-medium ${
                systemHealth.status === 'healthy' ? 'bg-green-100 text-green-800' :
                systemHealth.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                Sistem Durumu: {systemHealth.status === 'healthy' ? 'Sağlıklı' :
                                 systemHealth.status === 'warning' ? 'Uyarı' : 'Hata'}
              </div>

              <div className="space-y-2">
                {systemHealth.services.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <span className="font-medium">{service.name}</span>
                      <div className="text-xs text-gray-500">Son kontrol: {service.lastCheck}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {service.responseTime && (
                        <span className="text-xs text-gray-500">{service.responseTime}ms</span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        service.status === 'up' ? 'bg-green-100 text-green-800' :
                        service.status === 'down' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
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
            <div className="text-gray-500">Sistem durumu bilgisi yüklenemedi</div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Hızlı İşlemler</h2>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center font-medium">
              <span className="text-lg mb-1">👥</span>
              Kullanıcı Yönetimi
            </Button>
            <Link to="/admin/plans" className="h-20">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center font-medium">
                <span className="text-lg mb-1">💳</span>
                Abonelik Planları
              </Button>
            </Link>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center font-medium">
              <span className="text-lg mb-1">📊</span>
              Analytics
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center font-medium">
              <span className="text-lg mb-1">⚙️</span>
              Sistem Ayarları
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center font-medium">
              <span className="text-lg mb-1">📋</span>
              Loglar
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
