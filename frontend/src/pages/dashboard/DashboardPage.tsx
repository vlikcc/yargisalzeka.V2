import { useSubscription } from '../../contexts/SubscriptionContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, BarChart3, Clock, ArrowRight, Zap } from 'lucide-react';

export default function DashboardPage() {
  const { usage, plan, remaining, loading } = useSubscription();
  const { state: authState } = useAuth();
  const navigate = useNavigate();

  const userName = authState.user?.firstName || 'Kullanıcı';

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="heading-3">Hoş geldiniz, {userName}</h1>
          <p className="text-small mt-1">Hukuki araştırma platformunuza genel bakış</p>
        </div>
        <button
          onClick={() => navigate('/app/search')}
          className="btn-primary"
        >
          <Search className="w-4 h-4 mr-2" />
          Yeni Arama
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Aramalar"
          value={loading ? '...' : usage?.searches ?? 0}
          icon={<Search className="w-5 h-5" />}
        />
        <StatCard
          title="Analizler"
          value={loading ? '...' : usage?.caseAnalyses ?? 0}
          icon={<BarChart3 className="w-5 h-5" />}
        />
        <StatCard
          title="Dilekçeler"
          value={loading ? '...' : usage?.petitions ?? 0}
          icon={<FileText className="w-5 h-5" />}
        />
        <StatCard
          title="Anahtar Kelime"
          value={loading ? '...' : usage?.keywordExtractions ?? 0}
          icon={<Zap className="w-5 h-5" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="lg:col-span-2 card p-6">
          <h2 className="heading-4 mb-4">Hızlı İşlemler</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickActionCard
              title="Akıllı Arama"
              description="Yapay zeka ile karar arayın"
              icon={<Search className="w-5 h-5" />}
              onClick={() => navigate('/app/search')}
              primary
            />
            <QuickActionCard
              title="Dilekçe Oluştur"
              description="Profesyonel dilekçe taslağı"
              icon={<FileText className="w-5 h-5" />}
              onClick={() => navigate('/app/petitions')}
            />
            <QuickActionCard
              title="Arama Geçmişi"
              description="Önceki aramalarınız"
              icon={<Clock className="w-5 h-5" />}
              onClick={() => navigate('/app/history')}
            />
            <QuickActionCard
              title="Kullanım Detayı"
              description="Abonelik ve kullanım"
              icon={<BarChart3 className="w-5 h-5" />}
              onClick={() => navigate('/app/subscription')}
            />
          </div>
        </div>

        {/* Subscription Info */}
        <div className="card p-6">
          <h2 className="heading-4 mb-4">Abonelik Durumu</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-primary-50 rounded-lg">
              <div className="text-sm text-primary-600 mb-1">Aktif Plan</div>
              <div className="text-lg font-semibold text-primary-800">
                {loading ? '...' : plan?.name || 'Plan yok'}
              </div>
            </div>

            <div className="space-y-3">
              <RemainingItem
                label="Arama Hakkı"
                value={remaining?.search}
                loading={loading}
              />
              <RemainingItem
                label="Analiz Hakkı"
                value={remaining?.caseAnalysis}
                loading={loading}
              />
              <RemainingItem
                label="Dilekçe Hakkı"
                value={remaining?.petition}
                loading={loading}
              />
            </div>

            <button
              onClick={() => navigate('/app/subscription')}
              className="btn-secondary w-full justify-center mt-4"
            >
              Planı Yönet
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon }: { title: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">{title}</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
        </div>
        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

// Quick Action Card Component
function QuickActionCard({ 
  title, 
  description, 
  icon, 
  onClick,
  primary = false 
}: { 
  title: string; 
  description: string; 
  icon: React.ReactNode; 
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg text-left transition-all group ${
        primary 
          ? 'bg-primary-50 hover:bg-primary-100' 
          : 'bg-slate-50 hover:bg-slate-100'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          primary ? 'bg-primary-100 text-primary-700' : 'bg-white text-slate-600'
        }`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className={`font-medium ${primary ? 'text-primary-800' : 'text-slate-800'}`}>
            {title}
          </div>
          <div className="text-sm text-slate-500 mt-0.5">{description}</div>
        </div>
        <ArrowRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${
          primary ? 'text-primary-600' : 'text-slate-400'
        }`} />
      </div>
    </button>
  );
}

// Remaining Item Component
function RemainingItem({ label, value, loading }: { label: string; value?: number; loading: boolean }) {
  const displayValue = loading ? '...' : value === -1 ? '∞' : value ?? 0;
  const isUnlimited = value === -1;
  
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-sm font-medium ${isUnlimited ? 'text-success-600' : 'text-slate-900'}`}>
        {displayValue}
      </span>
    </div>
  );
}
