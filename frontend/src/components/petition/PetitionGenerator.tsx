import { useState } from 'react';
import { petitionService } from '../../services/petitionService';
import { Button } from '../ui/button';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';
import { SearchResponse } from '../../services/searchService';
import { useSubscription } from '../../contexts/SubscriptionContext';

interface Props { currentSearch?: SearchResponse | null }

export function PetitionGenerator({ currentSearch }: Props) {
  const [additional, setAdditional] = useState('');
  const { data, loading, error, run } = useAsyncOperation<{ downloadUrl: string }>();
  const { remaining } = useSubscription();

  const canGenerate = !!currentSearch && (remaining?.petition ?? 0) !== 0; // -1 sınırsız

  const submit = () => {
    if (!currentSearch) return;
    void run(() => petitionService.generate({ caseData: currentSearch, additionalRequests: additional })).catch(()=>{});
  };

  return (
    <div className="rounded border p-4 bg-white space-y-3">
      <h3 className="font-medium">Dilekçe Oluştur</h3>
      <p className="text-xs text-gray-500">Analiz sonucuna göre dilekçe taslağı üretin.</p>
      <textarea
        className="w-full border rounded p-2 text-sm focus:outline-none focus:ring"
        rows={3}
        placeholder="Ek talepler (opsiyonel)"
        value={additional}
        onChange={e => setAdditional(e.target.value)}
      />
      <Button type="button" disabled={!canGenerate || loading} onClick={submit} className="font-medium">
        {loading ? 'Oluşturuluyor...' : 'Dilekçe Oluştur'}
      </Button>
      {!canGenerate && <div className="text-xs text-red-500">Dilekçe hakkınız bulunmuyor.</div>}
      {error && <div className="text-xs text-red-600">{error}</div>}
      {data?.downloadUrl && (
        <a className="text-sm text-blue-600 underline" href={data.downloadUrl} target="_blank" rel="noreferrer">Dilekçeyi indir</a>
      )}
    </div>
  );
}
