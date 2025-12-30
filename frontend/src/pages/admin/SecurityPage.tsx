import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { adminService } from '../../services/adminService';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';

interface LoginLog {
  id: number;
  userId: string;
  email: string;
  isSuccess: boolean;
  failureReason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface LoginStats {
  totalAttempts: number;
  successfulLogins: number;
  failedLogins: number;
  successRate: number;
  dailyStats: { date: string; successCount: number; failCount: number }[];
  failureReasons: { reason: string; count: number }[];
  suspiciousIps: { ipAddress: string; failCount: number }[];
}

export default function SecurityPage() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [stats, setStats] = useState<LoginStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadData();
  }, [filter, days]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [logsData, statsData] = await Promise.all([
        adminService.getLoginLogs(100, 0, filter === 'all' ? undefined : filter === 'success'),
        adminService.getLoginStats(days)
      ]);
      
      setLogs(logsData.logs);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState message="Güvenlik verileri yükleniyor..." />;
  if (error) return <ErrorState description={error} onRetry={loadData} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Güvenlik ve Giriş Logları</h1>
          <p className="text-gray-600 mt-2">Kullanıcı giriş aktiviteleri ve güvenlik izleme</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 border rounded-md"
          >
            <option value={7}>Son 7 Gün</option>
            <option value={30}>Son 30 Gün</option>
            <option value={90}>Son 90 Gün</option>
          </select>
          <Button onClick={loadData} variant="outline" className="font-medium">
            Yenile
          </Button>
        </div>
      </div>

      {/* Özet Kartları */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Toplam Giriş Denemesi</div>
                <div className="text-2xl font-bold text-blue-600">{stats.totalAttempts.toLocaleString('tr-TR')}</div>
              </div>
              <div className="text-3xl">🔐</div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Başarılı Giriş</div>
                <div className="text-2xl font-bold text-green-600">{stats.successfulLogins.toLocaleString('tr-TR')}</div>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Başarısız Giriş</div>
                <div className="text-2xl font-bold text-red-600">{stats.failedLogins.toLocaleString('tr-TR')}</div>
              </div>
              <div className="text-3xl">❌</div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Başarı Oranı</div>
                <div className="text-2xl font-bold text-purple-600">%{stats.successRate}</div>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Şüpheli IP'ler */}
        {stats && stats.suspiciousIps.length > 0 && (
          <Card className="p-6 border-red-200 bg-red-50">
            <h2 className="text-xl font-semibold mb-4 text-red-800">⚠️ Şüpheli Aktivite</h2>
            <p className="text-sm text-red-600 mb-4">Aşağıdaki IP adreslerinden çok sayıda başarısız giriş denemesi tespit edildi:</p>
            <div className="space-y-2">
              {stats.suspiciousIps.map((ip, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                  <span className="font-mono text-sm">{ip.ipAddress}</span>
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                    {ip.failCount} başarısız deneme
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Başarısızlık Nedenleri */}
        {stats && stats.failureReasons.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Başarısızlık Nedenleri</h2>
            <div className="space-y-3">
              {stats.failureReasons.map((reason, index) => {
                const maxCount = stats.failureReasons[0]?.count || 1;
                const percentage = (reason.count / maxCount) * 100;
                return (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm">{reason.reason}</span>
                      <span className="text-sm text-gray-500">{reason.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Giriş Logları Tablosu */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Giriş Logları</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md text-sm ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
            >
              Tümü
            </button>
            <button
              onClick={() => setFilter('success')}
              className={`px-3 py-1 rounded-md text-sm ${filter === 'success' ? 'bg-green-500 text-white' : 'bg-gray-100'}`}
            >
              Başarılı
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-3 py-1 rounded-md text-sm ${filter === 'failed' ? 'bg-red-500 text-white' : 'bg-gray-100'}`}
            >
              Başarısız
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2">Tarih</th>
                <th className="text-left py-3 px-2">E-posta</th>
                <th className="text-left py-3 px-2">Durum</th>
                <th className="text-left py-3 px-2">IP Adresi</th>
                <th className="text-left py-3 px-2">Neden</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-2 text-sm">
                    {new Date(log.createdAt).toLocaleString('tr-TR')}
                  </td>
                  <td className="py-3 px-2 text-sm">{log.email}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      log.isSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {log.isSuccess ? 'Başarılı' : 'Başarısız'}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-sm font-mono">{log.ipAddress || '-'}</td>
                  <td className="py-3 px-2 text-sm text-gray-500">{log.failureReason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {logs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Giriş logu bulunamadı
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

