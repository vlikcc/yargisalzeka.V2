import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { adminService } from '../../services/adminService';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';

interface RevenueStats {
  totalRevenue: number;
  activeSubscriptions: number;
  totalSubscriptions: number;
  newSubscriptions: number;
  revenueByPlan: { planName: string; subscriptionCount: number; revenue: number }[];
  dailyRevenue: { date: string; count: number; revenue: number }[];
}

interface SubscriptionStats {
  planDistribution: { plan: string; count: number }[];
  dailyNewSubs: { date: string; count: number }[];
  expiringSubscriptions: { userId: string; planName: string; endDate: string }[];
  expiringCount: number;
}

interface RecentSubscription {
  id: number;
  userId: string;
  planName: string;
  price: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
}

export default function RevenuePage() {
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [subStats, setSubStats] = useState<SubscriptionStats | null>(null);
  const [recentSubs, setRecentSubs] = useState<RecentSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadData();
  }, [days]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [revenue, subs, recent] = await Promise.all([
        adminService.getRevenueStats(days),
        adminService.getSubscriptionStats(days),
        adminService.getRecentSubscriptions(20)
      ]);
      
      setRevenueStats(revenue);
      setSubStats(subs);
      setRecentSubs(recent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState message="Gelir raporları yükleniyor..." />;
  if (error) return <ErrorState description={error} onRetry={loadData} />;

  const maxDailyRevenue = Math.max(...(revenueStats?.dailyRevenue.map(d => d.revenue) || [1]));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gelir Raporları</h1>
          <p className="text-gray-600 mt-2">Abonelik gelirleri ve finansal istatistikler</p>
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
          <Button onClick={loadData} variant="outline" className="font-medium">
            Yenile
          </Button>
        </div>
      </div>

      {/* Özet Kartları */}
      {revenueStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-green-600 font-medium">Toplam Gelir</div>
                <div className="text-2xl font-bold text-green-700">
                  {revenueStats.totalRevenue.toLocaleString('tr-TR')} ₺
                </div>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Aktif Abonelik</div>
                <div className="text-2xl font-bold text-blue-600">{revenueStats.activeSubscriptions}</div>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Yeni Abonelik</div>
                <div className="text-2xl font-bold text-purple-600">{revenueStats.newSubscriptions}</div>
              </div>
              <div className="text-3xl">🆕</div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Toplam Abonelik</div>
                <div className="text-2xl font-bold text-gray-700">{revenueStats.totalSubscriptions}</div>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Günlük Gelir Grafiği */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Günlük Gelir</h2>
          {revenueStats && revenueStats.dailyRevenue.length > 0 ? (
            <div className="space-y-2">
              <div className="h-48 flex items-end gap-1 overflow-x-auto pb-2">
                {revenueStats.dailyRevenue.map((day, index) => (
                  <div key={index} className="flex flex-col items-center min-w-[24px]">
                    <div
                      className="w-5 bg-gradient-to-t from-green-500 to-green-400 rounded-t transition-all hover:from-green-600 hover:to-green-500"
                      style={{
                        height: `${Math.max((day.revenue / maxDailyRevenue) * 160, 4)}px`
                      }}
                      title={`${new Date(day.date).toLocaleDateString('tr-TR')}: ${day.revenue.toLocaleString('tr-TR')} ₺`}
                    />
                    <div className="text-xs text-gray-400 mt-1 rotate-45 origin-left whitespace-nowrap">
                      {new Date(day.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500">
              Bu dönemde gelir verisi yok
            </div>
          )}
        </Card>

        {/* Plan Bazlı Gelir */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Plan Bazlı Gelir</h2>
          {revenueStats && revenueStats.revenueByPlan.length > 0 ? (
            <div className="space-y-4">
              {revenueStats.revenueByPlan.map((plan, index) => {
                const maxRevenue = revenueStats.revenueByPlan[0]?.revenue || 1;
                const percentage = (plan.revenue / maxRevenue) * 100;
                return (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{plan.planName}</span>
                      <span className="text-sm text-gray-500">
                        {plan.subscriptionCount} abone • {plan.revenue.toLocaleString('tr-TR')} ₺
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500">
              Plan bazlı gelir verisi yok
            </div>
          )}
        </Card>
      </div>

      {/* Süresi Dolacak Abonelikler */}
      {subStats && subStats.expiringCount > 0 && (
        <Card className="p-6 border-yellow-200 bg-yellow-50">
          <h2 className="text-xl font-semibold mb-4 text-yellow-800">
            ⚠️ Süresi Dolacak Abonelikler ({subStats.expiringCount})
          </h2>
          <p className="text-sm text-yellow-600 mb-4">
            Aşağıdaki aboneliklerin süresi 7 gün içinde dolacak:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {subStats.expiringSubscriptions.slice(0, 9).map((sub, index) => (
              <div key={index} className="p-3 bg-white rounded-lg border border-yellow-200">
                <div className="text-sm font-medium">{sub.planName}</div>
                <div className="text-xs text-gray-500">Kullanıcı: {sub.userId.slice(0, 8)}...</div>
                <div className="text-xs text-yellow-600">
                  Bitiş: {new Date(sub.endDate).toLocaleDateString('tr-TR')}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Son Abonelikler */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Son Abonelikler</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2">Tarih</th>
                <th className="text-left py-3 px-2">Plan</th>
                <th className="text-left py-3 px-2">Fiyat</th>
                <th className="text-left py-3 px-2">Bitiş</th>
                <th className="text-left py-3 px-2">Durum</th>
              </tr>
            </thead>
            <tbody>
              {recentSubs.map((sub) => (
                <tr key={sub.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-2 text-sm">
                    {new Date(sub.startDate).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="py-3 px-2 text-sm font-medium">{sub.planName}</td>
                  <td className="py-3 px-2 text-sm">{sub.price.toLocaleString('tr-TR')} ₺</td>
                  <td className="py-3 px-2 text-sm">
                    {sub.endDate ? new Date(sub.endDate).toLocaleDateString('tr-TR') : 'Süresiz'}
                  </td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      sub.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {sub.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {recentSubs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Abonelik kaydı bulunamadı
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

