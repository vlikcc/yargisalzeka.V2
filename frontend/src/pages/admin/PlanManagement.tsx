import { useEffect, useState } from 'react';
import { subscriptionAdminService } from '../../services/subscriptionAdminService';
import type { PlanInput, AdminPlan } from '../../services/subscriptionAdminService';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';

export default function PlanManagement() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<number, Partial<PlanInput>>>({});
  const [form, setForm] = useState<PlanInput>({
    name: '', price: 0, validityDays: null,
    keywordExtractionLimit: -1, caseAnalysisLimit: 0, searchLimit: 0, petitionLimit: 0,
    isActive: true
  });

  const load = async () => {
    try {
      setLoading(true); setError(null);
      const res = await subscriptionAdminService.getAll();
      setPlans(res);
    } catch (e: any) { setError(e.message || 'Planlar yüklenemedi'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try { await subscriptionAdminService.create(form); setForm({ ...form, name: '', price: 0 }); await load(); }
    catch (e: any) { alert(e.message || 'Plan oluşturulamadı'); }
  };
  const handleUpdate = async (id: number, data: Partial<PlanInput>) => {
    const plan = plans.find(p => p.id === id); if (!plan) return;
    const updated: PlanInput = { ...plan, ...data } as any;
    try { await subscriptionAdminService.update(id, updated); await load(); }
    catch (e: any) { alert(e.message || 'Plan güncellenemedi'); }
  };
  const handleToggle = async (id: number) => { try { await subscriptionAdminService.toggle(id); await load(); } catch (e: any) { alert(e.message || 'Durum değiştirilemedi'); } };
  const handleDelete = async (id: number) => { if (!confirm('Silmek istediğinize emin misiniz?')) return; try { await subscriptionAdminService.remove(id); await load(); } catch (e: any) { alert(e.message || 'Plan silinemedi'); } };
  const setEdit = (id: number, patch: Partial<PlanInput>) => setEditing(prev => ({ ...prev, [id]: { ...(prev[id]||{}), ...patch } }));
  const saveEdit = async (id: number) => {
    const patch = editing[id] || {};
    await handleUpdate(id, patch);
    setEditing(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  if (loading) return <LoadingState message="Planlar yükleniyor..."/>;
  if (error) return <ErrorState description={error} onRetry={load}/>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Abonelik Paketleri</h1>
        <Button variant="outline" onClick={load}>Yenile</Button>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Yeni Plan Oluştur</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <input className="border p-2 rounded" placeholder="Ad" value={form.name} onChange={e=>setForm((f: PlanInput)=>({...f,name:e.target.value}))}/>
          <input className="border p-2 rounded" placeholder="Fiyat" type="number" value={form.price} onChange={e=>setForm((f: PlanInput)=>({...f,price:parseFloat(e.target.value)}))}/>
          <input className="border p-2 rounded" placeholder="Geçerlilik (gün) boş= sınırsız" value={form.validityDays ?? ''} onChange={e=>setForm((f: PlanInput)=>({...f,validityDays:e.target.value===''?null:parseInt(e.target.value)}))}/>
          <select className="border p-2 rounded" value={form.isActive? '1':'0'} onChange={e=>setForm((f: PlanInput)=>({...f,isActive:e.target.value==='1'}))}>
            <option value="1">Aktif</option>
            <option value="0">Pasif</option>
          </select>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <input className="border p-2 rounded" placeholder="Anahtar Kelime Limit" type="number" value={form.keywordExtractionLimit} onChange={e=>setForm((f: PlanInput)=>({...f,keywordExtractionLimit:parseInt(e.target.value)}))}/>
          <input className="border p-2 rounded" placeholder="Analiz Limit" type="number" value={form.caseAnalysisLimit} onChange={e=>setForm((f: PlanInput)=>({...f,caseAnalysisLimit:parseInt(e.target.value)}))}/>
          <input className="border p-2 rounded" placeholder="Arama Limit" type="number" value={form.searchLimit} onChange={e=>setForm((f: PlanInput)=>({...f,searchLimit:parseInt(e.target.value)}))}/>
          <input className="border p-2 rounded" placeholder="Dilekçe Limit" type="number" value={form.petitionLimit} onChange={e=>setForm((f: PlanInput)=>({...f,petitionLimit:parseInt(e.target.value)}))}/>
        </div>
        <Button onClick={handleCreate}>Plan Oluştur</Button>
      </Card>

      <div className="grid gap-3">
        {plans.map(p => {
          const e = editing[p.id] || {};
          const current: PlanInput = { name: p.name, price: p.price, validityDays: p.validityDays ?? null, keywordExtractionLimit: p.keywordExtractionLimit, caseAnalysisLimit: p.caseAnalysisLimit, searchLimit: p.searchLimit, petitionLimit: p.petitionLimit, isActive: p.isActive };
          const view = { ...current, ...e } as PlanInput;
          return (
          <Card key={p.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-lg font-semibold flex items-center gap-2">
                  <input className="border p-1 rounded font-semibold" value={view.name}
                    onChange={e2=>setEdit(p.id,{ name: e2.target.value })}/>
                  <span className={`text-xs px-2 py-1 rounded-full ${view.isActive? 'bg-green-100 text-green-800':'bg-gray-100 text-gray-600'}`}>{view.isActive? 'Aktif':'Pasif'}</span>
                </div>
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  ₺<input className="border p-1 w-24 rounded" type="number" value={view.price}
                    onChange={e2=>setEdit(p.id,{ price: parseFloat(e2.target.value||'0') })}/>
                  ·
                  <input className="border p-1 w-24 rounded" placeholder="Gün (boş=süresiz)" value={view.validityDays ?? ''}
                    onChange={e2=>setEdit(p.id,{ validityDays: e2.target.value===''? null : parseInt(e2.target.value) })}/>
                </div>
                <div className="text-xs text-gray-500 flex flex-wrap gap-2 items-center">
                  <span>Limitler:</span>
                  <label className="flex items-center gap-1">KE <input className="border p-1 w-20 rounded" type="number" value={view.keywordExtractionLimit} onChange={e2=>setEdit(p.id,{ keywordExtractionLimit: parseInt(e2.target.value||'0') })}/></label>
                  <label className="flex items-center gap-1">Analiz <input className="border p-1 w-20 rounded" type="number" value={view.caseAnalysisLimit} onChange={e2=>setEdit(p.id,{ caseAnalysisLimit: parseInt(e2.target.value||'0') })}/></label>
                  <label className="flex items-center gap-1">Arama <input className="border p-1 w-20 rounded" type="number" value={view.searchLimit} onChange={e2=>setEdit(p.id,{ searchLimit: parseInt(e2.target.value||'0') })}/></label>
                  <label className="flex items-center gap-1">Dilekçe <input className="border p-1 w-20 rounded" type="number" value={view.petitionLimit} onChange={e2=>setEdit(p.id,{ petitionLimit: parseInt(e2.target.value||'0') })}/></label>
                  <label className="flex items-center gap-1">Durum
                    <select className="border p-1 rounded" value={view.isActive? '1':'0'} onChange={e2=>setEdit(p.id,{ isActive: e2.target.value==='1' })}>
                      <option value="1">Aktif</option>
                      <option value="0">Pasif</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="default" onClick={()=>saveEdit(p.id)}>Kaydet</Button>
                <Button variant="outline" onClick={()=>handleToggle(p.id)}>{view.isActive? 'Pasifleştir':'Aktifleştir'}</Button>
                <Button variant="destructive" onClick={()=>handleDelete(p.id)}>Sil</Button>
              </div>
            </div>
          </Card>
        )})}
      </div>
    </div>
  );
}
