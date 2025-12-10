import { useEffect, useState, useCallback } from 'react';
import { searchService, SavedDecisionItem } from '../../services/searchService';
import { LoadingState } from '../../components/common/LoadingState';
import { Skeleton } from '../../components/ui/skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { Scale, Calendar, Trash2, RefreshCw, Download, FileText, ChevronDown, X, Bookmark } from 'lucide-react';
import { Button } from '../../components/ui/button';
import JSZip from 'jszip';

// İndirme fonksiyonları
const downloadAsTxt = (decision: any) => {
  const fullText = decision.fullText || decision.excerpt || decision.kararMetni || '';
  const content = `YARGITAY KARARI
════════════════════════════════════════════════════════════

KARAR BİLGİLERİ
────────────────────────────────────────────────────────────
Daire: ${decision.court || decision.yargitayDairesi || 'Belirtilmemiş'}
Karar No: ${decision.title || `${decision.esasNo}/${decision.kararNo}` || 'Belirtilmemiş'}
Karar Tarihi: ${decision.decisionDate || decision.kararTarihi ? new Date(decision.decisionDate || decision.kararTarihi).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}

KARAR METNİ
────────────────────────────────────────────────────────────
${fullText.replace(/<[^>]*>/g, '')}

════════════════════════════════════════════════════════════
İndirme Tarihi: ${new Date().toLocaleDateString('tr-TR')}
Kaynak: Yargısal Zeka - yargisalzeka.com
`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `yargitay_karari_${decision.id || decision.decisionId}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const downloadAsDoc = (decision: any) => {
  const fullText = (decision.fullText || decision.excerpt || decision.kararMetni || '').replace(/<[^>]*>/g, '');
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
  <p class="info"><span class="info-label">Daire:</span> ${decision.court || decision.yargitayDairesi || 'Belirtilmemiş'}</p>
  <p class="info"><span class="info-label">Karar No:</span> ${decision.title || `${decision.esasNo}/${decision.kararNo}` || 'Belirtilmemiş'}</p>
  <p class="info"><span class="info-label">Karar Tarihi:</span> ${decision.decisionDate || decision.kararTarihi ? new Date(decision.decisionDate || decision.kararTarihi).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}</p>
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
  a.download = `yargitay_karari_${decision.id || decision.decisionId}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const downloadAsUdf = async (decision: any) => {
  const court = decision.court || decision.yargitayDairesi || 'Belirtilmemiş';
  const title = decision.title || `${decision.esasNo}/${decision.kararNo}` || 'Belirtilmemiş';
  const date = decision.decisionDate || decision.kararTarihi ? new Date(decision.decisionDate || decision.kararTarihi).toLocaleDateString('tr-TR') : 'Belirtilmemiş';
  const fullText = (decision.fullText || decision.excerpt || decision.kararMetni || '').replace(/<[^>]*>/g, '');
  const downloadDate = new Date().toLocaleDateString('tr-TR');
  
  const headerText = 'YARGITAY KARARI';
  const infoText = `Daire: ${court}\nKarar No: ${title}\nKarar Tarihi: ${date}`;
  const footerText = `İndirme Tarihi: ${downloadDate} - Yargısal Zeka`;
  
  const allContent = `${headerText}\n${infoText}\n${fullText}\n${footerText}`;
  
  let offset = 0;
  const headerOffset = offset;
  const headerLength = headerText.length;
  offset += headerLength + 1;
  
  const infoOffset = offset;
  const infoLength = infoText.length;
  offset += infoLength + 1;
  
  const contentOffset = offset;
  const contentLength = fullText.length;
  offset += contentLength + 1;
  
  const footerOffset = offset;
  const footerLength = footerText.length;

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

  const zip = new JSZip();
  zip.file('content.xml', contentXml);
  
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `yargitay_karari_${decision.id || decision.decisionId}.udf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default function SavedDecisionsPage() {
  const [data, setData] = useState<SavedDecisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const loadSavedDecisions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const saved = await searchService.getSavedDecisions();
      setData(saved);
    } catch (err) {
      setError('Kaydedilen kararlar yüklenemedi');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSavedDecisions();
  }, [loadSavedDecisions]);

  const handleRemove = async (decisionId: number) => {
    setRemovingId(decisionId);
    try {
      await searchService.removeDecision(decisionId);
      setData(prev => prev.filter(d => d.decisionId !== decisionId));
    } catch (err) {
      console.error('Karar silme hatası:', err);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="glass-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-glow">
              <Bookmark className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold gradient-text">Kaydedilen Kararlar</h2>
              <p className="text-sm text-neutral-500">Kaydettiğiniz Yargıtay kararları</p>
            </div>
          </div>
          <Button 
            onClick={loadSavedDecisions} 
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
      {loading && data.length === 0 && (
        <div className="glass-card animate-slide-up">
          <LoadingState message="Kaydedilen kararlar yükleniyor..." />
          <div className="space-y-3 mt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-neutral-50 rounded-xl p-4 animate-pulse">
                <div className="flex justify-between items-start mb-2">
                  <Skeleton className="h-5 w-48" />
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
            onRetry={loadSavedDecisions}
          />
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && data.length === 0 && (
        <div className="glass-card text-center py-12 animate-fade-in">
          <div className="w-20 h-20 bg-neutral-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Bookmark className="w-10 h-10 text-neutral-400" />
          </div>
          <p className="text-lg font-semibold text-neutral-900 mb-2">
            Henüz karar kaydetmediniz
          </p>
          <p className="text-sm text-neutral-500 max-w-md mx-auto mb-4">
            Arama sonuçlarında beğendiğiniz kararları kaydedin, buradan erişebilirsiniz.
          </p>
          <Button 
            onClick={() => window.location.href = '/app/search'}
            className="btn-primary"
          >
            <Scale className="w-4 h-4 mr-2" />
            Karar Ara
          </Button>
        </div>
      )}

      {/* Saved Decisions List */}
      {data.length > 0 && (
        <div className="grid gap-4">
          {data.map((item, index) => (
            <div 
              key={item.decisionId} 
              className="card hover-lift animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center shadow-soft">
                    <Scale className="w-5 h-5 text-primary-700" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900">
                      Karar #{item.decisionId}
                    </h3>
                    <p className="text-sm text-neutral-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Kayıt: {new Date(item.savedAt).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-200/50">
                <div className="flex items-center space-x-2">
                  {/* İndirme dropdown - şu an sadece ID var, tam veri yok */}
                  <div className="relative group">
                    <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700">
                      <Download className="w-3 h-3 mr-1" />
                      İndir
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </Button>
                    <div className="absolute left-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      <button
                        onClick={() => downloadAsTxt({ decisionId: item.decisionId })}
                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        TXT olarak
                      </button>
                      <button
                        onClick={() => downloadAsDoc({ decisionId: item.decisionId })}
                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Word (.doc)
                      </button>
                      <button
                        onClick={() => downloadAsUdf({ decisionId: item.decisionId })}
                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Scale className="w-4 h-4" />
                        UYAP (.udf)
                      </button>
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-error-600 hover:text-error-700 hover:bg-error-50"
                  onClick={() => handleRemove(item.decisionId)}
                  disabled={removingId === item.decisionId}
                >
                  {removingId === item.decisionId ? (
                    <div className="w-3 h-3 border-2 border-error-400 border-t-error-700 rounded-full animate-spin mr-1" />
                  ) : (
                    <Trash2 className="w-3 h-3 mr-1" />
                  )}
                  Kaldır
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

