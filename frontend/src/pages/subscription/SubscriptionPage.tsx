import { useSubscription } from '../../contexts/SubscriptionContext';
import { CreditCard, Search, BarChart3, FileText, Zap, RefreshCw, Loader2 } from 'lucide-react';

export default function SubscriptionPage() {
  const { plan, usage, loading, refresh } = useSubscription();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
            <CreditCard className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="heading-3">Abonelik</h2>
            <p className="text-small">Plan ve kullanım bilgileriniz</p>
          </div>
        </div>
        <button onClick={refresh} className="btn-secondary" disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Yenile
            </>
          )}
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Abonelik bilgileri yükleniyor...</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Plan Card */}
          {plan && (
            <div className="card p-6">
              <h3 className="heading-4 mb-4">Aktif Plan</h3>
              <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 rounded-xl border border-cyan-500/20 mb-4">
                <div className="text-2xl font-bold text-white mb-1">{plan.name}</div>
                <div className="text-cyan-400 font-medium">₺{plan.price}/ay</div>
              </div>
              <a href="/app/subscription/upgrade" className="btn-primary w-full justify-center">
                Plan Yükselt
              </a>
            </div>
          )}

          {/* Usage Card */}
          {usage && (
            <div className="card p-6">
              <h3 className="heading-4 mb-4">Kullanım</h3>
              <div className="space-y-4">
                <UsageItem
                  icon={<Search className="w-5 h-5" />}
                  label="Aramalar"
                  value={usage.searches}
                />
                <UsageItem
                  icon={<BarChart3 className="w-5 h-5" />}
                  label="Analizler"
                  value={usage.caseAnalyses}
                />
                <UsageItem
                  icon={<FileText className="w-5 h-5" />}
                  label="Dilekçeler"
                  value={usage.petitions}
                />
                <UsageItem
                  icon={<Zap className="w-5 h-5" />}
                  label="Anahtar Kelime"
                  value={usage.keywordExtractions}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UsageItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400 border border-cyan-500/20">
          {icon}
        </div>
        <span className="text-slate-300">{label}</span>
      </div>
      <span className="text-xl font-semibold text-white">{value}</span>
    </div>
  );
}
