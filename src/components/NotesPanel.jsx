import { useEffect, useMemo, useState } from 'react';
import { X, Plus, Trash2, Check, Download, Upload, Search } from 'lucide-react';
import { marked } from 'marked';

const formatTime = (iso) => {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString([], {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    } catch {
        return '';
    }
};

export default function NotesPanel({
  notes = [],
  activeNoteId,
  onSelectNote,
  onAddNote,
  onDeleteNote,
  onUpdateNote,
  onImportNotes,
  isOpen,
  onOpenChange,
}) {
    const [confirmingNoteId, setConfirmingNoteId] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId) || null, [notes, activeNoteId]);
    const isConfirmingDelete = confirmingNoteId === activeNoteId;

    // Filter notes based on search query
    const filteredNotes = useMemo(() => {
        if (!searchQuery.trim()) return notes;
        const query = searchQuery.toLowerCase();
        return notes.filter(note => 
            (note.title || '').toLowerCase().includes(query) ||
            (note.content || '').toLowerCase().includes(query)
        );
    }, [notes, searchQuery]);

    // 配置 marked
    marked.setOptions({
        breaks: true,
        gfm: true,
    });

    // 渲染 Markdown
    const renderedContent = useMemo(() => {
        if (!activeNote?.content) return '';
        return marked.parse(activeNote.content);
    }, [activeNote]);

    // 导出笔记
    const handleExportNotes = () => {
        const data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            notes: notes
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notes-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // 导入笔记
    const handleImportNotes = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);

                // 验证数据格式
                if (!data.notes || !Array.isArray(data.notes)) {
                    alert('无效的笔记备份文件格式');
                    return;
                }

                // 验证笔记数据结构
                const isValid = data.notes.every(note => 
                    note.id && 
                    typeof note.title === 'string' && 
                    typeof note.content === 'string'
                );

                if (!isValid) {
                    alert('笔记数据格式不正确');
                    return;
                }

                // 导入笔记（合并，不覆盖）
                const existingIds = new Set(notes.map(n => n.id));
                const newNotes = data.notes.filter(note => !existingIds.has(note.id));
                
                if (newNotes.length === 0) {
                    alert('没有新的笔记需要导入');
                    return;
                }

                // 通过父组件回调更新笔记
                if (onImportNotes) {
                    onImportNotes(newNotes);
                }
            } catch (error) {
                alert('导入失败：' + error.message);
            }
        };
        input.click();
    };

    useEffect(() => {
        if (isOpen && !activeNote && notes[0]) {
            onSelectNote?.(notes[0].id);
        }
    }, [isOpen, activeNote, notes, onSelectNote]);

    useEffect(() => {
        if (isConfirmingDelete) {
            const timer = setTimeout(() => setConfirmingNoteId(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [isConfirmingDelete]);

    return (
        <div className={`fixed inset-0 z-40 transition-all duration-300 ${isOpen ? 'visible' : 'invisible'}`}>
            <div
                className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={() => onOpenChange?.(false)}
            />
            <div
                className={`absolute top-0 right-0 h-full w-[820px] bg-white/10 backdrop-blur-2xl border-l border-white/15 shadow-2xl flex rounded-l-2xl overflow-hidden transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Left list */}
                <div className="w-72 border-r border-white/10 bg-black/20">
                    <div className="px-4 py-4 border-b border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-white">笔记</h3>
                            <div className="flex items-center gap-2">
                            <button
                                onClick={handleImportNotes}
                                className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                                title="导入笔记"
                            >
                                <Upload className="h-4 w-4" />
                            </button>
                            <button
                                onClick={handleExportNotes}
                                className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                                title="导出笔记"
                            >
                                <Download className="h-4 w-4" />
                            </button>
                            <button
                                onClick={onAddNote}
                                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1 text-sm"
                            >
                                <Plus className="h-4 w-4" />
                                新建
                            </button>
                        </div>
                        </div>
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                            <input
                                type="text"
                                placeholder="搜索笔记..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-3 text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
                            />
                        </div>
                    </div>
                    <div 
                        className="overflow-y-auto max-h-[calc(100%-60px)]"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        {notes.length === 0 && (
                            <div className="p-4 text-xs text-white/50">暂无笔记，点击"新建"开始。</div>
                        )}
                        {searchQuery && filteredNotes.length === 0 && (
                            <div className="p-4 text-xs text-white/50">未找到匹配的笔记</div>
                        )}
                        {filteredNotes.map((note) => (
                            <button
                                key={note.id}
                                onClick={() => onSelectNote?.(note.id)}
                                className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/10 transition flex flex-col gap-1 ${note.id === activeNoteId ? 'bg-white/10' : ''}`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm text-white truncate">{note.title || '未命名笔记'}</span>
                                    <span className="text-[10px] text-white/40 whitespace-nowrap">{formatTime(note.updatedAt)}</span>
                                </div>
                                <span className="text-xs text-white/50 truncate">
                                    {(note.content || '').split('\n').find(l => l.trim() !== '') || '空白'}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Editor */}
                <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
                        <div>
                            <div className="text-white font-semibold text-lg">{activeNote?.title || '未命名笔记'}</div>
                            {activeNote && (
                                <div className="text-[11px] text-white/40">
                                    更新: {formatTime(activeNote.updatedAt)} · 创建: {formatTime(activeNote.createdAt)}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {activeNote && (
                                <button
                                    onClick={() => {
                                        if (isConfirmingDelete) {
                                            onDeleteNote?.(activeNote.id);
                                            setConfirmingNoteId(null);
                                        } else {
                                            setConfirmingNoteId(activeNote.id);
                                        }
                                    }}
                                    className={`p-2 rounded-lg transition ${
                                        isConfirmingDelete 
                                            ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20' 
                                            : 'text-white/70 hover:text-red-400 hover:bg-red-500/10'
                                    }`}
                                    title={isConfirmingDelete ? "确认删除" : "删除笔记"}
                                >
                                    {isConfirmingDelete ? <Check className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                                </button>
                            )}
                            <button
                                onClick={() => onOpenChange?.(false)}
                                className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition"
                                title="关闭"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex">
                        {/* 编辑区 */}
                        <div className={`${showPreview ? 'w-1/2 border-r border-white/10' : 'w-full'} flex flex-col`}>
                            <div className="flex items-center justify-between px-5 py-2 border-b border-white/10 bg-white/5">
                                <span className="text-xs text-white/50">编辑</span>
                                <button
                                    onClick={() => setShowPreview(!showPreview)}
                                    className="px-3 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition"
                                >
                                    {showPreview ? '隐藏预览' : '显示预览'}
                                </button>
                            </div>
                            <textarea
                                value={activeNote?.content || ''}
                                onChange={(e) => activeNote && onUpdateNote?.(activeNote.id, e.target.value)}
                                className="flex-1 bg-transparent text-white/90 p-5 outline-none resize-none text-sm leading-6 placeholder-white/30 font-mono"
                                placeholder="开始记录你的笔记... 支持 Markdown 语法"
                            />
                        </div>
                        
                        {/* 预览区 */}
                        {showPreview && (
                            <div className="w-1/2 flex flex-col">
                                <div className="flex items-center justify-between px-5 py-2 border-b border-white/10 bg-white/5">
                                    <span className="text-xs text-white/50">预览</span>
                                    <div className="h-[27px]"></div>
                                </div>
                                <div 
                                    className="flex-1 overflow-auto p-5" 
                                    onWheel={(e) => e.stopPropagation()}
                                >
                                    <div 
                                        className="markdown-preview text-sm leading-6"
                                        dangerouslySetInnerHTML={{ __html: renderedContent }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
