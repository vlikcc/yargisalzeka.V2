import { useState } from 'react';
import { petitionService, PetitionResponse } from '../../services/petitionService';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { FileText, AlertCircle, Copy, Download, Check, Loader2, ChevronDown, Scale } from 'lucide-react';
import { downloadUdf } from '../../utils/udfGenerator';

export interface CompositeSearchResponse {
  analysis: string;
  keywords: string[];
  decisions: Array<{
    id: number;
    title: string;
    excerpt: string;
    decisionDate?: string | null;
    court: string;
    score?: number | null;
    relevanceExplanation?: string | null;
    relevanceSimilarity?: string | null;
  }>;
}

interface Props {
  currentSearch?: CompositeSearchResponse | null;
  originalCaseText?: string;
}

export function PetitionGenerator({ currentSearch, originalCaseText }: Props) {
  const [topic, setTopic] = useState('');
  const [copied, setCopied] = useState(false);
  const { data, loading, error, run } = useAsyncOperation<PetitionResponse>();
  const { remaining, refresh: refreshSubscription } = useSubscription();

  const hasAnalysis = typeof currentSearch?.analysis === 'string' && currentSearch.analysis.length > 0;
  const canGenerate = !!currentSearch && hasAnalysis && (remaining?.petition ?? 0) !== 0;

  const handleSubmit = async () => {
    if (!currentSearch || !originalCaseText) return;
    try {
      await run(() => petitionService.generateFromSearch({
        searchResult: currentSearch,
        topic: topic || 'Hukuki Dilekçe Talebi',
        originalCaseText: originalCaseText
      }));
      refreshSubscription();
    } catch {
      // Error handled by useAsyncOperation
    }
  };

  const copyToClipboard = async () => {
    if (!data?.content) return;
    try {
      await navigator.clipboard.writeText(data.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard failed
    }
  };

  const downloadAsTxt = () => {
    if (!data?.content) return;
    const blob = new Blob([data.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dilekce-${data.id || 'taslak'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsDoc = () => {
    if (!data?.content) return;

    // Word-compatible HTML oluştur
    const htmlContent = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>Dilekçe - ${data.topic || 'Hukuki Dilekçe'}</title>
<style>
  body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; margin: 2cm; }
  h1 { font-size: 14pt; text-align: center; font-weight: bold; margin-bottom: 24pt; text-transform: uppercase; }
  .content { white-space: pre-wrap; text-align: justify; }
  .footer { margin-top: 30pt; font-size: 10pt; color: #666; text-align: center; border-top: 1px solid #ccc; padding-top: 10pt; }
</style>
</head>
<body>
  <h1>${data.topic || 'DİLEKÇE'}</h1>
  <div class="content">${data.content.replace(/\n/g, '<br>')}</div>
  <div class="footer">
    Oluşturma Tarihi: ${new Date(data.createdAt).toLocaleDateString('tr-TR')}<br>
    Kaynak: Yargısal Zeka - yargisalzeka.com
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dilekce-${data.id || 'taslak'}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsUdfHandler = async () => {
    if (!data?.content) return;

    await downloadUdf({
      title: data.topic || 'Hukuki Dilekçe',
      content: data.content,
      date: new Date(data.createdAt).toLocaleDateString('tr-TR')
    }, `dilekce-${data.id || 'taslak'}`);
  };

  // Form: Dilekçe henüz oluşturulmamışsa
  if (!data?.content) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
            <FileText className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Dilekçe Oluştur</h3>
            <p className="text-xs text-slate-400">Analiz sonuçlarına göre dilekçe taslağı</p>
          </div>
        </div>

        {hasAnalysis ? (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Dilekçe Konusu (Opsiyonel)
              </label>
              <input
                type="text"
                className="input"
                placeholder="Örn: Tazminat talebi, İtiraz dilekçesi..."
                value={topic}
                onChange={e => setTopic(e.target.value)}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canGenerate || loading}
              className="btn-primary w-full justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Dilekçe Oluştur
                </>
              )}
            </button>

            {remaining?.petition === 0 && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                <p className="text-sm text-red-300">Dilekçe hakkınız kalmadı</p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-start gap-2 p-3 bg-slate-800/50 border border-white/5 rounded-lg text-slate-400">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <p className="text-sm">
              Dilekçe oluşturmak için önce arama yapın
            </p>
          </div>
        )}
      </div>
    );
  }

  // Dilekçe oluşturulmuş
  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
            <Check className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Dilekçe Hazır</h3>
            <p className="text-xs text-slate-400">{data.topic}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            className="btn-ghost btn-sm text-slate-300 hover:text-white"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-1.5 text-emerald-400" />
                Kopyalandı
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1.5" />
                Kopyala
              </>
            )}
          </button>
          <div className="relative group">
            <button className="btn-ghost btn-sm text-slate-300 hover:text-white">
              <Download className="w-4 h-4 mr-1.5" />
              İndir
              <ChevronDown className="w-3 h-3 ml-1" />
            </button>
            <div className="absolute right-0 mt-1 w-40 glass rounded-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 border border-white/10">
              <button
                onClick={downloadAsTxt}
                className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/10 flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-slate-400" />
                TXT olarak
              </button>
              <button
                onClick={downloadAsDoc}
                className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/10 flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-blue-400" />
                Word (.doc)
              </button>
              <button
                onClick={downloadAsUdfHandler}
                className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/10 flex items-center gap-2"
              >
                <Scale className="w-4 h-4 text-red-400" />
                UYAP (.udf)
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/30 rounded-lg border border-white/5 overflow-hidden">
        <div className="bg-slate-800/50 px-4 py-2 border-b border-white/5 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">DİLEKÇE TASLAĞI</span>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto custom-scrollbar">
          <pre className="whitespace-pre-wrap text-sm text-slate-300 font-serif leading-relaxed">
            {data.content}
          </pre>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-xs text-cyan-400">
        <AlertCircle className="w-4 h-4 mt-0.5" />
        <p>Bu dilekçe otomatik olarak kaydedilmiştir. Daha sonra "Dilekçelerim" sayfasından erişebilirsiniz.</p>
      </div>
    </div>
  );
}
