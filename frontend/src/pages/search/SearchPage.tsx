import { useState, useEffect } from 'react';
import { useSearch } from '../../contexts/SearchContext';
import { Button } from '../../components/ui/button';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { useSearchFlow } from '../../hooks/useSearch';
import { PetitionGenerator } from '../../components/petition/PetitionGenerator';

export default function SearchPage() {
  const [text, setText] = useState('');
  const { results, loading, error } = useSearch();
  const { runSearch, result, isSearching, isAnalyzing, isSearchingDecisions, isExtractingKeywords, error: flowError, loadHistory } = useSearchFlow();

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
  void runSearch({ caseText: text });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Arama</h2>
      <form onSubmit={submit} className="space-y-2">
        <textarea value={text} onChange={e => setText(e.target.value)} rows={5} className="w-full border rounded p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Olay metnini girin" />
        <Button disabled={loading} className="font-medium">{loading ? 'Aranıyor...' : 'Ara'}</Button>
      </form>
  {(loading || isSearching) && <LoadingState message="İstek başlatıldı" />}
  {isAnalyzing && <LoadingState message="Analiz yapılıyor" />}
  {isSearchingDecisions && <LoadingState message="Kararlar aranıyor" />}
  {isExtractingKeywords && <LoadingState message="Anahtar kelimeler çıkarılıyor" />}
      {(error || flowError) && (
        <ErrorState description={error || flowError || 'Hata'} onRetry={() => { void runSearch({ caseText: text }); }} />
      )}
      <div className="space-y-2">
        {result && (
          <div className="p-4 border rounded bg-white">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Olay Analizi</div>
              {result.scoredDecisions && result.scoredDecisions.length === 0 && (
                <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">Karar bulunamadı</span>
              )}
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {result.analysis.summary || (result as any).analysis.AnalysisResult || 'Özet yok'}
            </p>
            {result.keywords && result.keywords.keywords.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-medium text-gray-500 mb-1">Anahtar Kelimeler</div>
                <div className="flex flex-wrap gap-1">
                  {result.keywords.keywords.map(k => (
                    <span key={k} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">{k}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4">
              <PetitionGenerator currentSearch={result} />
            </div>
          </div>
        )}
        {results.map(r => (
          <div key={r.id} className="p-3 border rounded bg-white">
            <div className="font-medium">{r.title}</div>
            <div className="text-xs text-gray-500">Skor: {r.score}</div>
            {r.summary && <p className="text-sm mt-1 text-gray-600">{r.summary}</p>}
          </div>
        ))}
        {!loading && !isSearching && result && result.scoredDecisions && result.scoredDecisions.length === 0 && (
          <div className="text-sm text-gray-500">Girilen metin için uygun karar bulunamadı. Yine de analiz ve anahtar kelimeler üretildi.</div>
        )}
        {!loading && !isSearching && !result && results.length === 0 && (
          <div className="text-sm text-gray-500">Henüz arama yapılmadı.</div>
        )}
      </div>
    </div>
  );
}
