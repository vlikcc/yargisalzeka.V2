import { useSubscription } from '../../contexts/SubscriptionContext';
import { useAuth } from '../../contexts/AuthContext';
import { StatCard, UsageChart, SearchHistoryList } from '../../components/dashboard';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  const totals = useMemo(() => {
    if (!usage) return null;
    const total = usage.searches + usage.caseAnalyses + usage.petitions + usage.keywordExtractions;
    return { total };
  }, [usage]);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="glass-card animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold gradient-text mb-1">
              Hoş geldiniz, {authState.user?.firstName || 'Kullanıcı'}!
            </h1>
            <p className="text-neutral-600">
              Hukuki araştırma ve analiz platformunuza hoş geldiniz
            </p>
          </div>
          <button
            onClick={() => navigate('/app/search')}
            className="btn-primary px-6 py-3 font-semibold shadow-glow hidden md:flex items-center"
          >
            <Search className="w-4 h-4 mr-2" />
            Yeni Arama Başlat
          </button>
        </div>
      </div>
      
      {/* Üst İstatistik Kartları */}
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

      {/* Orta Bölüm: Kullanım Analizi + Geçmiş */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-soft">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Kullanım Analizi</h3>
                  <p className="text-sm text-neutral-600">Aylık kullanım trendleriniz</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-primary-50 rounded-full">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-primary-700">Bu ay</span>
              </div>
            </div>
            <UsageChart usage={usage} loading={subscriptionLoading} />
          </div>
        </div>

        <div className="space-y-6">
          <SearchHistoryList />

          {/* Quick Actions */}
          <div className="glass-card">
            <h3 className="text-lg font-bold text-neutral-900 mb-4">Hızlı İşlemler</h3>
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/app/search')} 
                className="w-full flex items-center space-x-3 p-4 rounded-xl bg-gradient-to-r from-primary-50 to-primary-100 hover:from-primary-100 hover:to-primary-200 text-primary-700 transition-all duration-200 group hover:shadow-soft"
              >
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-soft group-hover:shadow-medium transition-all">
                  <Search className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold flex-1 text-left">Yeni Arama</span>
                <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                  <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">→</span>
                  </div>
                </div>
              </button>

              <button 
                onClick={() => navigate('/app/petitions')} 
                className="w-full flex items-center space-x-3 p-4 rounded-xl bg-gradient-to-r from-accent-50 to-accent-100 hover:from-accent-100 hover:to-accent-200 text-accent-700 transition-all duration-200 group hover:shadow-soft"
              >
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-soft group-hover:shadow-medium transition-all">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold flex-1 text-left">Dilekçe Oluştur</span>
                <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                  <div className="w-6 h-6 bg-accent-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">→</span>
                  </div>
                </div>
              </button>

              <button 
                onClick={() => navigate('/app/history')} 
                className="w-full flex items-center space-x-3 p-4 rounded-xl bg-gradient-to-r from-neutral-50 to-neutral-100 hover:from-neutral-100 hover:to-neutral-200 text-neutral-700 transition-all duration-200 group hover:shadow-soft"
              >
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-soft group-hover:shadow-medium transition-all">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold flex-1 text-left">Geçmişi Görüntüle</span>
                <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                  <div className="w-6 h-6 bg-neutral-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">→</span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alt Kartlar */}
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
