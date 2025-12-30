import { Editor } from '@tiptap/react';
import { useState, useCallback } from 'react';
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    List,
    ListOrdered,
    Undo,
    Redo,
    Table,
    Highlighter,
    Save,
    Download,
    FileText,
    Palette,
    Type,
    ChevronDown,
    Plus,
    Minus,
    Scale,
} from 'lucide-react';
import { downloadUdf } from '../../utils/udfGenerator';

interface EditorToolbarProps {
    editor: Editor;
    onSave?: () => void;
}

const FONT_FAMILIES = [
    { label: 'Times New Roman', value: 'Times New Roman' },
    { label: 'Arial', value: 'Arial' },
    { label: 'Courier New', value: 'Courier New' },
    { label: 'Georgia', value: 'Georgia' },
    { label: 'Verdana', value: 'Verdana' },
    { label: 'Tahoma', value: 'Tahoma' },
];

const FONT_SIZES = ['10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48'];

const COLORS = [
    '#000000', '#374151', '#6b7280', '#9ca3af',
    '#dc2626', '#ea580c', '#d97706', '#ca8a04',
    '#16a34a', '#0d9488', '#0284c7', '#2563eb',
    '#7c3aed', '#c026d3', '#db2777', '#e11d48',
];

const HIGHLIGHT_COLORS = [
    '#fef08a', '#fde047', '#facc15',
    '#bbf7d0', '#86efac', '#4ade80',
    '#bfdbfe', '#93c5fd', '#60a5fa',
    '#fecaca', '#fca5a5', '#f87171',
];

export function EditorToolbar({ editor, onSave }: EditorToolbarProps) {
    const [showFontDropdown, setShowFontDropdown] = useState(false);
    const [showSizeDropdown, setShowSizeDropdown] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showHighlightPicker, setShowHighlightPicker] = useState(false);
    const [showTableMenu, setShowTableMenu] = useState(false);

    const currentFontFamily = editor.getAttributes('textStyle').fontFamily || 'Times New Roman';

    const handleExportUdf = useCallback(async () => {
        const content = editor.getText();
        await downloadUdf({
            title: 'Dilekçe',
            content,
            date: new Date().toLocaleDateString('tr-TR'),
        }, 'dilekce');
    }, [editor]);

    const handleExportTxt = useCallback(() => {
        const content = editor.getText();
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dilekce.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [editor]);

    const insertTable = useCallback((rows: number, cols: number) => {
        editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
        setShowTableMenu(false);
    }, [editor]);

    return (
        <div className="border-b border-slate-200 bg-white">
            {/* Main Toolbar */}
            <div className="flex items-center gap-1 p-2 flex-wrap">
                {/* Undo/Redo */}
                <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        title="Geri Al (Ctrl+Z)"
                    >
                        <Undo className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        title="Yinele (Ctrl+Y)"
                    >
                        <Redo className="w-4 h-4" />
                    </ToolbarButton>
                </div>

                {/* Font Family */}
                <div className="relative px-2 border-r border-slate-200">
                    <button
                        onClick={() => setShowFontDropdown(!showFontDropdown)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-slate-100 text-sm min-w-[140px]"
                    >
                        <Type className="w-4 h-4 text-slate-500" />
                        <span className="truncate">{currentFontFamily}</span>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>
                    {showFontDropdown && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[180px]">
                            {FONT_FAMILIES.map((font) => (
                                <button
                                    key={font.value}
                                    onClick={() => {
                                        editor.chain().focus().setFontFamily(font.value).run();
                                        setShowFontDropdown(false);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                                    style={{ fontFamily: font.value }}
                                >
                                    {font.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Font Size */}
                <div className="relative px-2 border-r border-slate-200">
                    <button
                        onClick={() => setShowSizeDropdown(!showSizeDropdown)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-slate-100 text-sm min-w-[60px]"
                    >
                        <span>12</span>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>
                    {showSizeDropdown && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                            {FONT_SIZES.map((size) => (
                                <button
                                    key={size}
                                    onClick={() => {
                                        // Font size requires custom extension, using heading for now
                                        setShowSizeDropdown(false);
                                    }}
                                    className="w-full px-4 py-1.5 text-left text-sm hover:bg-slate-50"
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Text Formatting */}
                <div className="flex items-center gap-0.5 px-2 border-r border-slate-200">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        isActive={editor.isActive('bold')}
                        title="Kalın (Ctrl+B)"
                    >
                        <Bold className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        isActive={editor.isActive('italic')}
                        title="İtalik (Ctrl+I)"
                    >
                        <Italic className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        isActive={editor.isActive('underline')}
                        title="Altı Çizili (Ctrl+U)"
                    >
                        <Underline className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        isActive={editor.isActive('strike')}
                        title="Üstü Çizili"
                    >
                        <Strikethrough className="w-4 h-4" />
                    </ToolbarButton>
                </div>

                {/* Text Color */}
                <div className="relative px-2 border-r border-slate-200">
                    <ToolbarButton
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        title="Metin Rengi"
                    >
                        <Palette className="w-4 h-4" />
                    </ToolbarButton>
                    {showColorPicker && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 p-2">
                            <div className="grid grid-cols-4 gap-1">
                                {COLORS.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => {
                                            editor.chain().focus().setColor(color).run();
                                            setShowColorPicker(false);
                                        }}
                                        className="w-6 h-6 rounded border border-slate-200 hover:scale-110 transition-transform"
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Highlight */}
                <div className="relative px-2 border-r border-slate-200">
                    <ToolbarButton
                        onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                        isActive={editor.isActive('highlight')}
                        title="Vurgulama"
                    >
                        <Highlighter className="w-4 h-4" />
                    </ToolbarButton>
                    {showHighlightPicker && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 p-2">
                            <div className="grid grid-cols-3 gap-1">
                                {HIGHLIGHT_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => {
                                            editor.chain().focus().toggleHighlight({ color }).run();
                                            setShowHighlightPicker(false);
                                        }}
                                        className="w-6 h-6 rounded border border-slate-200 hover:scale-110 transition-transform"
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            <button
                                onClick={() => {
                                    editor.chain().focus().unsetHighlight().run();
                                    setShowHighlightPicker(false);
                                }}
                                className="w-full mt-2 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
                            >
                                Vurgulamayı Kaldır
                            </button>
                        </div>
                    )}
                </div>

                {/* Alignment */}
                <div className="flex items-center gap-0.5 px-2 border-r border-slate-200">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                        isActive={editor.isActive({ textAlign: 'left' })}
                        title="Sola Hizala"
                    >
                        <AlignLeft className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                        isActive={editor.isActive({ textAlign: 'center' })}
                        title="Ortala"
                    >
                        <AlignCenter className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                        isActive={editor.isActive({ textAlign: 'right' })}
                        title="Sağa Hizala"
                    >
                        <AlignRight className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                        isActive={editor.isActive({ textAlign: 'justify' })}
                        title="İki Yana Yasla"
                    >
                        <AlignJustify className="w-4 h-4" />
                    </ToolbarButton>
                </div>

                {/* Lists */}
                <div className="flex items-center gap-0.5 px-2 border-r border-slate-200">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        isActive={editor.isActive('bulletList')}
                        title="Madde İşaretli Liste"
                    >
                        <List className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        isActive={editor.isActive('orderedList')}
                        title="Numaralı Liste"
                    >
                        <ListOrdered className="w-4 h-4" />
                    </ToolbarButton>
                </div>

                {/* Indent */}
                <div className="flex items-center gap-0.5 px-2 border-r border-slate-200">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
                        disabled={!editor.can().sinkListItem('listItem')}
                        title="Girintiyi Artır"
                    >
                        <Plus className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().liftListItem('listItem').run()}
                        disabled={!editor.can().liftListItem('listItem')}
                        title="Girintiyi Azalt"
                    >
                        <Minus className="w-4 h-4" />
                    </ToolbarButton>
                </div>

                {/* Table */}
                <div className="relative px-2 border-r border-slate-200">
                    <ToolbarButton
                        onClick={() => setShowTableMenu(!showTableMenu)}
                        title="Tablo Ekle"
                    >
                        <Table className="w-4 h-4" />
                    </ToolbarButton>
                    {showTableMenu && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 p-3">
                            <p className="text-xs text-slate-500 mb-2">Tablo boyutu seçin:</p>
                            <div className="grid grid-cols-5 gap-1">
                                {[...Array(5)].map((_, row) => (
                                    [...Array(5)].map((_, col) => (
                                        <button
                                            key={`${row}-${col}`}
                                            onClick={() => insertTable(row + 1, col + 1)}
                                            className="w-5 h-5 border border-slate-300 hover:bg-primary-100 hover:border-primary-400"
                                            title={`${row + 1}x${col + 1}`}
                                        />
                                    ))
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Save & Export */}
                <div className="flex items-center gap-1 pl-2">
                    {onSave && (
                        <button
                            onClick={onSave}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                        >
                            <Save className="w-4 h-4" />
                            Kaydet
                        </button>
                    )}

                    <div className="relative group">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium">
                            <Download className="w-4 h-4" />
                            İndir
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[150px]">
                            <button
                                onClick={handleExportTxt}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                                <FileText className="w-4 h-4" />
                                TXT olarak
                            </button>
                            <button
                                onClick={handleExportUdf}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                                <Scale className="w-4 h-4" />
                                UYAP (.udf)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface ToolbarButtonProps {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    title?: string;
    children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`
        p-1.5 rounded transition-colors
        ${isActive ? 'bg-primary-100 text-primary-700' : 'text-slate-600 hover:bg-slate-100'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
        >
            {children}
        </button>
    );
}
