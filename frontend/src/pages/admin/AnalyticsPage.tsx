import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { adminService } from '../../services/adminService';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';

interface SearchStats {
  totalSearches: number;
  periodSearches: number;
  uniqueUsers: number;
  avgResults: number;
  dailySearches: { date: string; count: number }[];
  topKeywords: { keyword: string; count: number }[];
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<SearchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadStats();
  }, [days]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getSearchStats(days);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İstatistikler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState message="İstatistikler yükleniyor..." />;
  if (error) return <ErrorState description={error} onRetry={loadStats} />;

  const maxDailyCount = Math.max(...(stats?.dailySearches.map(d => d.count) || [1]));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Kullanım Analitiği</h1>
          <p className="text-gray-600 mt-2">Arama istatistikleri ve kullanım raporları</p>
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
            <option value={365}>Son 1 Yıl</option>
          </select>
          <Button onClick={loadStats} variant="outline" className="font-medium">
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
                <div className="text-sm text-gray-600">Toplam Arama</div>
                <div className="text-2xl font-bold text-blue-600">{stats.totalSearches.toLocaleString('tr-TR')}</div>
              </div>
              <div className="text-3xl">🔍</div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Son {days} Gün</div>
                <div className="text-2xl font-bold text-green-600">{stats.periodSearches.toLocaleString('tr-TR')}</div>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Aktif Kullanıcı</div>
                <div className="text-2xl font-bold text-purple-600">{stats.uniqueUsers.toLocaleString('tr-TR')}</div>
              </div>
              <div className="text-3xl">👥</div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Ort. Sonuç</div>
                <div className="text-2xl font-bold text-orange-600">{stats.avgResults}</div>
              </div>
              <div className="text-3xl">📋</div>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Günlük Arama Grafiği */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Günlük Arama Sayısı</h2>
          {stats && stats.dailySearches.length > 0 ? (
            <div className="space-y-2">
              <div className="h-64 flex items-end gap-1 overflow-x-auto pb-2">
                {stats.dailySearches.map((day, index) => (
                  <div key={index} className="flex flex-col items-center min-w-[24px]">
                    <div
                      className="w-5 bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                      style={{
                        height: `${Math.max((day.count / maxDailyCount) * 200, 4)}px`
                      }}
                      title={`${new Date(day.date).toLocaleDateString('tr-TR')}: ${day.count} arama`}
                    />
                    <div className="text-xs text-gray-400 mt-1 rotate-45 origin-left whitespace-nowrap">
                      {new Date(day.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Bu dönemde arama verisi yok
            </div>
          )}
        </Card>

        {/* En Çok Aranan Kelimeler */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">En Çok Aranan Kelimeler</h2>
          {stats && stats.topKeywords.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {stats.topKeywords.map((kw, index) => {
                const maxCount = stats.topKeywords[0]?.count || 1;
                const percentage = (kw.count / maxCount) * 100;
                return (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 w-6">{index + 1}.</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium truncate">{kw.keyword}</span>
                        <span className="text-sm text-gray-500">{kw.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Bu dönemde anahtar kelime verisi yok
            </div>
          )}
        </Card>
      </div>

      {/* Kullanım Özeti */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Kullanım Özeti</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">
              {stats ? Math.round(stats.periodSearches / days) : 0}
            </div>
            <div className="text-sm text-gray-600 mt-1">Günlük Ortalama Arama</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">
              {stats && stats.uniqueUsers > 0 ? Math.round(stats.periodSearches / stats.uniqueUsers) : 0}
            </div>
            <div className="text-sm text-gray-600 mt-1">Kullanıcı Başına Arama</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">
              {stats?.topKeywords.length || 0}
            </div>
            <div className="text-sm text-gray-600 mt-1">Farklı Anahtar Kelime</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

