import { useState } from 'react';
import { petitionService } from '../../services/petitionService';
import { Button } from '../ui/button';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';
import { SearchResponse } from '../../services/searchService';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { FileText, AlertCircle } from 'lucide-react';

interface Props { currentSearch?: SearchResponse | null }

export function PetitionGenerator({ currentSearch }: Props) {
  const [additional, setAdditional] = useState('');
  const { data, loading, error, run } = useAsyncOperation<{ downloadUrl: string }>();
  const { remaining } = useSubscription();

  // Dilekçe oluşturma koşulları:
  // 1. Arama sonuçları mevcut olmalı
  // 2. Dilekçe hakkı olmalı (0 değilse)
  // 3. Analiz tamamlanmış olmalı
  const hasAnalysis = currentSearch?.analysis?.summary || currentSearch?.analysis?.caseType;
  const canGenerate = !!currentSearch && hasAnalysis && (remaining?.petition ?? 0) !== 0; // -1 sınırsız

  const submit = () => {
    if (!currentSearch) return;
    void run(() => petitionService.generate({ caseData: currentSearch, additionalRequests: additional })).catch(()=>{});
  };

  return (
    <div className="glass-card space-y-4">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center shadow-soft">
          <FileText className="w-5 h-5 text-green-700" />
        </div>
        <div>
          <h3 className="font-semibold text-neutral-900">Dilekçe Oluştur</h3>
          <p className="text-sm text-neutral-600">Analiz sonucuna göre dilekçe taslağı üretin</p>
        </div>
      </div>
      
      {hasAnalysis ? (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">Dilekçe Konusu</label>
            <textarea
              className="w-full p-3 bg-white/50 backdrop-blur-sm border border-neutral-200/50 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500/50 focus:bg-white transition-all duration-200 resize-none"
              rows={3}
              placeholder="Örn: Mirasçılık hakkının korunması talebi..."
              value={additional}
              onChange={e => setAdditional(e.target.value)}
            />
            <p className="text-xs text-neutral-500">Dilekçe konusunu belirtin (opsiyonel)</p>
          </div>
          
          <Button 
            type="button" 
            disabled={!canGenerate || loading} 
            onClick={submit} 
            className="btn-primary w-full font-semibold"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Oluşturuluyor...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Dilekçe Oluştur
              </>
            )}
          </Button>
        </>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Analiz Bekleniyor</p>
            <p className="text-sm text-amber-700">Dilekçe oluşturabilmek için önce olay analizinin tamamlanması gerekiyor.</p>
          </div>
        </div>
      )}
      
      {!canGenerate && hasAnalysis && remaining?.petition === 0 && (
        <div className="bg-error-50 border border-error-200 rounded-xl p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-error-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-error-800">Dilekçe Hakkınız Yok</p>
            <p className="text-sm text-error-700">Abonelik planınızda dilekçe hakkınız kalmadı.</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-error-50 border border-error-200 rounded-xl p-4">
          <p className="text-sm text-error-700">{error}</p>
        </div>
      )}
      
      {data?.downloadUrl && (
        <div className="bg-success-50 border border-success-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm font-medium text-success-800">Dilekçe hazır!</p>
          <a 
            className="text-sm font-medium text-primary-600 hover:text-primary-700 underline" 
            href={data.downloadUrl} 
            target="_blank" 
            rel="noreferrer"
          >
            Dilekçeyi İndir
          </a>
        </div>
      )}
    </div>
  );
}
