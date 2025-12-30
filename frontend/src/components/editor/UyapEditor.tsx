import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorToolbar } from './EditorToolbar';
import { useCallback, useEffect } from 'react';
import './editor.css';

interface UyapEditorProps {
    content?: string;
    onChange?: (content: string) => void;
    onSave?: (content: string) => void;
    placeholder?: string;
    editable?: boolean;
}

export function UyapEditor({
    content = '',
    onChange,
    onSave,
    placeholder = 'Dilekçenizi buraya yazın veya yapıştırın...',
    editable = true
}: UyapEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3, 4],
                },
            }),
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
                alignments: ['left', 'center', 'right', 'justify'],
            }),
            TextStyle,
            Color,
            FontFamily.configure({
                types: ['textStyle'],
            }),
            Highlight.configure({
                multicolor: true,
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableCell,
            TableHeader,
            Placeholder.configure({
                placeholder,
            }),
        ],
        content,
        editable,
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML());
        },
    });

    // Content değiştiğinde editörü güncelle
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    const handleSave = useCallback(() => {
        if (editor && onSave) {
            onSave(editor.getHTML());
        }
    }, [editor, onSave]);

    // Ctrl+S ile kaydetme
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleSave]);

    if (!editor) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="uyap-editor-container bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Toolbar */}
            <EditorToolbar editor={editor} onSave={handleSave} />

            {/* Bubble Menu for quick formatting */}
            <BubbleMenu
                editor={editor}
                tippyOptions={{ duration: 100 }}
                className="bg-slate-800 rounded-lg shadow-xl p-1 flex items-center gap-1"
            >
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-1.5 rounded hover:bg-slate-700 ${editor.isActive('bold') ? 'bg-slate-700 text-white' : 'text-slate-300'}`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
                    </svg>
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-1.5 rounded hover:bg-slate-700 ${editor.isActive('italic') ? 'bg-slate-700 text-white' : 'text-slate-300'}`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <line x1="19" y1="4" x2="10" y2="4" strokeWidth={2} />
                        <line x1="14" y1="20" x2="5" y2="20" strokeWidth={2} />
                        <line x1="15" y1="4" x2="9" y2="20" strokeWidth={2} />
                    </svg>
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={`p-1.5 rounded hover:bg-slate-700 ${editor.isActive('underline') ? 'bg-slate-700 text-white' : 'text-slate-300'}`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8v4a5 5 0 0010 0V8M5 20h14" />
                    </svg>
                </button>
            </BubbleMenu>

            {/* Editor Content */}
            <div className="editor-content-wrapper p-8 min-h-[600px] bg-slate-50">
                <div className="editor-page bg-white shadow-md mx-auto p-12" style={{ maxWidth: '21cm', minHeight: '29.7cm' }}>
                    <EditorContent editor={editor} className="prose prose-slate max-w-none" />
                </div>
            </div>

            {/* Status Bar */}
            <div className="border-t border-slate-200 px-4 py-2 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-4">
                    <span>Kelime: {editor.storage.characterCount?.words?.() || editor.getText().split(/\s+/).filter(Boolean).length}</span>
                    <span>Karakter: {editor.getText().length}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span>Hazır</span>
                </div>
            </div>
        </div>
    );
}
