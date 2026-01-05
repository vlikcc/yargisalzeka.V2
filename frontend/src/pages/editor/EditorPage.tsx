import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UyapEditor } from '../../components/editor';
import { petitionService, PetitionDetail } from '../../services/petitionService';
import { ArrowLeft, Save, Loader2, FileText, AlertCircle, Check, Edit2 } from 'lucide-react';

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
                    <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Dilekçe yükleniyor...</p>
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
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-500/20 to-violet-600/20 rounded-xl flex items-center justify-center border border-violet-500/30">
                            <Edit2 className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">
                                {petition?.topic || 'Yeni Dilekçe'}
                            </h1>
                            <p className="text-sm text-slate-500">
                                {petition ? `Oluşturulma: ${new Date(petition.createdAt).toLocaleDateString('tr-TR')}` : 'Düzenleme modu'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {saved && (
                        <span className="flex items-center gap-1.5 text-sm text-emerald-400">
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
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <p className="text-red-400">{error}</p>
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
                    <FileText className="w-5 h-5 text-cyan-400 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-white mb-2">Editör Kısayolları</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-400">
                            <div><kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs text-slate-200">Ctrl+B</kbd> Kalın</div>
                            <div><kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs text-slate-200">Ctrl+I</kbd> İtalik</div>
                            <div><kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs text-slate-200">Ctrl+U</kbd> Altı Çizili</div>
                            <div><kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs text-slate-200">Ctrl+S</kbd> Kaydet</div>
                            <div><kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs text-slate-200">Ctrl+Z</kbd> Geri Al</div>
                            <div><kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs text-slate-200">Ctrl+Y</kbd> Yinele</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
