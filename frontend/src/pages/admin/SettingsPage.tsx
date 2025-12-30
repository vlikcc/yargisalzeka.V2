import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { LoadingState } from '../../components/common/LoadingState';

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  defaultSearchLimit: number;
  maxSearchResults: number;
  aiModel: string;
  aiTimeout: number;
  trialDays: number;
  emailNotifications: boolean;
  supportEmail: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    siteName: 'Yargısal Zeka',
    siteDescription: 'Yapay zeka destekli hukuki arama ve dilekçe oluşturma platformu',
    maintenanceMode: false,
    maintenanceMessage: 'Sistem bakımda, lütfen daha sonra tekrar deneyin.',
    defaultSearchLimit: 10,
    maxSearchResults: 100,
    aiModel: 'gemini-1.5-flash',
    aiTimeout: 60,
    trialDays: 3,
    emailNotifications: true,
    supportEmail: 'destek@yargisalzeka.com'
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Simulated load - in production, fetch from backend
  useEffect(() => {
    // Settings would be loaded from backend
    setLoading(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    // In production, save to backend
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <LoadingState message="Ayarlar yükleniyor..." />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sistem Ayarları</h1>
          <p className="text-gray-600 mt-2">Platform yapılandırması ve genel ayarlar</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-green-600 font-medium">✓ Kaydedildi</span>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </Button>
        </div>
      </div>

      {/* Genel Ayarlar */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Genel Ayarlar</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Site Adı
            </label>
            <Input
              value={settings.siteName}
              onChange={(e) => updateSetting('siteName', e.target.value)}
              placeholder="Site adı"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destek E-postası
            </label>
            <Input
              type="email"
              value={settings.supportEmail}
              onChange={(e) => updateSetting('supportEmail', e.target.value)}
              placeholder="destek@example.com"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Site Açıklaması
            </label>
            <textarea
              value={settings.siteDescription}
              onChange={(e) => updateSetting('siteDescription', e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              rows={3}
              placeholder="Site açıklaması"
            />
          </div>
        </div>
      </Card>

      {/* Bakım Modu */}
      <Card className={`p-6 ${settings.maintenanceMode ? 'border-yellow-400 bg-yellow-50' : ''}`}>
        <h2 className="text-xl font-semibold mb-4">Bakım Modu</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Bakım Modunu Aktifleştir</p>
              <p className="text-sm text-gray-500">Aktif olduğunda kullanıcılar siteye erişemez</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => updateSetting('maintenanceMode', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
            </label>
          </div>
          {settings.maintenanceMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bakım Mesajı
              </label>
              <textarea
                value={settings.maintenanceMessage}
                onChange={(e) => updateSetting('maintenanceMessage', e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                rows={2}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Arama Ayarları */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Arama Ayarları</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Varsayılan Sonuç Limiti
            </label>
            <Input
              type="number"
              value={settings.defaultSearchLimit}
              onChange={(e) => updateSetting('defaultSearchLimit', parseInt(e.target.value) || 10)}
              min={1}
              max={100}
            />
            <p className="text-xs text-gray-500 mt-1">Her aramada gösterilecek varsayılan sonuç sayısı</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maksimum Sonuç Sayısı
            </label>
            <Input
              type="number"
              value={settings.maxSearchResults}
              onChange={(e) => updateSetting('maxSearchResults', parseInt(e.target.value) || 100)}
              min={10}
              max={500}
            />
            <p className="text-xs text-gray-500 mt-1">Bir aramada döndürülebilecek maksimum sonuç</p>
          </div>
        </div>
      </Card>

      {/* AI Ayarları */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Yapay Zeka Ayarları</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Model
            </label>
            <select
              value={settings.aiModel}
              onChange={(e) => updateSetting('aiModel', e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Hızlı)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Gelişmiş)</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (En Yeni)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Varsayılan AI modeli</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Timeout (saniye)
            </label>
            <Input
              type="number"
              value={settings.aiTimeout}
              onChange={(e) => updateSetting('aiTimeout', parseInt(e.target.value) || 60)}
              min={10}
              max={300}
            />
            <p className="text-xs text-gray-500 mt-1">AI işlemleri için maksimum bekleme süresi</p>
          </div>
        </div>
      </Card>

      {/* Abonelik Ayarları */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Abonelik Ayarları</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trial Süresi (gün)
            </label>
            <Input
              type="number"
              value={settings.trialDays}
              onChange={(e) => updateSetting('trialDays', parseInt(e.target.value) || 3)}
              min={1}
              max={30}
            />
            <p className="text-xs text-gray-500 mt-1">Yeni kullanıcılar için deneme süresi</p>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">E-posta Bildirimleri</p>
              <p className="text-sm text-gray-500">Abonelik bildirimleri gönder</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) => updateSetting('emailNotifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </Card>

      {/* Tehlikeli Bölge */}
      <Card className="p-6 border-red-200">
        <h2 className="text-xl font-semibold mb-4 text-red-600">Tehlikeli Bölge</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <p className="font-medium text-red-800">Cache Temizle</p>
              <p className="text-sm text-red-600">Tüm önbelleği temizle (performansı geçici olarak etkileyebilir)</p>
            </div>
            <Button variant="destructive" size="sm">
              Cache Temizle
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <p className="font-medium text-red-800">Elasticsearch Reindex</p>
              <p className="text-sm text-red-600">Tüm kararları yeniden indexle (uzun sürebilir)</p>
            </div>
            <Button variant="destructive" size="sm">
              Reindex Başlat
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

