import { useEffect, useState, useCallback } from 'react';
import { searchService, SavedDecisionItem } from '../../services/searchService';
import { Scale, Calendar, Trash2, RefreshCw, Download, FileText, ChevronDown, Bookmark, Loader2 } from 'lucide-react';
import { downloadUdf } from '../../utils/udfGenerator';

// İndirme fonksiyonları
const downloadAsTxt = (decision: any) => {
  const fullText = decision.fullText || decision.excerpt || decision.kararMetni || '';
  const content = `YARGITAY KARARI
════════════════════════════════════════════════════════════

KARAR BİLGİLERİ
────────────────────────────────────────────────────────────
Daire: ${decision.court || decision.yargitayDairesi || 'Belirtilmemiş'}
Karar No: ${decision.title || `${decision.esasNo}/${decision.kararNo}` || `Karar #${decision.decisionId}` || 'Belirtilmemiş'}
Karar Tarihi: ${decision.decisionDate || decision.kararTarihi ? new Date(decision.decisionDate || decision.kararTarihi).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}

KARAR METNİ
────────────────────────────────────────────────────────────
${fullText || '(Karar metni kaydedilen veride bulunamadı)'}

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
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Yargıtay Kararı</title>
<style>
  body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; margin: 2cm; }
  h1 { font-size: 16pt; text-align: center; font-weight: bold; }
  h2 { font-size: 14pt; font-weight: bold; border-bottom: 1px solid #000; }
  .content { white-space: pre-wrap; text-align: justify; }
</style>
</head>
<body>
  <h1>YARGITAY KARARI</h1>
  <h2>KARAR BİLGİLERİ</h2>
  <p><strong>Daire:</strong> ${decision.court || decision.yargitayDairesi || 'Belirtilmemiş'}</p>
  <p><strong>Karar No:</strong> ${decision.title || `Karar #${decision.decisionId}` || 'Belirtilmemiş'}</p>
  <h2>KARAR METNİ</h2>
  <div class="content">${fullText || '(Karar metni bulunamadı)'}</div>
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

const downloadAsUdfHandler = async (decision: any) => {
  const court = decision.court || decision.yargitayDairesi || 'Belirtilmemiş';
  const title = decision.title || `Karar #${decision.decisionId}` || 'Belirtilmemiş';
  const date = decision.decisionDate || decision.kararTarihi ? new Date(decision.decisionDate || decision.kararTarihi).toLocaleDateString('tr-TR') : 'Belirtilmemiş';
  const fullText = (decision.fullText || decision.excerpt || decision.kararMetni || '').replace(/<[^>]*>/g, '');

  const content = `YARGITAY KARARI\n\nDaire: ${court}\nKarar No: ${title}\nKarar Tarihi: ${date}\n\n${fullText}`;

  await downloadUdf({
    title: 'YARGITAY KARARI',
    content,
    date: new Date().toLocaleDateString('tr-TR')
  }, `yargitay_karari_${decision.id || decision.decisionId}`);
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 rounded-2xl flex items-center justify-center border border-cyan-500/30">
            <Bookmark className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="heading-3">Kaydedilen Kararlar</h2>
            <p className="text-small">Kaydettiğiniz Yargıtay kararları</p>
          </div>
        </div>
        <button
          onClick={loadSavedDecisions}
          className="btn-secondary"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Yükleniyor
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Yenile
            </>
          )}
        </button>
      </div>

      {/* Loading State */}
      {loading && data.length === 0 && (
        <div className="card p-8 text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Kaydedilen kararlar yükleniyor...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="card p-6 border-red-500/20 bg-red-500/5">
          <p className="text-red-400 text-center mb-4">{error}</p>
          <button onClick={loadSavedDecisions} className="btn-secondary mx-auto block">
            Tekrar Dene
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && data.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 bg-slate-700/50 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Bookmark className="w-10 h-10 text-slate-500" />
          </div>
          <p className="text-lg font-semibold text-white mb-2">
            Henüz karar kaydetmediniz
          </p>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-4">
            Arama sonuçlarında beğendiğiniz kararları kaydedin, buradan erişebilirsiniz.
          </p>
          <a href="/app/search" className="btn-primary inline-flex items-center">
            <Scale className="w-4 h-4 mr-2" />
            Karar Ara
          </a>
        </div>
      )}

      {/* Saved Decisions List */}
      {data.length > 0 && (
        <div className="grid gap-4">
          {data.map((item) => (
            <div
              key={item.decisionId}
              className="card p-5 hover:border-cyan-500/30 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20">
                    <Scale className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">
                      Karar #{item.decisionId}
                    </h3>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
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

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                <div className="flex items-center gap-2">
                  {/* İndirme dropdown */}
                  <div className="relative group">
                    <button className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors">
                      <Download className="w-3 h-3" />
                      İndir
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </button>
                    <div className="absolute left-0 mt-1 w-40 glass rounded-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      <button
                        onClick={() => downloadAsTxt({ decisionId: item.decisionId })}
                        className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5 flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        TXT olarak
                      </button>
                      <button
                        onClick={() => downloadAsDoc({ decisionId: item.decisionId })}
                        className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5 flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Word (.doc)
                      </button>
                      <button
                        onClick={() => downloadAsUdfHandler({ decisionId: item.decisionId })}
                        className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5 flex items-center gap-2"
                      >
                        <Scale className="w-4 h-4" />
                        UYAP (.udf)
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  onClick={() => handleRemove(item.decisionId)}
                  disabled={removingId === item.decisionId}
                >
                  {removingId === item.decisionId ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                  Kaldır
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
