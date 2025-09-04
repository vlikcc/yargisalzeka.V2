import { useSubscription } from '../../contexts/SubscriptionContext';
import { useAuth } from '../../contexts/AuthContext';
import { StatCard, UsageChart, SearchHistoryList } from '../../components/dashboard';
import { useMemo } from 'react';
import {
  Search,
  FileText,
  BarChart3,
  Zap,
  TrendingUp,
  Clock,
  Target
} from 'lucide-react';

export default function DashboardPage() {
  const { usage, plan, remaining, loading: subscriptionLoading } = useSubscription();
  const { state: authState } = useAuth();

  const totals = useMemo(() => {
    if (!usage) return null;
    const total = usage.searches + usage.caseAnalyses + usage.petitions + usage.keywordExtractions;
    return { total };
  }, [usage]);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Hoş geldin{authState.user ? `, ${authState.user.firstName || authState.user.email?.split('@')[0]}` : ''}!
          </h1>
          <p className="text-neutral-600">
            Yargısal Zeka platformuna hoş geldin. Bugünkü istatistiklerin aşağıda.
          </p>
        </div>
        <div className="hidden md:flex items-center space-x-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-lg">
          <Target className="w-4 h-4" />
          <span className="text-sm font-medium">Beta</span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Toplam İşlem"
          value={totals?.total ?? '-'}
          description="Tüm kullanım türlerinin toplamı"
          icon={<BarChart3 className="w-6 h-6" />}
          loading={subscriptionLoading}
          trend="up"
          trendValue="+12%"
          className="md:col-span-2 lg:col-span-1"
        />
        <StatCard
          title="Akıllı Aramalar"
          value={usage?.searches}
          description="Gerçekleştirilen arama sayısı"
          icon={<Search className="w-6 h-6" />}
          loading={subscriptionLoading}
          trend="up"
          trendValue="+8%"
        />
        <StatCard
          title="Karar Analizi"
          value={usage?.caseAnalyses}
          description="AI ile analiz edilen kararlar"
          icon={<TrendingUp className="w-6 h-6" />}
          loading={subscriptionLoading}
          trend="neutral"
          trendValue="Bu ay"
        />
        <StatCard
          title="Dilekçe Taslakları"
          value={usage?.petitions}
          description="Oluşturulan dilekçe sayısı"
          icon={<FileText className="w-6 h-6" />}
          loading={subscriptionLoading}
          trend="up"
          trendValue="+15%"
        />
      </div>

      {/* Charts and History Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">Kullanım Analizi</h3>
                <p className="text-sm text-neutral-600">Aylık kullanım trendleriniz</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                <span className="text-sm text-neutral-600">Bu ay</span>
              </div>
            </div>
            <UsageChart usage={usage} loading={subscriptionLoading} />
          </div>
        </div>

        <div className="space-y-6">
          <SearchHistoryList />

          {/* Quick Actions */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Hızlı İşlemler</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center space-x-3 p-3 rounded-lg bg-primary-50 hover:bg-primary-100 text-primary-700 transition-colors duration-200 group">
                <Search className="w-5 h-5" />
                <span className="text-sm font-medium">Yeni Arama</span>
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                </div>
              </button>

              <button className="w-full flex items-center space-x-3 p-3 rounded-lg bg-accent-50 hover:bg-accent-100 text-accent-700 transition-colors duration-200 group">
                <FileText className="w-5 h-5" />
                <span className="text-sm font-medium">Dilekçe Oluştur</span>
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-2 h-2 bg-accent-600 rounded-full"></div>
                </div>
              </button>

              <button className="w-full flex items-center space-x-3 p-3 rounded-lg bg-neutral-50 hover:bg-neutral-100 text-neutral-700 transition-colors duration-200 group">
                <Clock className="w-5 h-5" />
                <span className="text-sm font-medium">Geçmişi Görüntüle</span>
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-2 h-2 bg-neutral-600 rounded-full"></div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatCard
          title="Anahtar Kelime"
          value={usage?.keywordExtractions}
          description="Çıkarılan anahtar kelime sayısı"
          icon={<Zap className="w-6 h-6" />}
          loading={subscriptionLoading}
          trend="up"
          trendValue="+5%"
        />
        <StatCard
          title="Abonelik Planı"
          value={plan?.name || '-'}
          description={plan ? `Aylık ${plan.price}₺` : 'Plan bilgisi yok'}
          icon={<Target className="w-6 h-6" />}
          loading={subscriptionLoading}
        />
        <StatCard
          title="Kalan Krediler"
          value={remaining ? 'Aktif' : '-'}
          description={remaining ?
            `Arama: ${remaining.search === -1 ? '∞' : remaining.search} | Analiz: ${remaining.caseAnalysis === -1 ? '∞' : remaining.caseAnalysis}` :
            'Bilgi yok'
          }
          icon={<Clock className="w-6 h-6" />}
          loading={subscriptionLoading}
        />
      </div>
    </div>
  );
}
