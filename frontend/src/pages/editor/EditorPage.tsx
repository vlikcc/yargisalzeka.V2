import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UyapEditor } from '../../components/editor';
import { petitionService, PetitionDetail } from '../../services/petitionService';
import { ArrowLeft, Save, Loader2, FileText, AlertCircle, Check } from 'lucide-react';

export default function EditorPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [content, setContent] = useState('');
    const [petition, setPetition] = useState<PetitionDetail | null>(null);
    const [loading, setLoading] = useState(!!id);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Mevcut dilekçeyi yükle
    useEffect(() => {
        if (id) {
            const loadPetition = async () => {
                setLoading(true);
                try {
                    const data = await petitionService.getById(parseInt(id));
                    setPetition(data);
                    setContent(data.content || '');
                } catch (err) {
                    setError('Dilekçe yüklenemedi');
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            };
            loadPetition();
        }
    }, [id]);

    const handleSave = async () => {
        if (!content.trim()) return;

        setSaving(true);
        try {
            // TODO: Backend'de dilekçe güncelleme API'si eklendiğinde burayı güncelle
            // Şimdilik sadece başarılı gösterelim
            await new Promise(resolve => setTimeout(resolve, 500));
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            setError('Kaydetme başarısız');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleContentChange = (newContent: string) => {
        setContent(newContent);
        setSaved(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600">Dilekçe yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">
                            {petition?.topic || 'Yeni Dilekçe'}
                        </h1>
                        <p className="text-sm text-slate-500">
                            {petition ? `Oluşturulma: ${new Date(petition.createdAt).toLocaleDateString('tr-TR')}` : 'Düzenleme modu'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {saved && (
                        <span className="flex items-center gap-1.5 text-sm text-success-600">
                            <Check className="w-4 h-4" />
                            Kaydedildi
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving || !content.trim()}
                        className="btn-primary"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Kaydediliyor...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Kaydet
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-error-50 border border-error-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-error-600" />
                    <p className="text-error-700">{error}</p>
                </div>
            )}

            {/* Editor */}
            <UyapEditor
                content={content}
                onChange={handleContentChange}
                onSave={handleSave}
                placeholder={
                    id
                        ? 'Dilekçenizi düzenleyebilirsiniz...'
                        : 'Yeni dilekçenizi buraya yazın veya yapıştırın...'
                }
            />

            {/* Help Panel */}
            <div className="card p-4">
                <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-primary-600 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-slate-900 mb-1">Editör Kısayolları</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600">
                            <div><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">Ctrl+B</kbd> Kalın</div>
                            <div><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">Ctrl+I</kbd> İtalik</div>
                            <div><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">Ctrl+U</kbd> Altı Çizili</div>
                            <div><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">Ctrl+S</kbd> Kaydet</div>
                            <div><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">Ctrl+Z</kbd> Geri Al</div>
                            <div><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">Ctrl+Y</kbd> Yinele</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
