import { useEffect, useState } from 'react';
import { petitionService, PetitionHistoryItem, PetitionDetail } from '../../services/petitionService';
import { LoadingState } from '../../components/common/LoadingState';
import { FileText, Calendar, ChevronRight, Download, Eye, Scale, Search, X, Copy, Check } from 'lucide-react';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';
import { ErrorState } from '../../components/common/ErrorState';
import { downloadUdf } from '../../utils/udfGenerator';

// İndirme fonksiyonları
const downloadAsTxt = (petition: PetitionDetail) => {
  const content = petition.content || '';
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
  const content = petition.content || '';
  const htmlContent = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>Dilekçe - ${petition.topic}</title>
<style>
  body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; margin: 2cm; }
  h1 { font-size: 14pt; text-align: center; font-weight: bold; margin-bottom: 24pt; text-transform: uppercase; }
  .content { white-space: pre-wrap; text-align: justify; }
  .footer { margin-top: 30pt; font-size: 10pt; color: #666; text-align: center; border-top: 1px solid #ccc; padding-top: 10pt; }
</style>
</head>
<body>
  <h1>${petition.topic}</h1>
  <div class="content">${content.replace(/\n/g, '<br>')}</div>
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

const downloadAsUdfHandler = async (petition: PetitionDetail) => {
  await downloadUdf({
    title: petition.topic || 'Hukuki Dilekçe',
    content: petition.content || '',
    date: new Date(petition.createdAt).toLocaleDateString('tr-TR')
  }, `dilekce-${petition.id}`);
};

export default function PetitionHistoryPage() {
  const [history, setHistory] = useState<PetitionHistoryItem[]>([]);
  const { loading, error, run } = useAsyncOperation<PetitionHistoryItem[]>();

  const [selectedPetition, setSelectedPetition] = useState<PetitionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    run(petitionService.history).then(data => {
      if (data) setHistory(data);
    });
  }, [run]);

  const handleViewDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const detail = await petitionService.getById(id);
      setSelectedPetition(detail);
    } catch {
      // Hata durumunda bildirim gösterilebilir
    } finally {
      setLoadingDetail(false);
    }
  };

  const copyToClipboard = async () => {
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
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-success-500 to-success-700 rounded-2xl flex items-center justify-center shadow-glow">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold gradient-text">Dilekçelerim</h2>
            <p className="text-sm text-neutral-500">Oluşturduğunuz yapay zeka destekli dilekçeler</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="glass-card animate-slide-up">
          <LoadingState message="Dilekçeleriniz yükleniyor..." />
        </div>
      )}

      {error && (
        <div className="glass-card animate-slide-up">
          <ErrorState description="Dilekçe geçmişi alınamadı." />
        </div>
      )}

      {!loading && !error && history.length === 0 && (
        <div className="glass-card text-center py-12 animate-fade-in">
          <div className="w-20 h-20 bg-neutral-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-neutral-400" />
          </div>
          <p className="text-lg font-semibold text-neutral-900 mb-2">
            Henüz dilekçe oluşturmadınız
          </p>
          <p className="text-sm text-neutral-500 max-w-md mx-auto mb-4">
            Arama sonuçlarından otomatik dilekçe oluşturabilirsiniz.
          </p>
          <button
            onClick={() => window.location.href = '/app/search'}
            className="btn-primary"
          >
            <Search className="w-4 h-4 mr-2" />
            Dilekçe Oluştur
          </button>
        </div>
      )}

      {history.length > 0 && (
        <div className="grid gap-4">
          {history.map((item, index) => (
            <div
              key={item.id}
              className="card hover-lift animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-success-100 to-success-200 rounded-xl flex items-center justify-center shadow-soft">
                    <Scale className="w-5 h-5 text-success-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900">{item.topic || 'İsimsiz Dilekçe'}</h3>
                    <p className="text-sm text-neutral-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewDetail(item.id)}
                    className="btn-primary btn-sm"
                  >
                    <Eye className="w-4 h-4 mr-1.5" />
                    Görüntüle
                  </button>
                </div>
              </div>

              <div className="mt-4 p-3 bg-neutral-50 rounded-lg text-sm text-neutral-600 line-clamp-2">
                {item.preview || 'Önizleme yok...'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedPetition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success-50 rounded-xl flex items-center justify-center">
                  <Scale className="w-5 h-5 text-success-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">{selectedPetition.topic}</h3>
                  <p className="text-sm text-neutral-500">
                    {new Date(selectedPetition.createdAt).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })} tarihinde oluşturuldu
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPetition(null)}
                className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-neutral-500" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-neutral-50">
                <div className="bg-white shadow-sm border border-neutral-200 min-h-[800px] p-12">
                  <pre className="whitespace-pre-wrap font-serif text-neutral-800 leading-relaxed">
                    {selectedPetition.content}
                  </pre>
                </div>
              </div>

              <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-neutral-200 bg-white p-6 space-y-4">
                <h4 className="font-semibold text-neutral-900 mb-2">İşlemler</h4>

                <button
                  onClick={copyToClipboard}
                  className="w-full btn-outline justify-start"
                >
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Kopyalandı' : 'Metni Kopyala'}
                </button>

                <div className="h-px bg-neutral-100 my-4" />

                <h4 className="font-semibold text-neutral-900 mb-2">İndir</h4>
                <button
                  onClick={() => downloadAsTxt(selectedPetition)}
                  className="w-full btn-ghost justify-start text-neutral-600"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  TXT Olarak İndir
                </button>
                <button
                  onClick={() => downloadAsDoc(selectedPetition)}
                  className="w-full btn-ghost justify-start text-neutral-600"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Word Olarak İndir
                </button>
                <button
                  onClick={() => downloadAsUdfHandler(selectedPetition)}
                  className="w-full btn-ghost justify-start text-neutral-600"
                >
                  <Scale className="w-4 h-4 mr-2" />
                  UYAP (.udf) İndir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loadingDetail && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[60] backdrop-blur-sm">
          <LoadingState message="Dilekçe detayı yükleniyor..." />
        </div>
      )}
    </div>
  );
}
