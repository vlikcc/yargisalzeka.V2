import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchFlow } from '../../hooks/useSearch';
import { PetitionGenerator } from '../../components/petition/PetitionGenerator';
import { Search, Loader2, AlertCircle, FileText, Hash, ChevronDown, ChevronUp, Scale, Sparkles, Download, Bookmark, X, BookmarkCheck, Clock, History, Mic, MicOff, Upload } from 'lucide-react';
import { downloadUdf } from '../../utils/udfGenerator';
import { searchService } from '../../services/searchService';
import { aiService, GeminiFileResponse } from '../../services/aiService';

// Web Speech API Types
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: { new(): SpeechRecognition };
    webkitSpeechRecognition: { new(): SpeechRecognition };
  }
}

// HTML etiketlerini temizleme ve highlight yapma
const sanitizeAndHighlight = (text: string) => {
  // <mark> etiketlerini span ile değiştir
  return text
    .replace(/<mark>/g, '<span class="bg-yellow-500/30 text-yellow-200 px-0.5 rounded">')
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

// UYAP UDF formatında indirme - Gerçek UYAP formatına uyumlu
const downloadAsUdf = async (decision: any) => {
  const fullText = (decision.fullText || decision.excerpt || '').replace(/<[^>]*>/g, '');
  const court = decision.court || 'Belirtilmemiş';
  const title = decision.title || 'Belirtilmemiş';
  const date = decision.decisionDate ? new Date(decision.decisionDate).toLocaleDateString('tr-TR') : 'Belirtilmemiş';

  const content = `YARGITAY KARARI

Daire: ${court}
Karar No: ${title}
Karar Tarihi: ${date}

${fullText}`;

  await downloadUdf({
    title: 'YARGITAY KARARI',
    content,
    date: new Date().toLocaleDateString('tr-TR')
  }, `yargitay_karari_${decision.id || 'unknown'}`);
};

export default function SearchPage() {
  const [text, setText] = useState('');
  const [expandedDecision, setExpandedDecision] = useState<number | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<any | null>(null);
  const [savedDecisionIds, setSavedDecisionIds] = useState<Set<number>>(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const [savingDecisionId, setSavingDecisionId] = useState<number | null>(null);
  const { runSearch, result, isSearching, error, loadHistory, history } = useSearchFlow();

  // Dikte state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Dosya yükleme state
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<GeminiFileResponse | null>(null);

  useEffect(() => {
    // Web Speech API init
    if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'tr-TR';

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setText(prev => {
            const newText = prev + (prev && !prev.endsWith(' ') ? ' ' : '') + finalTranscript;
            return newText;
          });
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
      } else {
        alert('Tarayıcınız sesle yazmayı desteklemiyor.');
      }
    }
  };

  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const maxWords = 600;
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
    // Metin boş olabilir eğer dosya varsa
    if ((!text.trim() && !attachedFile) || isOverLimit) return;

    runSearch({
      caseText: text,
      fileUri: attachedFile?.fileUri,
      fileMimeType: attachedFile?.mimeType
    });
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
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 rounded-2xl flex items-center justify-center border border-cyan-500/30">
          <Search className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="heading-3 mb-1">Hukuki Arama</h1>
          <p className="text-small text-slate-400">Olayınızı anlatın, size en uygun kararları bulalım</p>
        </div>
      </div>

      {/* Search Form */}
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Olay Açıklaması
            </label>
            <div className="relative">
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
                className={`textarea ${isOverLimit ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                placeholder="Örneğin: Komşum bahçesine ağaç dikti ve bu ağaç benim evimin ışığını engelliyor. Bu konuda ne yapabilirim?"
              />
              <button
                type="button"
                onClick={toggleListening}
                className={`absolute right-3 bottom-3 p-2 rounded-full transition-all ${isListening
                  ? 'bg-red-500/20 text-red-400 animate-pulse border border-red-500/30'
                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600 hover:text-slate-200 border border-white/5'
                  }`}
                title={isListening ? "Dinlemeyi Durdur" : "Sesle Yaz"}
              >
                {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
            </div>

            {/* File Upload Area */}
            <div className="flex items-center gap-4 mt-3">
              {attachedFile ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 rounded-lg border border-cyan-500/30 animate-fade-in">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-slate-200 font-medium truncate max-w-[200px]" title={attachedFile.name}>
                    {attachedFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="ml-2 p-1 hover:bg-slate-700/50 rounded-full text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors border ${isUploadingFile ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-wait' : 'bg-slate-800 text-slate-300 border-white/10 hover:bg-slate-700 hover:border-slate-600'}`}>
                  <input
                    type="file"
                    accept=".txt,.pdf,.doc,.docx,.xls,.xlsx,image/*"
                    className="hidden"
                    disabled={isUploadingFile}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      // Reset input value to allow re-upload of same file
                      e.target.value = '';
                      setUploadError(null);

                      // .txt dosyaları için direkt FileReader kullan
                      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          const content = e.target?.result as string;
                          if (content) {
                            setText(prev => {
                              const newText = (prev ? prev + '\n\n' : '') + content;
                              return newText.length > 10000 ? newText.substring(0, 10000) : newText;
                            });
                          }
                        };
                        reader.readAsText(file);
                        return;
                      }

                      // Diğer dosyalar için Google File API kullan
                      setIsUploadingFile(true);
                      try {
                        const response = await aiService.uploadFileToGemini(file);
                        setAttachedFile(response);
                      } catch (err: any) {
                        setUploadError(err?.message || 'Dosya yüklenirken hata oluştu');
                      } finally {
                        setIsUploadingFile(false);
                      }
                    }}
                  />
                  {isUploadingFile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {isUploadingFile ? 'Yükleniyor...' : 'Dosya Ekle'}
                </label>
              )}
              {!attachedFile && (
                <p className="text-xs text-slate-500">
                  PDF, resim, Word, Excel ve TXT dosyaları desteklenir
                </p>
              )}
            </div>
            {uploadError && (
              <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {uploadError}
              </div>
            )}

            <div className="flex justify-between mt-2">
              <p className="text-xs text-slate-500">
                Detaylı açıklama daha iyi sonuçlar sağlar
              </p>
              <p className={`text-xs font-medium ${isOverLimit ? 'text-red-400' : wordCount > maxWords * 0.8 ? 'text-amber-400' : 'text-slate-500'
                }`}>
                {wordCount}/{maxWords} kelime
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSearching || (!text.trim() && !attachedFile) || isOverLimit}
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
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-500/30">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
          <p className="text-lg font-semibold text-white mb-2">Yapay Zeka Analiz Ediyor</p>
          <p className="text-sm text-slate-400">Bu işlem birkaç saniye sürebilir...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="card p-6 bg-red-500/5 border border-red-500/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
            <div>
              <p className="font-medium text-red-400">Bir Hata Oluştu</p>
              <p className="text-sm text-slate-300 mt-1">{error}</p>
              <button
                onClick={() => runSearch({ caseText: text })}
                className="mt-3 text-sm font-medium text-red-400 hover:text-red-300 underline"
              >
                Tekrar Dene →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !isSearching && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Analysis Card */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500/20 to-violet-600/20 rounded-xl flex items-center justify-center border border-violet-500/30">
                <Sparkles className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Olay Analizi</h3>
                <p className="text-xs text-slate-400">Yapay zeka tarafından oluşturuldu</p>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-5 mb-5 border border-white/5">
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {result.analysis || 'Analiz sonucu bulunamadı'}
              </p>
            </div>

            {/* Keywords */}
            {result.keywords && result.keywords.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Hash className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-300">Anahtar Kelimeler</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.keywords.map(keyword => (
                    <span
                      key={keyword}
                      className="px-3 py-1 rounded-full bg-slate-800 border border-white/10 text-xs font-medium text-cyan-400"
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
              <div className="flex items-center justify-between px-1">
                <h3 className="font-semibold text-white">En Uygun Kararlar</h3>
                <span className="px-3 py-1 rounded-full bg-slate-800 border border-white/10 text-xs font-medium text-slate-300">
                  {result.decisions.length} karar
                </span>
              </div>

              {result.decisions.map((decision, index) => (
                <div key={decision.id} className="card overflow-hidden group hover:border-cyan-500/30 transition-all duration-300">
                  {/* Header */}
                  <div className="p-5 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center border border-white/5 shrink-0">
                          <Scale className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white text-lg">{decision.title}</h4>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                            {decision.court && <span className="flex items-center gap-1"><Scale className="w-3 h-3" /> {decision.court}</span>}
                            {decision.decisionDate && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(decision.decisionDate).toLocaleDateString('tr-TR')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {decision.score !== undefined && decision.score !== null && (
                        <div className="shrink-0 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-sm font-medium">
                          %{decision.score} Uygunluk
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    {decision.relevanceExplanation && (
                      <p className="text-sm text-slate-400 mb-4 p-4 bg-slate-800/50 rounded-lg border border-white/5">
                        <span className="font-medium text-cyan-400 block mb-1">Neden bu karar uygun?</span>
                        {decision.relevanceExplanation.replace(/<[^>]*>/g, '')}
                      </p>
                    )}

                    <div
                      className="text-sm text-slate-300 leading-relaxed font-serif"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeAndHighlight(
                          expandedDecision === index
                            ? (decision.fullText || decision.excerpt || '')
                            : (decision.excerpt?.substring(0, 300) + '...' || '')
                        )
                      }}
                    />

                    <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-3">
                        {(decision.fullText || decision.excerpt) && (decision.fullText || decision.excerpt).length > 300 && (
                          <button
                            onClick={() => setExpandedDecision(expandedDecision === index ? null : index)}
                            className="flex items-center gap-1.5 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
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
                          className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-white transition-colors ml-2"
                        >
                          <FileText className="w-4 h-4" />
                          Tam Metni Oku
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleSaveToggle(decision)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${savedDecisionIds.has(decision.id)
                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                            : 'bg-slate-800 text-slate-400 border-white/5 hover:bg-slate-700 hover:text-slate-200'
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
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-400 border border-white/5 rounded-lg text-sm font-medium hover:bg-slate-700 hover:text-slate-200 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            İndir
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </button>
                          <div className="absolute right-0 bottom-full mb-1 w-40 glass rounded-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 border border-white/10">
                            <button
                              onClick={() => downloadAsTxt(decision)}
                              className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/10 flex items-center gap-2"
                            >
                              <FileText className="w-4 h-4 text-slate-400" />
                              TXT olarak
                            </button>
                            <button
                              onClick={() => downloadAsDocx(decision)}
                              className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/10 flex items-center gap-2"
                            >
                              <FileText className="w-4 h-4 text-blue-400" />
                              Word (.doc)
                            </button>
                            <button
                              onClick={() => downloadAsUdf(decision)}
                              className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/10 flex items-center gap-2"
                            >
                              <Scale className="w-4 h-4 text-red-400" />
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
            <div className="card p-12 text-center">
              <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/5">
                <FileText className="w-10 h-10 text-slate-600" />
              </div>
              <p className="text-lg font-semibold text-white mb-2">Uygun karar bulunamadı</p>
              <p className="text-sm text-slate-400">Yine de analiz ve anahtar kelimeler üretildi</p>
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
            <div className="w-24 h-24 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5 mx-auto">
              <Search className="w-12 h-12 text-slate-500" />
            </div>
            <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-violet-400 mb-3">
              Yapay Zeka Destekli İçtihat Araması
            </h3>
            <p className="text-slate-400 max-w-lg mx-auto leading-relaxed">
              Doğal dil işleme teknolojisi ile olayınızı anlatın, sistemimiz size en uygun Yargıtay kararlarını ve hukuki analizleri saniyeler içinde sunsun.
            </p>
          </div>

          {/* Search History */}
          {history && history.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center border border-white/5">
                    <History className="w-4 h-4 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-white">Son Aramalarınız</h3>
                </div>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                >
                  {showHistory ? 'Gizle' : `Tümünü Gör (${history.length})`}
                </button>
              </div>

              <div className="space-y-3">
                {(showHistory ? history : history.slice(0, 5)).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-white/5 hover:border-cyan-500/30 transition-all group"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {(item.keywords || []).slice(0, 5).map((keyword, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded-full border border-white/5"
                          >
                            {keyword}
                          </span>
                        ))}
                        {(item.keywords?.length || 0) > 5 && (
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-500 text-xs rounded-full border border-white/5">
                            +{(item.keywords?.length || 0) - 5}
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
                      onClick={() => setText((item.keywords || []).join(', '))}
                      className="ml-4 px-4 py-2 text-sm font-medium text-cyan-400 bg-cyan-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-cyan-500/20"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="glass rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-white/10">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-start justify-between bg-slate-900/50">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedDecision.title}</h3>
                <div className="flex items-center gap-3 mt-2 text-sm text-slate-400">
                  {selectedDecision.court && <span className="flex items-center gap-1"><Scale className="w-4 h-4" /> {selectedDecision.court}</span>}
                  {selectedDecision.decisionDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(selectedDecision.decisionDate).toLocaleDateString('tr-TR')}
                    </span>
                  )}
                  {selectedDecision.score !== undefined && (
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium">
                      %{selectedDecision.score} Uygunluk
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedDecision(null)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
              {selectedDecision.relevanceExplanation && (
                <div className="mb-6 p-5 bg-gradient-to-br from-cyan-900/20 to-violet-900/20 rounded-xl border border-cyan-500/20">
                  <p className="text-sm font-semibold text-cyan-400 mb-2">Analiz Özeti</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{selectedDecision.relevanceExplanation.replace(/<[^>]*>/g, '')}</p>
                </div>
              )}

              <div className="prose prose-invert prose-sm max-w-none">
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 border-b border-white/5 pb-2">Karar Metni</h4>
                <div
                  className="text-base text-slate-300 leading-relaxed whitespace-pre-wrap font-serif"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeAndHighlight(selectedDecision.fullText || selectedDecision.excerpt || 'Metin bulunamadı')
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-end gap-3 bg-slate-900/50">
              <button
                onClick={() => handleSaveToggle(selectedDecision)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors border ${savedDecisionIds.has(selectedDecision.id)
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                  : 'bg-slate-800 text-slate-300 border-white/5 hover:bg-slate-700'
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
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-slate-300 border border-white/5 rounded-xl font-medium hover:bg-slate-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  İndir
                  <ChevronUp className="w-4 h-4 ml-1" />
                </button>
                <div className="absolute right-0 bottom-full mb-2 w-48 glass rounded-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 border border-white/10 shadow-xl">
                  <button
                    onClick={() => downloadAsTxt(selectedDecision)}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-white/10 flex items-center gap-3 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-slate-400" />
                    TXT olarak indir
                  </button>
                  <button
                    onClick={() => downloadAsDocx(selectedDecision)}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-white/10 flex items-center gap-3 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-blue-400" />
                    Word (.doc) indir
                  </button>
                  <button
                    onClick={() => downloadAsUdf(selectedDecision)}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-white/10 flex items-center gap-3 transition-colors"
                  >
                    <Scale className="w-4 h-4 text-red-400" />
                    UYAP (.udf) indir
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
