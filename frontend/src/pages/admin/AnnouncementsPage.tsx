import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { adminService } from '../../services/adminService';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: string;
  isActive: boolean;
  showOnDashboard: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'info',
    showOnDashboard: true,
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getAllAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Duyurular yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      content: '',
      type: 'info',
      showOnDashboard: true,
      startDate: '',
      endDate: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (announcement: Announcement) => {
    setForm({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      showOnDashboard: announcement.showOnDashboard,
      startDate: announcement.startDate ? announcement.startDate.split('T')[0] : '',
      endDate: announcement.endDate ? announcement.endDate.split('T')[0] : ''
    });
    setEditingId(announcement.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.content) {
      alert('Başlık ve içerik zorunludur');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...form,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null
      };

      if (editingId) {
        await adminService.updateAnnouncement(editingId, payload);
      } else {
        await adminService.createAnnouncement(payload);
      }
      
      resetForm();
      await loadAnnouncements();
    } catch (err) {
      alert('İşlem başarısız oldu');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await adminService.toggleAnnouncement(id);
      await loadAnnouncements();
    } catch (err) {
      alert('Durum değiştirilemedi');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu duyuruyu silmek istediğinizden emin misiniz?')) return;
    
    try {
      await adminService.deleteAnnouncement(id);
      await loadAnnouncements();
    } catch (err) {
      alert('Silme işlemi başarısız oldu');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'success': return 'Başarı';
      case 'warning': return 'Uyarı';
      case 'error': return 'Hata';
      default: return 'Bilgi';
    }
  };

  if (loading) return <LoadingState message="Duyurular yükleniyor..." />;
  if (error) return <ErrorState description={error} onRetry={loadAnnouncements} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Duyuru Yönetimi</h1>
          <p className="text-gray-600 mt-2">Kullanıcılara gösterilecek duyuruları yönetin</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={loadAnnouncements} variant="outline">
            Yenile
          </Button>
          <Button onClick={() => setShowForm(true)}>
            + Yeni Duyuru
          </Button>
        </div>
      </div>

      {/* Duyuru Formu */}
      {showForm && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Duyuru Düzenle' : 'Yeni Duyuru Oluştur'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Başlık</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Duyuru başlığı"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">İçerik</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                rows={4}
                placeholder="Duyuru içeriği"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tip</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="info">Bilgi</option>
                  <option value="success">Başarı</option>
                  <option value="warning">Uyarı</option>
                  <option value="error">Hata</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Başlangıç Tarihi</label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bitiş Tarihi</label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showOnDashboard"
                checked={form.showOnDashboard}
                onChange={(e) => setForm({ ...form, showOnDashboard: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="showOnDashboard" className="text-sm text-gray-700">
                Dashboard'da göster
              </label>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={resetForm}>
                İptal
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? 'Kaydediliyor...' : (editingId ? 'Güncelle' : 'Oluştur')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Duyuru Listesi */}
      <div className="space-y-4">
        {announcements.map((announcement) => (
          <Card key={announcement.id} className={`p-4 border-l-4 ${getTypeColor(announcement.type)}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg">{announcement.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(announcement.type)}`}>
                    {getTypeLabel(announcement.type)}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    announcement.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {announcement.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                  {announcement.showOnDashboard && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Dashboard
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mb-2">{announcement.content}</p>
                <div className="text-xs text-gray-400">
                  Oluşturulma: {new Date(announcement.createdAt).toLocaleString('tr-TR')}
                  {announcement.startDate && ` • Başlangıç: ${new Date(announcement.startDate).toLocaleDateString('tr-TR')}`}
                  {announcement.endDate && ` • Bitiş: ${new Date(announcement.endDate).toLocaleDateString('tr-TR')}`}
                </div>
              </div>
              
              <div className="flex gap-2 ml-4">
                <Button variant="outline" size="sm" onClick={() => handleEdit(announcement)}>
                  Düzenle
                </Button>
                <Button
                  variant={announcement.isActive ? "destructive" : "default"}
                  size="sm"
                  onClick={() => handleToggle(announcement.id)}
                >
                  {announcement.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(announcement.id)}>
                  Sil
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {announcements.length === 0 && (
          <Card className="p-8 text-center text-gray-500">
            Henüz duyuru yok. Yeni bir duyuru oluşturmak için yukarıdaki butonu kullanın.
          </Card>
        )}
      </div>
    </div>
  );
}

