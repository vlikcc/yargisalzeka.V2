import { useState, useEffect } from 'react';
import { useSearch } from '../../contexts/SearchContext';
import { Button } from '../../components/ui/button';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { useSearchFlow } from '../../hooks/useSearch';
import { PetitionGenerator } from '../../components/petition/PetitionGenerator';
import { Search, Sparkles, FileText, Hash } from 'lucide-react';
import { Modal } from '../../components/common/Modal';

// Karar kartı ve modal bileşeni
function DecisionCardWithModal({ decision }: { decision: any }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="card hover-lift p-5 animate-slide-up">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-neutral-900 line-clamp-2">{decision.title}</h4>
          {decision.score !== undefined && (
            <span className="px-2.5 py-1 bg-gradient-to-r from-primary-100 to-primary-200 text-primary-700 text-xs font-semibold rounded-full">Skor: {decision.score}</span>
          )}
        </div>
        {decision.excerpt && (
          <p className="text-sm text-neutral-600 leading-relaxed line-clamp-3">{decision.excerpt}</p>
        )}
        <div className="flex justify-end mt-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Detayı Gör
          </Button>
        </div>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={decision.title}>
        <div className="space-y-2">
          <div className="text-xs text-neutral-500">Skor: {decision.score ?? '-'}</div>
          <div className="text-xs text-neutral-500">Mahkeme: {decision.court ?? '-'}</div>
          <div className="text-xs text-neutral-500">
            Tarih: {decision.decisionDate ? new Date(decision.decisionDate).toLocaleDateString('tr-TR') : '-'}
          </div>
          <div className="mt-2 whitespace-pre-line text-sm text-neutral-800">
            {/* Tam metin varsa onu göster, yoksa excerpt */}
            {decision.kararMetni || decision.excerpt}
          </div>
          {decision.relevanceExplanation && (
            <div className="mt-2 text-xs text-primary-700">AI Açıklama: {decision.relevanceExplanation}</div>
          )}
          {decision.relevanceSimilarity && (
            <div className="mt-2 text-xs text-primary-700">Benzerlik: {decision.relevanceSimilarity}</div>
          )}
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={() => setOpen(false)} className="btn-primary">Kapat</Button>
        </div>
      </Modal>
    </>
  );
}

export default function SearchPage() {
  const [text, setText] = useState('');
  const { results, loading, error } = useSearch();
  // useSearchFlow artık yalnızca isSearching ve result döndürüyor; eski aşama bayrakları kaldırıldı.
  const { runSearch, result, isSearching, error: flowError, loadHistory } = useSearchFlow();
  
  // Kelime sayısını hesapla
  const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
  const maxWords = 300;
  const isOverLimit = wordCount > maxWords;

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const newWordCount = newText.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    // 300 kelimeden fazla ise güncellemeyi engelle
    if (newWordCount <= maxWords || newText.length < text.length) {
      setText(newText);
    }
  };
  
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isOverLimit) return;
    void runSearch({ caseText: text });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="glass-card">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-glow">
            <Search className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold gradient-text">Akıllı Hukuki Arama</h2>
            <p className="text-sm text-neutral-500">Olayınızı anlatın, size en uygun kararları bulalım</p>
          </div>
        </div>
      </div>
      
      {/* Search Form */}
      <form onSubmit={submit} className="glass-card space-y-4">
        <div className="relative">
          <textarea 
            value={text} 
            onChange={handleTextChange}
            rows={6} 
            className={`w-full p-4 pr-12 bg-white/50 backdrop-blur-sm border rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500/50 focus:bg-white transition-all duration-200 resize-none ${
              isOverLimit 
                ? 'border-error-300 focus:ring-error-500/10 focus:border-error-500/50' 
                : 'border-neutral-200/50'
            }`}
            placeholder="Örneğin: Komşum bahçesine ağaç dikti ve bu ağaç benim evimin ışığını engelliyor..." 
          />
          <Sparkles className="absolute top-4 right-4 w-5 h-5 text-primary-400 animate-pulse" />
        </div>
        
        {/* Kelime sayacı */}
        <div className="flex items-center justify-between text-xs">
          <p className="text-neutral-500">
            Detaylı anlatım daha iyi sonuçlar sağlar
          </p>
          <div className={`font-medium ${
            isOverLimit 
              ? 'text-error-600' 
              : wordCount > maxWords * 0.8 
                ? 'text-amber-600' 
                : 'text-neutral-500'
          }`}>
            {wordCount}/{maxWords} kelime
            {isOverLimit && (
              <span className="ml-2 text-error-600">• Limit aşıldı</span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end">
          <Button 
            disabled={isSearching || !text.trim() || isOverLimit} 
            className="btn-primary px-6 py-2.5 font-semibold shadow-glow"
          >
            {(loading || isSearching) ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Analiz Ediliyor...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Ara ve Analiz Et
              </>
            )}
          </Button>
        </div>
      </form>
      {/* Loading States */}
  {isSearching && (
        <div className="glass-card animate-slide-up">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
                <div className="w-6 h-6 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-neutral-900">İşlem devam ediyor...</p>
              <p className="text-sm text-neutral-500">Lütfen bekleyin, bu birkaç saniye sürebilir...</p>
            </div>
          </div>
        </div>
      )}
      {(flowError) && (
        <ErrorState description={flowError || 'Hata'} onRetry={() => { void runSearch({ caseText: text }); }} />
      )}
      {/* Results */}
      <div className="space-y-4">
        {result && (
          <div className="glass-card animate-slide-up">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center shadow-soft">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-neutral-900">Olay Analizi</h3>
                  <p className="text-sm text-neutral-500">Yapay zeka analizi tamamlandı</p>
                </div>
              </div>
              {result.decisions && result.decisions.length === 0 && (
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                  Karar bulunamadı
                </span>
              )}
            </div>
            
            <div className="bg-neutral-50/50 rounded-xl p-4 mb-4">
              <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">{result.analysis || 'Özet yok'}</p>
            </div>
            
            {result.keywords && result.keywords.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Hash className="w-4 h-4 text-primary-600" />
                  <h4 className="text-sm font-semibold text-neutral-900">Anahtar Kelimeler</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.keywords.map(k => (
                    <span 
                      key={k} 
                      className="px-3 py-1.5 bg-gradient-to-r from-primary-100 to-primary-200 text-primary-800 text-xs font-medium rounded-full hover:shadow-soft transition-all duration-200 cursor-pointer hover:scale-105"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="border-t border-neutral-200/50 pt-4">
              <PetitionGenerator currentSearch={result} />
            </div>
          </div>
        )}
        {/* Search Results */}
        {result && result.decisions && result.decisions.length > 0 && result.decisions.map(d => (
          <DecisionCardWithModal key={d.id} decision={d} />
        ))}
  {!isSearching && result && result.decisions && result.decisions.length === 0 && (
          <div className="glass-card text-center py-8">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-amber-600" />
            </div>
            <p className="text-sm text-neutral-600">
              Girilen metin için uygun karar bulunamadı.
            </p>
            <p className="text-sm text-neutral-500">
              Yine de analiz ve anahtar kelimeler üretildi.
            </p>
          </div>
        )}
        
  {!isSearching && !result && (
          <div className="glass-card text-center py-12">
            <div className="w-20 h-20 bg-neutral-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-neutral-400" />
            </div>
            <p className="text-lg font-semibold text-neutral-900 mb-2">
              Aramaya Başlayın
            </p>
            <p className="text-sm text-neutral-500 max-w-md mx-auto">
              Hukuki olayınızı yukarıdaki alana yazın ve yapay zeka destekli analizimizden yararlanın.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
