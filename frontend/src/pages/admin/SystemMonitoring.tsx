import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { adminService } from '../../services/adminService';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';

interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'unknown';
  responseTime?: number;
  lastCheck: string;
  url?: string;
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  uptime: string;
  timestamp: string;
}

export default function SystemMonitoring() {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSystemData();
    const interval = setInterval(loadSystemData, 30000); // Her 30 saniyede bir güncelle
    return () => clearInterval(interval);
  }, []);

  const loadSystemData = async () => {
    try {
      setError(null);
      const [healthData, metricsData] = await Promise.all([
        adminService.getServiceHealth(),
        adminService.getSystemMetrics()
      ]);

      setServices(healthData.services || []);
      setMetrics(metricsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sistem verileri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up': return 'text-green-600 bg-green-100';
      case 'down': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up': return '✅';
      case 'down': return '❌';
      default: return '❓';
    }
  };

  if (loading) return <LoadingState message="Sistem bilgileri yükleniyor..." />;
  if (error) return <ErrorState description={error} onRetry={loadSystemData} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sistem Monitoring</h1>
          <p className="text-gray-600 mt-2">Servis durumu ve sistem metrikleri</p>
        </div>
        <Button onClick={loadSystemData} variant="outline" className="font-medium">
          Yenile
        </Button>
      </div>

      {/* Sistem Metrikleri */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">CPU Kullanımı</div>
                <div className="text-2xl font-bold text-blue-600">{metrics.cpuUsage}%</div>
              </div>
              <div className="text-3xl">🖥️</div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">RAM Kullanımı</div>
                <div className="text-2xl font-bold text-green-600">{metrics.memoryUsage}%</div>
              </div>
              <div className="text-3xl">🧠</div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Disk Kullanımı</div>
                <div className="text-2xl font-bold text-orange-600">{metrics.diskUsage}%</div>
              </div>
              <div className="text-3xl">💽</div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Sistem Süresi</div>
                <div className="text-2xl font-bold text-purple-600">{metrics.uptime}</div>
              </div>
              <div className="text-3xl">⏱️</div>
            </div>
          </Card>
        </div>
      )}

      {/* Servis Durumları */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Servis Durumları</h2>
        <div className="space-y-3">
          {services.map((service, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getStatusIcon(service.status)}</span>
                  <div>
                    <div className="font-medium">{service.name}</div>
                    {service.url && (
                      <div className="text-xs text-gray-500">{service.url}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {service.responseTime && (
                    <div className="text-right">
                      <div className="text-sm font-medium">{service.responseTime}ms</div>
                      <div className="text-xs text-gray-500">Response Time</div>
                    </div>
                  )}

                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(service.status)}`}>
                    {service.status === 'up' ? 'Çalışıyor' :
                     service.status === 'down' ? 'Durdu' : 'Bilinmiyor'}
                  </span>
                </div>
              </div>

              <div className="text-xs text-gray-400 mt-2">
                Son kontrol: {new Date(service.lastCheck).toLocaleString('tr-TR')}
              </div>
            </div>
          ))}

          {services.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Servis bilgisi bulunamadı
            </div>
          )}
        </div>
      </Card>

      {/* Hızlı İşlemler */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Hızlı İşlemler</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="outline" className="h-20 flex flex-col items-center justify-center font-medium">
            <span className="text-lg mb-1">🔄</span>
            Tüm Servisleri Yeniden Başlat
          </Button>
          <Button variant="outline" className="h-20 flex flex-col items-center justify-center font-medium">
            <span className="text-lg mb-1">📊</span>
            Logları Görüntüle
          </Button>
          <Button variant="outline" className="h-20 flex flex-col items-center justify-center font-medium">
            <span className="text-lg mb-1">💾</span>
            Backup Al
          </Button>
          <Button variant="outline" className="h-20 flex flex-col items-center justify-center font-medium">
            <span className="text-lg mb-1">⚙️</span>
            Sistem Ayarları
          </Button>
        </div>
      </Card>
    </div>
  );
}
