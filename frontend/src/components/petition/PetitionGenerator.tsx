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
          <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-success-700" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Dilekçe Oluştur</h3>
            <p className="text-xs text-slate-500">Analiz sonuçlarına göre dilekçe taslağı</p>
          </div>
        </div>

        {hasAnalysis ? (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
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
              <div className="flex items-start gap-2 p-3 bg-warning-50 border border-warning-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-warning-600 mt-0.5" />
                <p className="text-sm text-warning-700">Dilekçe hakkınız kalmadı</p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 bg-error-50 border border-error-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-error-600 mt-0.5" />
                <p className="text-sm text-error-700">{error}</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-slate-500 mt-0.5" />
            <p className="text-sm text-slate-600">
              Dilekçe oluşturmak için önce arama yapın
            </p>
          </div>
        )}
      </div>
    );
  }

  // Dilekçe oluşturulmuş
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
            <Check className="w-5 h-5 text-success-700" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Dilekçe Hazır</h3>
            <p className="text-xs text-slate-500">{data.topic}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            className="btn-ghost btn-sm"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-1 text-success-600" />
                Kopyalandı
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1" />
                Kopyala
              </>
            )}
          </button>
          <div className="relative group">
            <button className="btn-ghost btn-sm">
              <Download className="w-4 h-4 mr-1" />
              İndir
              <ChevronDown className="w-3 h-3 ml-1" />
            </button>
            <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={downloadAsTxt}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                TXT olarak
              </button>
              <button
                onClick={downloadAsDoc}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Word (.doc)
              </button>
              <button
                onClick={downloadAsUdfHandler}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Scale className="w-4 h-4" />
                UYAP (.udf)
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
          <span className="text-xs font-medium text-slate-600">DİLEKÇE TASLAĞI</span>
        </div>
        <div className="p-4 max-h-80 overflow-y-auto custom-scrollbar">
          <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">
            {data.content}
          </pre>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
        <AlertCircle className="w-4 h-4 mt-0.5" />
        <p>Bu dilekçe otomatik olarak kaydedilmiştir. Daha sonra "Dilekçelerim" sayfasından erişebilirsiniz.</p>
      </div>
    </div>
  );
}
