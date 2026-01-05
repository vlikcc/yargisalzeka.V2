import { useEffect, useState } from 'react';
import { useSearch } from '../../contexts/SearchContext';
import { History, Clock, Search as SearchIcon, RefreshCw, Calendar, Loader2 } from 'lucide-react';

export default function HistoryPage() {
  const { history, loadHistory } = useSearch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      await loadHistory();
    } catch (err) {
      console.error('Geçmiş yüklenirken hata:', err);
      setError('Geçmiş yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void handleLoadHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-2xl flex items-center justify-center border border-amber-500/30">
            <History className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="heading-3">Geçmiş Aramalar</h2>
            <p className="text-small">Daha önce yaptığınız arama sonuçları</p>
          </div>
        </div>
        <button
          onClick={handleLoadHistory}
          className="btn-secondary"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Yükleniyor
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Yenile
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {loading && history.length === 0 && (
          <div className="card p-8 text-center">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-300">Geçmiş aramalar yükleniyor...</p>
          </div>
        )}

        {error && (
          <div className="card p-6 border-red-500/20 bg-red-500/5">
            <p className="text-red-400 text-center">{error}</p>
            <button onClick={handleLoadHistory} className="btn-secondary mx-auto mt-4 block">
              Tekrar Dene
            </button>
          </div>
        )}

        {!loading && !error && history.length === 0 && (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 bg-slate-700/50 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <SearchIcon className="w-10 h-10 text-slate-500" />
            </div>
            <p className="text-lg font-semibold text-white mb-2">
              Henüz arama geçmişiniz yok
            </p>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-4">
              İlk arama işleminizi gerçekleştirin, sonuçlar burada görüntülenecek.
            </p>
            <a href="/app/search" className="btn-primary inline-flex items-center">
              <SearchIcon className="w-4 h-4 mr-2" />
              İlk Aramayı Yap
            </a>
          </div>
        )}

        {/* History Items */}
        <div className="grid gap-4">
          {history.map((h, index) => (
            <div
              key={h.id}
              className="card p-5 hover:border-cyan-500/30 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20">
                    <Clock className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white line-clamp-2">
                      {(h.keywords || []).length > 0
                        ? (h.keywords || []).join(', ')
                        : `Arama #${h.id}`}
                    </h3>
                    <p className="text-sm text-slate-500">Arama ID: {h.id}</p>
                  </div>
                </div>
                <span className="badge-primary">
                  {h.resultCount} Sonuç
                </span>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {h.createdAt
                        ? new Date(h.createdAt).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                        : 'Tarih bilinmiyor'
                      }
                    </span>
                  </div>
                </div>
                <a
                  href={`/app/search?q=${encodeURIComponent((h.keywords || []).join(' '))}`}
                  className="text-sm font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <SearchIcon className="w-3 h-3" />
                  Tekrar Ara
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
