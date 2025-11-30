import { useState, useEffect } from 'react';
import { useSearchFlow } from '../../hooks/useSearch';
import { PetitionGenerator } from '../../components/petition/PetitionGenerator';
import { Search, Loader2, AlertCircle, FileText, Hash, ChevronDown, ChevronUp, Scale, Sparkles, Download, Bookmark, X, BookmarkCheck } from 'lucide-react';
import { jsPDF } from 'jspdf';

// Kaydedilen kararlar için localStorage key
const SAVED_DECISIONS_KEY = 'yargisalzeka_saved_decisions';

// HTML etiketlerini temizleme ve highlight yapma
const sanitizeAndHighlight = (text: string) => {
  // <mark> etiketlerini span ile değiştir
  return text
    .replace(/<mark>/g, '<span class="bg-yellow-200 text-yellow-900 px-0.5 rounded">')
    .replace(/<\/mark>/g, '</span>');
};

// PDF oluşturma fonksiyonu
const generatePDF = (decision: any) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPos = 20;
  
  // Başlık
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('YARGITAY KARARI', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;
  
  // Çizgi
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;
  
  // Karar Bilgileri
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Karar Bilgileri:', margin, yPos);
  yPos += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const info = [
    `Daire: ${decision.court || 'Belirtilmemis'}`,
    `Karar No: ${decision.title || 'Belirtilmemis'}`,
    `Karar Tarihi: ${decision.decisionDate ? new Date(decision.decisionDate).toLocaleDateString('tr-TR') : 'Belirtilmemis'}`,
  ];
  
  info.forEach(line => {
    doc.text(line, margin, yPos);
    yPos += 6;
  });
  
  yPos += 5;
  
  // Karar Metni
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Karar Metni:', margin, yPos);
  yPos += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const fullText = (decision.fullText || decision.excerpt || '').replace(/<[^>]*>/g, '');
  const textLines = doc.splitTextToSize(fullText, maxWidth);
  
  textLines.forEach((line: string) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(line, margin, yPos);
    yPos += 4.5;
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `${new Date().toLocaleDateString('tr-TR')} - Sayfa ${i}/${pageCount}`,
      pageWidth / 2,
      285,
      { align: 'center' }
    );
  }
  
  // PDF'i indir
  doc.save(`yargitay_karari_${decision.id || 'unknown'}.pdf`);
};

// Karar kaydetme fonksiyonları
const getSavedDecisions = (): any[] => {
  try {
    const saved = localStorage.getItem(SAVED_DECISIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveDecision = (decision: any) => {
  const saved = getSavedDecisions();
  if (!saved.find((d: any) => d.id === decision.id)) {
    saved.push({
      ...decision,
      savedAt: new Date().toISOString()
    });
    localStorage.setItem(SAVED_DECISIONS_KEY, JSON.stringify(saved));
  }
};

const removeDecision = (decisionId: number) => {
  const saved = getSavedDecisions();
  const filtered = saved.filter((d: any) => d.id !== decisionId);
  localStorage.setItem(SAVED_DECISIONS_KEY, JSON.stringify(filtered));
};

const isDecisionSaved = (decisionId: number): boolean => {
  const saved = getSavedDecisions();
  return saved.some((d: any) => d.id === decisionId);
};

export default function SearchPage() {
  const [text, setText] = useState('');
  const [expandedDecision, setExpandedDecision] = useState<number | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<any | null>(null);
  const [savedDecisionIds, setSavedDecisionIds] = useState<Set<number>>(new Set());
  const { runSearch, result, isSearching, error, loadHistory } = useSearchFlow();
  
  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const maxWords = 300;
  const isOverLimit = wordCount > maxWords;

  useEffect(() => { 
    loadHistory(); 
    // Kaydedilen kararları yükle
    const saved = getSavedDecisions();
    setSavedDecisionIds(new Set(saved.map((d: any) => d.id)));
  }, [loadHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isOverLimit) return;
    runSearch({ caseText: text });
  };

  const handleSaveToggle = (decision: any) => {
    if (savedDecisionIds.has(decision.id)) {
      removeDecision(decision.id);
      setSavedDecisionIds(prev => {
        const next = new Set(prev);
        next.delete(decision.id);
        return next;
      });
    } else {
      saveDecision(decision);
      setSavedDecisionIds(prev => new Set(prev).add(decision.id));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
          <div>
        <h1 className="heading-3 mb-2">Hukuki Arama</h1>
        <p className="text-small">Olayınızı anlatın, size en uygun kararları bulalım</p>
      </div>
      
      {/* Search Form */}
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Olay Açıklaması
            </label>
          <textarea 
            value={text} 
              onChange={(e) => {
                const newText = e.target.value;
                const newWordCount = newText.trim().split(/\s+/).filter(w => w.length > 0).length;
                if (newWordCount <= maxWords || newText.length < text.length) {
                  setText(newText);
                }
              }}
            rows={6} 
              className={`textarea ${isOverLimit ? 'border-error-300 focus:border-error-500 focus:ring-error-100' : ''}`}
              placeholder="Örneğin: Komşum bahçesine ağaç dikti ve bu ağaç benim evimin ışığını engelliyor. Bu konuda ne yapabilirim?" 
            />
            <div className="flex justify-between mt-2">
              <p className="text-xs text-slate-400">
                Detaylı açıklama daha iyi sonuçlar sağlar
              </p>
              <p className={`text-xs font-medium ${
                isOverLimit ? 'text-error-600' : wordCount > maxWords * 0.8 ? 'text-warning-600' : 'text-slate-400'
          }`}>
            {wordCount}/{maxWords} kelime
              </p>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button 
              type="submit"
            disabled={isSearching || !text.trim() || isOverLimit} 
              className="btn-primary"
          >
              {isSearching ? (
              <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analiz Ediliyor...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Ara ve Analiz Et
              </>
            )}
            </button>
        </div>
      </form>
      </div>

      {/* Loading State */}
  {isSearching && (
        <div className="card p-8 text-center">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
              </div>
          <p className="text-slate-900 font-medium mb-1">Yapay Zeka Analiz Ediyor</p>
          <p className="text-sm text-slate-500">Bu işlem birkaç saniye sürebilir...</p>
            </div>
      )}

      {/* Error State */}
      {error && (
        <div className="card p-6 border-error-200 bg-error-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-error-600 mt-0.5" />
            <div>
              <p className="font-medium text-error-800">Bir Hata Oluştu</p>
              <p className="text-sm text-error-600 mt-1">{error}</p>
              <button 
                onClick={() => runSearch({ caseText: text })}
                className="mt-3 text-sm font-medium text-error-700 hover:text-error-800"
              >
                Tekrar Dene →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !isSearching && (
        <div className="space-y-6 animate-fade-in">
          {/* Analysis Card */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-700" />
                </div>
                <div>
                <h3 className="font-semibold text-slate-900">Olay Analizi</h3>
                <p className="text-xs text-slate-500">Yapay zeka tarafından oluşturuldu</p>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {result.analysis || 'Analiz sonucu bulunamadı'}
              </p>
            </div>
            
            {/* Keywords */}
            {result.keywords && result.keywords.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Hash className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">Anahtar Kelimeler</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.keywords.map(keyword => (
                    <span 
                      key={keyword} 
                      className="badge-primary"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Decisions */}
          {result.decisions && result.decisions.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">En Uygun Kararlar</h3>
                <span className="badge-primary">{result.decisions.length} karar</span>
              </div>
              
              {result.decisions.map((decision, index) => (
                <div key={decision.id} className="card overflow-hidden">
                  {/* Header */}
                  <div className="p-4 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
                          <Scale className="w-4 h-4 text-primary-700" />
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900">{decision.title}</h4>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            {decision.court && <span>{decision.court}</span>}
                            {decision.decisionDate && (
                              <span>{new Date(decision.decisionDate).toLocaleDateString('tr-TR')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {decision.score !== undefined && decision.score !== null && (
                        <div className="shrink-0 px-3 py-1 bg-success-100 text-success-700 rounded-full text-sm font-medium">
                          Uygunluk: %{decision.score}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {decision.relevanceExplanation && (
                      <p className="text-sm text-slate-600 mb-3">
                        <span className="font-medium text-slate-700">Neden uygun: </span>
                        {decision.relevanceExplanation.replace(/<[^>]*>/g, '')}
                      </p>
                    )}
                    
                    <div 
                      className="text-sm text-slate-600 leading-relaxed"
                      dangerouslySetInnerHTML={{ 
                        __html: sanitizeAndHighlight(
                          expandedDecision === index 
                            ? (decision.fullText || decision.excerpt || '')
                            : (decision.excerpt?.substring(0, 300) + '...' || '')
                        )
                      }}
                    />
                    
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        {(decision.fullText || decision.excerpt) && (decision.fullText || decision.excerpt).length > 300 && (
                          <button
                            onClick={() => setExpandedDecision(expandedDecision === index ? null : index)}
                            className="flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-800"
                          >
                            {expandedDecision === index ? (
                              <>
                                <ChevronUp className="w-4 h-4" />
                                Daha Az Göster
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4" />
                                Daha Fazla Göster
                              </>
                            )}
                          </button>
                        )}
                        
                        <button
                          onClick={() => setSelectedDecision(decision)}
                          className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-800 ml-4"
                        >
                          <FileText className="w-4 h-4" />
                          Tam Metni Görüntüle
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveToggle(decision)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            savedDecisionIds.has(decision.id)
                              ? 'bg-primary-100 text-primary-700'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {savedDecisionIds.has(decision.id) ? (
                            <>
                              <BookmarkCheck className="w-4 h-4" />
                              Kaydedildi
                            </>
                          ) : (
                            <>
                              <Bookmark className="w-4 h-4" />
                              Kaydet
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={() => generatePDF(decision)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          İndir
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-slate-600">Uygun karar bulunamadı</p>
              <p className="text-sm text-slate-400 mt-1">Yine de analiz ve anahtar kelimeler üretildi</p>
            </div>
          )}

          {/* Petition Generator */}
          <div className="card p-6">
            <PetitionGenerator currentSearch={result} originalCaseText={text} />
            </div>
          </div>
        )}

      {/* Empty State */}
      {!isSearching && !result && (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-slate-400" />
            </div>
          <h3 className="font-semibold text-slate-900 mb-2">Aramaya Başlayın</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Hukuki olayınızı yukarıdaki alana yazın ve yapay zeka destekli analizden yararlanın.
            </p>
          </div>
        )}
        
      {/* Full Text Modal */}
      {selectedDecision && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{selectedDecision.title}</h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                  {selectedDecision.court && <span>{selectedDecision.court}</span>}
                  {selectedDecision.decisionDate && (
                    <span>{new Date(selectedDecision.decisionDate).toLocaleDateString('tr-TR')}</span>
                  )}
                  {selectedDecision.score !== undefined && (
                    <span className="px-2 py-0.5 bg-success-100 text-success-700 rounded-full text-xs font-medium">
                      Uygunluk: %{selectedDecision.score}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedDecision(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {selectedDecision.relevanceExplanation && (
                <div className="mb-4 p-4 bg-primary-50 rounded-lg">
                  <p className="text-sm font-medium text-primary-800 mb-1">Neden Uygun?</p>
                  <p className="text-sm text-primary-700">{selectedDecision.relevanceExplanation.replace(/<[^>]*>/g, '')}</p>
                </div>
              )}
              
              <div className="prose prose-sm max-w-none">
                <h4 className="text-sm font-medium text-slate-700 mb-3">Karar Metni</h4>
                <div 
                  className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ 
                    __html: sanitizeAndHighlight(selectedDecision.fullText || selectedDecision.excerpt || 'Metin bulunamadı')
                  }}
                />
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => handleSaveToggle(selectedDecision)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  savedDecisionIds.has(selectedDecision.id)
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {savedDecisionIds.has(selectedDecision.id) ? (
                  <>
                    <BookmarkCheck className="w-4 h-4" />
                    Kaydedildi
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4" />
                    Kaydet
                  </>
                )}
              </button>
              
              <button
                onClick={() => generatePDF(selectedDecision)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                PDF İndir
              </button>
            </div>
          </div>
          </div>
        )}
    </div>
  );
}
