import { useSubscription } from '../../contexts/SubscriptionContext';
import { Button } from '../../components/ui/button';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';

export default function SubscriptionPage() {
  const { plan, usage, loading, refresh } = useSubscription();
  const error = null; // ileride gerçek hata state eklenecek
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Abonelik</h2>
  {loading && <LoadingState />}
  {error && <ErrorState description="Abonelik verileri yüklenemedi" onRetry={refresh} />}
      {plan && (
        <div className="p-4 border rounded bg-white">
          <div className="font-medium">Plan: {plan.name}</div>
          <div className="text-sm text-gray-500">Fiyat: {plan.price}</div>
        </div>
      )}
      {usage && (
        <div className="p-4 border rounded bg-white space-y-1 text-sm">
          <div>Aramalar: {usage.searches}</div>
          <div>Analizler: {usage.caseAnalyses}</div>
          <div>Dilekçeler: {usage.petitions}</div>
          <div>Anahtar Kelime: {usage.keywordExtractions}</div>
        </div>
      )}
  <Button onClick={() => refresh()} size="sm" className="font-medium">Yenile</Button>
    </div>
  );
}
