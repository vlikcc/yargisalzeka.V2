import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { UsageStats } from '../../services/subscriptionService';
import { Skeleton } from '../ui/skeleton';

interface UsageChartProps {
  usage?: UsageStats | null;
  loading?: boolean;
}

export function UsageChart({ usage, loading }: UsageChartProps) {
  if (loading) {
    return (
      <div className="h-64 rounded border bg-white p-4">
        <div className="mb-3 h-5 w-40"><Skeleton className="h-5 w-40" /></div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const data = usage
    ? [
        { name: 'Aramalar', value: usage.searches },
        { name: 'Analiz', value: usage.caseAnalyses },
        { name: 'Dilekçe', value: usage.petitions },
        { name: 'Anahtar', value: usage.keywordExtractions }
      ]
    : [];

  return (
    <div className="h-64 rounded border bg-white p-4 flex flex-col">
      <h3 className="font-medium mb-2">Kullanım Dağılımı</h3>
      {data.length === 0 ? (
        <div className="text-sm text-gray-500 flex-1 flex items-center justify-center">Veri yok</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip formatter={(v: number) => v} />
            <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
