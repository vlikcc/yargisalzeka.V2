import { useEffect } from 'react';
import { petitionService, PetitionHistoryItem } from '../../services/petitionService';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';
import { LoadingState } from '../../components/common/LoadingState';
import { Skeleton } from '../../components/ui/skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { FileText, Clock, Calendar, Download, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';

export default function PetitionHistoryPage() {
  const { data, loading, error, run } = useAsyncOperation<PetitionHistoryItem[]>();

  useEffect(() => { void run(() => petitionService.history()); }, [run]);

  const handleRetry = () => {
    void run(() => petitionService.history());
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="glass-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl flex items-center justify-center shadow-glow">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold gradient-text">Dilekçe Geçmişi</h2>
              <p className="text-sm text-neutral-500">Oluşturduğunuz dilekçe taslakları</p>
            </div>
          </div>
          <Button 
            onClick={handleRetry} 
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

      {/* Loading State */}
      {loading && data?.length === 0 && (
        <div className="glass-card animate-slide-up">
          <LoadingState message="Dilekçe geçmişi yükleniyor..." />
          <div className="space-y-3 mt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-neutral-50 rounded-xl p-4 animate-pulse">
                <div className="flex justify-between items-start mb-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="glass-card animate-slide-up">
          <ErrorState 
            description={error} 
            onRetry={handleRetry}
          />
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && data?.length === 0 && (
        <div className="glass-card text-center py-12 animate-fade-in">
          <div className="w-20 h-20 bg-neutral-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-neutral-400" />
          </div>
          <p className="text-lg font-semibold text-neutral-900 mb-2">
            Henüz dilekçe oluşturmamışsınız
          </p>
          <p className="text-sm text-neutral-500 max-w-md mx-auto mb-4">
            İlk dilekçe taslak  ınızı oluşturun, geçmiş burada görüntülenecek.
          </p>
          <Button 
            onClick={() => window.location.href = '/app/search'}
            className="btn-primary"
          >
            <FileText className="w-4 h-4 mr-2" />
            Dilekçe Oluştur
          </Button>
        </div>
      )}

      {/* Petition History Items */}
      {data && data.length > 0 && (
        <div className="grid gap-4">
          {data.map((item, index) => (
            <div 
              key={item.id} 
              className="card hover-lift animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center shadow-soft">
                    <FileText className="w-5 h-5 text-green-700" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900 line-clamp-2">
                      {item.topic || `Dilekçe #${item.id}`}
                    </h3>
                    <p className="text-sm text-neutral-500">ID: {item.id}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                  item.status === 'Completed' 
                    ? 'bg-gradient-to-r from-success-100 to-success-200 text-success-800'
                    : 'bg-gradient-to-r from-neutral-100 to-neutral-200 text-neutral-800'
                }`}>
                  {item.status || 'Tamamlandı'}
                </span>
              </div>
              
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-200/50">
                <div className="flex items-center space-x-4 text-xs text-neutral-500">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {new Date(item.createdAt).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {item.downloadUrl && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-primary-600 hover:text-primary-700"
                      onClick={() => window.open(item.downloadUrl, '_blank')}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      İndir
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-primary-600 hover:text-primary-700"
                    onClick={() => {
                      // TODO: Modal aç veya detay sayfasına yönlendir
                      alert(`Dilekçe #${item.id}\nKonu: ${item.topic}\nTarih: ${new Date(item.createdAt).toLocaleString('tr-TR')}`);
                    }}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    Detayı Gör
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
