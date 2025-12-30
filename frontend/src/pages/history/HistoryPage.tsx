import { useEffect, useState } from 'react';
import { useSearch } from '../../contexts/SearchContext';
import { Button } from '../../components/ui/button';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { History, Clock, Search as SearchIcon, RefreshCw, Hash, Calendar, Eye } from 'lucide-react';

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
      <div className="glass-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl flex items-center justify-center shadow-glow">
              <History className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold gradient-text">Geçmiş Aramalar</h2>
              <p className="text-sm text-neutral-500">Daha önce yaptığınız arama sonuçları</p>
            </div>
          </div>
          <Button
            onClick={handleLoadHistory}
            variant="outline"
            size="sm"
            className="font-medium"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-neutral-400 border-t-neutral-700 rounded-full animate-spin mr-2" />
                Yükleniyor
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Yenile
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {loading && history.length === 0 && (
          <div className="glass-card animate-slide-up">
            <LoadingState message="Geçmiş aramalar yükleniyor..." />
          </div>
        )}

        {error && (
          <div className="glass-card animate-slide-up">
            <ErrorState
              description={error}
              onRetry={handleLoadHistory}
            />
          </div>
        )}

        {!loading && !error && history.length === 0 && (
          <div className="glass-card text-center py-12 animate-fade-in">
            <div className="w-20 h-20 bg-neutral-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <SearchIcon className="w-10 h-10 text-neutral-400" />
            </div>
            <p className="text-lg font-semibold text-neutral-900 mb-2">
              Henüz arama geçmişiniz yok
            </p>
            <p className="text-sm text-neutral-500 max-w-md mx-auto mb-4">
              İlk arama işleminizi gerçekleştirin, sonuçlar burada görüntülenecek.
            </p>
            <Button
              onClick={() => window.location.href = '/app/search'}
              className="btn-primary"
            >
              <SearchIcon className="w-4 h-4 mr-2" />
              İlk Aramayı Yap
            </Button>
          </div>
        )}

        {/* History Items */}
        <div className="grid gap-4">
          {history.map((h, index) => (
            <div
              key={h.id}
              className="card hover-lift animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center shadow-soft">
                    <Clock className="w-5 h-5 text-primary-700" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900 line-clamp-2">
                      {/* Backend only returns keywords, so use them as title */}
                      {h.keywords && h.keywords.length > 0
                        ? h.keywords.join(', ')
                        : `Arama #${h.id}`}
                    </h3>
                    <p className="text-sm text-neutral-500">Arama ID: {h.id}</p>
                  </div>
                </div>
                {/* resultCount backendden geliyor */}
                <span className="px-2.5 py-1 bg-gradient-to-r from-primary-100 to-primary-200 text-primary-700 text-xs font-semibold rounded-full">
                  {h.resultCount} Sonuç
                </span>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-200/50">
                <div className="flex items-center space-x-4 text-xs text-neutral-500">
                  <div className="flex items-center space-x-1">
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary-600 hover:text-primary-700"
                  onClick={() => {
                    // Aramayı tekrar et (Search sayfasına yönlendir)
                    // URL params ile text gönderebiliriz veya context set edebiliriz
                    // Şimdilik sadece alert
                    window.location.href = `/app/search?q=${encodeURIComponent(h.keywords.join(' '))}`;
                  }}
                >
                  <SearchIcon className="w-3 h-3 mr-1" />
                  Tekrar Ara
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
