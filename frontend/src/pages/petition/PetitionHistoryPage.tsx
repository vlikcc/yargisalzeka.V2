import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { petitionService, PetitionHistoryItem, PetitionDetail } from '../../services/petitionService';
import { FileText, Calendar, Download, Eye, Scale, Search, X, Copy, Check, Edit, Loader2 } from 'lucide-react';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';
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
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Dilekçe - ${petition.topic}</title>
<style>
  body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; margin: 2cm; }
  h1 { font-size: 14pt; text-align: center; font-weight: bold; text-transform: uppercase; }
  .content { white-space: pre-wrap; text-align: justify; }
</style>
</head>
<body>
  <h1>${petition.topic}</h1>
  <div class="content">${content.replace(/\n/g, '<br>')}</div>
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
  const navigate = useNavigate();
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
      // Hata durumunda
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
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
          <FileText className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h2 className="heading-3">Dilekçelerim</h2>
          <p className="text-small">Oluşturduğunuz yapay zeka destekli dilekçeler</p>
        </div>
      </div>

      {loading && (
        <div className="card p-8 text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Dilekçeleriniz yükleniyor...</p>
        </div>
      )}

      {error && (
        <div className="card p-6 border-red-500/20 bg-red-500/5">
          <p className="text-red-400 text-center">Dilekçe geçmişi alınamadı.</p>
        </div>
      )}

      {!loading && !error && history.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 bg-slate-700/50 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-slate-500" />
          </div>
          <p className="text-lg font-semibold text-white mb-2">
            Henüz dilekçe oluşturmadınız
          </p>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-4">
            Arama sonuçlarından otomatik dilekçe oluşturabilirsiniz.
          </p>
          <a href="/app/search" className="btn-primary inline-flex items-center">
            <Search className="w-4 h-4 mr-2" />
            Dilekçe Oluştur
          </a>
        </div>
      )}

      {history.length > 0 && (
        <div className="grid gap-4">
          {history.map((item) => (
            <div
              key={item.id}
              className="card p-5 hover:border-emerald-500/30 transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                    <Scale className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{item.topic || 'İsimsiz Dilekçe'}</h3>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
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

                <button
                  onClick={() => handleViewDetail(item.id)}
                  className="btn-primary btn-sm"
                >
                  <Eye className="w-4 h-4 mr-1.5" />
                  Görüntüle
                </button>
              </div>

              <div className="mt-4 p-3 bg-slate-800/50 rounded-lg text-sm text-slate-400 line-clamp-2">
                {item.preview || 'Önizleme yok...'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedPetition && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="glass rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                  <Scale className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedPetition.topic}</h3>
                  <p className="text-sm text-slate-400">
                    {new Date(selectedPetition.createdAt).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} tarihinde oluşturuldu
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPetition(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-slate-900/50">
                <div className="card min-h-[400px] p-8">
                  <pre className="whitespace-pre-wrap font-serif text-slate-200 leading-relaxed">
                    {selectedPetition.content}
                  </pre>
                </div>
              </div>

              <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-white/10 p-6 space-y-4">
                <h4 className="font-semibold text-white mb-2">İşlemler</h4>

                <button
                  onClick={copyToClipboard}
                  className="w-full btn-secondary justify-start"
                >
                  {copied ? <Check className="w-4 h-4 mr-2 text-emerald-400" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Kopyalandı' : 'Metni Kopyala'}
                </button>

                <button
                  onClick={() => {
                    setSelectedPetition(null);
                    navigate(`/app/editor/${selectedPetition.id}`);
                  }}
                  className="w-full btn-primary justify-start"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editörde Düzenle
                </button>

                <div className="h-px bg-white/10 my-4" />

                <h4 className="font-semibold text-white mb-2">İndir</h4>
                <button
                  onClick={() => downloadAsTxt(selectedPetition)}
                  className="w-full btn-ghost justify-start text-slate-300"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  TXT Olarak İndir
                </button>
                <button
                  onClick={() => downloadAsDoc(selectedPetition)}
                  className="w-full btn-ghost justify-start text-slate-300"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Word Olarak İndir
                </button>
                <button
                  onClick={() => downloadAsUdfHandler(selectedPetition)}
                  className="w-full btn-ghost justify-start text-slate-300"
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-300">Dilekçe detayı yükleniyor...</p>
          </div>
        </div>
      )}
    </div>
  );
}
