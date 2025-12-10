import { useEffect, useState } from 'react';
import { petitionService, PetitionHistoryItem, PetitionDetail } from '../../services/petitionService';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';
import { LoadingState } from '../../components/common/LoadingState';
import { Skeleton } from '../../components/ui/skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { FileText, Clock, Calendar, Download, RefreshCw, X, ChevronDown, Scale, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import JSZip from 'jszip';

// İndirme fonksiyonları
const downloadAsTxt = (petition: PetitionDetail) => {
  const content = `${petition.topic || 'DİLEKÇE'}
════════════════════════════════════════════════════════════

${petition.content}

════════════════════════════════════════════════════════════
Oluşturma Tarihi: ${new Date(petition.createdAt).toLocaleDateString('tr-TR')}
Kaynak: Yargısal Zeka - yargisalzeka.com
`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dilekce-${petition.id}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const downloadAsDoc = (petition: PetitionDetail) => {
  const htmlContent = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${petition.topic || 'Dilekçe'}</title>
<style>
  body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; margin: 2cm; }
  h1 { font-size: 14pt; text-align: center; font-weight: bold; margin-bottom: 24pt; text-transform: uppercase; }
  .content { white-space: pre-wrap; text-align: justify; }
  .footer { margin-top: 30pt; font-size: 10pt; color: #666; text-align: center; border-top: 1px solid #ccc; padding-top: 10pt; }
</style>
</head>
<body>
  <h1>${petition.topic || 'DİLEKÇE'}</h1>
  <div class="content">${petition.content.replace(/\n/g, '<br>')}</div>
  <div class="footer">
    Oluşturma Tarihi: ${new Date(petition.createdAt).toLocaleDateString('tr-TR')}<br>
    Kaynak: Yargısal Zeka - yargisalzeka.com
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dilekce-${petition.id}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const downloadAsUdf = async (petition: PetitionDetail) => {
  const topic = petition.topic || 'Dilekçe';
  const content = petition.content;
  const createdAt = new Date(petition.createdAt).toLocaleDateString('tr-TR');
  const footerText = `Oluşturma Tarihi: ${createdAt} - Yargısal Zeka`;
  
  const allContent = `${topic}\n${content}\n${footerText}`;
  
  let offset = 0;
  const topicOffset = offset;
  const topicLength = topic.length;
  offset += topicLength + 1;
  
  const contentOffset = offset;
  const contentLength = content.length;
  offset += contentLength + 1;
  
  const footerOffset = offset;
  const footerLength = footerText.length;

  const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<template format_id="1.8" description="Dilekçe Taslağı" isTemplate="false">
  <content><![CDATA[${allContent}]]></content>
  
  <properties>
    <pageFormat mediaSizeName="A4" leftMargin="70.86" rightMargin="70.86" topMargin="56.69" bottomMargin="56.69" paperOrientation="portrait" headerFOffset="30.0" footerFOffset="30.0" />
  </properties>
  
  <styles>
    <style name="default" description="Varsayılan" family="Times New Roman" size="12" bold="false" italic="false" foreground="-16777216" />
    <style name="baslik" parent="default" size="14" bold="true" foreground="-16777216" />
    <style name="icerik" parent="default" size="12" bold="false" foreground="-16777216" />
    <style name="footer" parent="default" size="9" italic="true" foreground="-8421505" />
  </styles>
  
  <elements resolver="default">
    <header background="-1" foreground="-16777216">
      <paragraph Alignment="1">
        <content family="Times New Roman" size="14" bold="true" startOffset="${topicOffset}" length="${topicLength}" style="baslik" />
      </paragraph>
    </header>
    
    <paragraph Alignment="3" SpaceBefore="12.0" LineSpacing="1.5">
      <content family="Times New Roman" size="12" startOffset="${contentOffset}" length="${contentLength}" style="icerik" />
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
  a.download = `dilekce-${petition.id}.udf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default function PetitionHistoryPage() {
  const { data, loading, error, run } = useAsyncOperation<PetitionHistoryItem[]>();
  const [selectedPetition, setSelectedPetition] = useState<PetitionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { void run(() => petitionService.history()); }, [run]);

  const handleRetry = () => {
    void run(() => petitionService.history());
  };

  const handleViewDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const detail = await petitionService.getById(id);
      setSelectedPetition(detail);
    } catch (err) {
      console.error('Dilekçe detayı yüklenemedi:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCopy = async () => {
    if (!selectedPetition?.content) return;
    try {
      await navigator.clipboard.writeText(selectedPetition.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard failed
    }
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
            İlk dilekçe taslağınızı oluşturun, geçmiş burada görüntülenecek.
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

              {/* Preview */}
              {item.preview && (
                <p className="text-sm text-neutral-600 mb-3 line-clamp-2">
                  {item.preview}
                </p>
              )}
              
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
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-primary-600 hover:text-primary-700"
                    onClick={() => handleViewDetail(item.id)}
                    disabled={loadingDetail}
                  >
                    {loadingDetail ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Clock className="w-3 h-3 mr-1" />
                    )}
                    Detayı Gör
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedPetition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {selectedPetition.topic || 'Dilekçe'}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(selectedPetition.createdAt).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPetition(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Olay Metni */}
              {selectedPetition.caseText && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Olay Metni</h4>
                  <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
                    {selectedPetition.caseText}
                  </div>
                </div>
              )}

              {/* Emsal Kararlar */}
              {selectedPetition.decisions && selectedPetition.decisions.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Emsal Kararlar</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPetition.decisions.map((d, i) => (
                      <span key={i} className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-lg">
                        {d.length > 50 ? d.substring(0, 50) + '...' : d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Dilekçe İçeriği */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Dilekçe İçeriği</h4>
                <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">DİLEKÇE TASLAĞI</span>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3" />
                          Kopyalandı
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Kopyala
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-4 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">
                      {selectedPetition.content}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedPetition(null)}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg font-medium hover:bg-slate-200 transition-colors"
              >
                Kapat
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
                    onClick={() => downloadAsTxt(selectedPetition)}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    TXT olarak
                  </button>
                  <button
                    onClick={() => downloadAsDoc(selectedPetition)}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Word (.doc)
                  </button>
                  <button
                    onClick={() => downloadAsUdf(selectedPetition)}
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
