import { useState, useEffect, useCallback } from 'react';
import { useSearchFlow } from '../../hooks/useSearch';
import { PetitionGenerator } from '../../components/petition/PetitionGenerator';
import { Search, Loader2, AlertCircle, FileText, Hash, ChevronDown, ChevronUp, Scale, Sparkles, Download, Bookmark, X, BookmarkCheck, Clock, History } from 'lucide-react';
import JSZip from 'jszip';
import { searchService } from '../../services/searchService';

// HTML etiketlerini temizleme ve highlight yapma
const sanitizeAndHighlight = (text: string) => {
  // <mark> etiketlerini span ile değiştir
  return text
    .replace(/<mark>/g, '<span class="bg-yellow-200 text-yellow-900 px-0.5 rounded">')
    .replace(/<\/mark>/g, '</span>');
};

// TXT olarak indirme fonksiyonu (Türkçe karakter desteği ile)
const downloadAsTxt = (decision: any) => {
  const fullText = (decision.fullText || decision.excerpt || '').replace(/<[^>]*>/g, '');
  
  const content = `YARGITAY KARARI
════════════════════════════════════════════════════════════

KARAR BİLGİLERİ
────────────────────────────────────────────────────────────
Daire: ${decision.court || 'Belirtilmemiş'}
Karar No: ${decision.title || 'Belirtilmemiş'}
Karar Tarihi: ${decision.decisionDate ? new Date(decision.decisionDate).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}

KARAR METNİ
────────────────────────────────────────────────────────────
${fullText}

════════════════════════════════════════════════════════════
İndirme Tarihi: ${new Date().toLocaleDateString('tr-TR')}
Kaynak: Yargısal Zeka - yargisalzeka.com
`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `yargitay_karari_${decision.id || 'unknown'}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// DOCX olarak indirme (HTML tabanlı - Word tarafından açılabilir)
const downloadAsDocx = (decision: any) => {
  const fullText = (decision.fullText || decision.excerpt || '').replace(/<[^>]*>/g, '');
  
  // Word-compatible HTML oluştur
  const htmlContent = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>Yargıtay Kararı</title>
<style>
  body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; margin: 2cm; }
  h1 { font-size: 16pt; text-align: center; font-weight: bold; margin-bottom: 20pt; }
  h2 { font-size: 14pt; font-weight: bold; margin-top: 20pt; margin-bottom: 10pt; border-bottom: 1px solid #000; padding-bottom: 5pt; }
  .info { margin-bottom: 5pt; }
  .info-label { font-weight: bold; }
  .content { text-align: justify; white-space: pre-wrap; }
  .footer { margin-top: 30pt; font-size: 10pt; color: #666; text-align: center; border-top: 1px solid #ccc; padding-top: 10pt; }
</style>
</head>
<body>
  <h1>YARGITAY KARARI</h1>
  
  <h2>KARAR BİLGİLERİ</h2>
  <p class="info"><span class="info-label">Daire:</span> ${decision.court || 'Belirtilmemiş'}</p>
  <p class="info"><span class="info-label">Karar No:</span> ${decision.title || 'Belirtilmemiş'}</p>
  <p class="info"><span class="info-label">Karar Tarihi:</span> ${decision.decisionDate ? new Date(decision.decisionDate).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}</p>
  
  <h2>KARAR METNİ</h2>
  <div class="content">${fullText}</div>
  
  <div class="footer">
    İndirme Tarihi: ${new Date().toLocaleDateString('tr-TR')}<br>
    Kaynak: Yargısal Zeka - yargisalzeka.com
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `yargitay_karari_${decision.id || 'unknown'}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// UYAP UDF formatında indirme
const downloadAsUdf = async (decision: any) => {
  const fullText = (decision.fullText || decision.excerpt || '').replace(/<[^>]*>/g, '');
  const court = decision.court || 'Belirtilmemiş';
  const title = decision.title || 'Belirtilmemiş';
  const date = decision.decisionDate ? new Date(decision.decisionDate).toLocaleDateString('tr-TR') : 'Belirtilmemiş';
  const downloadDate = new Date().toLocaleDateString('tr-TR');
  
  // Tüm içerik metni (CDATA bloğu için)
  const headerText = 'YARGITAY KARARI';
  const infoText = `Daire: ${court}\nKarar No: ${title}\nKarar Tarihi: ${date}`;
  const contentText = fullText;
  const footerText = `İndirme Tarihi: ${downloadDate} - Yargısal Zeka`;
  
  const allContent = `${headerText}\n${infoText}\n${contentText}\n${footerText}`;
  
  // Offset hesaplamaları
  let offset = 0;
  const headerOffset = offset;
  const headerLength = headerText.length;
  offset += headerLength + 1;
  
  const infoOffset = offset;
  const infoLength = infoText.length;
  offset += infoLength + 1;
  
  const contentOffset = offset;
  const contentLength = contentText.length;
  offset += contentLength + 1;
  
  const footerOffset = offset;
  const footerLength = footerText.length;

  // UDF content.xml oluştur
  const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<template format_id="1.8" description="Yargıtay Kararı" isTemplate="false">
  <content><![CDATA[${allContent}]]></content>
  
  <properties>
    <pageFormat mediaSizeName="A4" leftMargin="70.86" rightMargin="70.86" topMargin="56.69" bottomMargin="56.69" paperOrientation="portrait" headerFOffset="30.0" footerFOffset="30.0" />
  </properties>
  
  <styles>
    <style name="default" description="Varsayılan" family="Times New Roman" size="12" bold="false" italic="false" foreground="-16777216" />
    <style name="baslik" parent="default" size="16" bold="true" foreground="-16777216" />
    <style name="altbaslik" parent="default" size="12" bold="true" foreground="-16777216" />
    <style name="icerik" parent="default" size="11" bold="false" foreground="-16777216" />
    <style name="footer" parent="default" size="9" italic="true" foreground="-8421505" />
  </styles>
  
  <elements resolver="default">
    <header background="-1" foreground="-16777216">
      <paragraph Alignment="1">
        <content family="Times New Roman" size="16" bold="true" startOffset="${headerOffset}" length="${headerLength}" style="baslik" />
      </paragraph>
    </header>
    
    <paragraph Alignment="0" SpaceBefore="12.0" SpaceAfter="6.0">
      <content family="Times New Roman" size="12" bold="true" startOffset="${infoOffset}" length="${infoLength}" style="altbaslik" />
    </paragraph>
    
    <paragraph Alignment="3" SpaceBefore="12.0" LineSpacing="1.5">
      <content family="Times New Roman" size="11" startOffset="${contentOffset}" length="${contentLength}" style="icerik" />
    </paragraph>
    
    <footer background="-1" foreground="-8421505">
      <paragraph Alignment="1">
        <content family="Times New Roman" size="9" italic="true" startOffset="${footerOffset}" length="${footerLength}" style="footer" />
      </paragraph>
    </footer>
  </elements>
</template>`;

  // ZIP oluştur
  const zip = new JSZip();
  zip.file('content.xml', contentXml);
  
  // ZIP'i blob olarak al ve indir
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `yargitay_karari_${decision.id || 'unknown'}.udf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default function SearchPage() {
  const [text, setText] = useState('');
  const [expandedDecision, setExpandedDecision] = useState<number | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<any | null>(null);
  const [savedDecisionIds, setSavedDecisionIds] = useState<Set<number>>(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const [savingDecisionId, setSavingDecisionId] = useState<number | null>(null);
  const { runSearch, result, isSearching, error, loadHistory, history } = useSearchFlow();
  
  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const maxWords = 300;
  const isOverLimit = wordCount > maxWords;

  // Kaydedilen kararları API'den yükle
  const loadSavedDecisions = useCallback(async () => {
    try {
      const saved = await searchService.getSavedDecisions();
      setSavedDecisionIds(new Set(saved.map(d => d.decisionId)));
    } catch {
      // Hata durumunda sessizce devam et
    }
  }, []);

  useEffect(() => { 
    loadHistory(); 
    loadSavedDecisions();
  }, [loadHistory, loadSavedDecisions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isOverLimit) return;
    runSearch({ caseText: text });
  };

  const handleSaveToggle = async (decision: any) => {
    setSavingDecisionId(decision.id);
    try {
      if (savedDecisionIds.has(decision.id)) {
        await searchService.removeDecision(decision.id);
        setSavedDecisionIds(prev => {
          const next = new Set(prev);
          next.delete(decision.id);
          return next;
        });
      } else {
        await searchService.saveDecision(decision.id);
        setSavedDecisionIds(prev => new Set(prev).add(decision.id));
      }
    } catch (err) {
      console.error('Karar kaydetme/silme hatası:', err);
    } finally {
      setSavingDecisionId(null);
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
                        
                        <div className="relative group">
                          <button
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            İndir
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </button>
                          <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <button
                              onClick={() => downloadAsTxt(decision)}
                              className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              TXT olarak
                            </button>
                            <button
                              onClick={() => downloadAsDocx(decision)}
                              className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              Word (.doc)
                            </button>
                            <button
                              onClick={() => downloadAsUdf(decision)}
                              className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Scale className="w-4 h-4" />
                              UYAP (.udf)
                            </button>
                          </div>
                        </div>
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

      {/* Empty State with Search History */}
      {!isSearching && !result && (
        <div className="space-y-6">
          <div className="card p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Aramaya Başlayın</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Hukuki olayınızı yukarıdaki alana yazın ve yapay zeka destekli analizden yararlanın.
            </p>
          </div>
          
          {/* Search History */}
          {history && history.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-500" />
                  <h3 className="font-semibold text-slate-900">Son Aramalarınız</h3>
                </div>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  {showHistory ? 'Gizle' : `Tümünü Gör (${history.length})`}
                </button>
              </div>
              
              <div className="space-y-3">
                {(showHistory ? history : history.slice(0, 5)).map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {item.keywords.slice(0, 5).map((keyword, idx) => (
                          <span 
                            key={idx}
                            className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full"
                          >
                            {keyword}
                          </span>
                        ))}
                        {item.keywords.length > 5 && (
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs rounded-full">
                            +{item.keywords.length - 5}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.createdAt).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span>{item.resultCount} sonuç</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setText(item.keywords.join(', '))}
                      className="ml-3 px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      Tekrar Ara
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
              
              <div className="relative group">
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  İndir
                  <ChevronDown className="w-3 h-3" />
                </button>
                <div className="absolute right-0 bottom-full mb-1 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => downloadAsTxt(selectedDecision)}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    TXT olarak
                  </button>
                  <button
                    onClick={() => downloadAsDocx(selectedDecision)}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Word (.doc)
                  </button>
                  <button
                    onClick={() => downloadAsUdf(selectedDecision)}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Scale className="w-4 h-4" />
                    UYAP (.udf)
                  </button>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}
    </div>
  );
}
