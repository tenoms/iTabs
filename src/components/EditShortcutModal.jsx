import { useState } from 'react';
import { X } from 'lucide-react';
import IconSelector from './IconSelector';

const EditShortcutModal = ({ isOpen, onClose, shortcut, onSave }) => {
    const [url, setUrl] = useState(shortcut?.url || '');
    const [confirmedUrl, setConfirmedUrl] = useState(shortcut?.url || '');
    const [title, setTitle] = useState(shortcut?.title || '');
    const [selectedIcon, setSelectedIcon] = useState(shortcut?.customIcon || null);
    const [iconPadding, setIconPadding] = useState(shortcut?.iconPadding || false);

    const normalizeUrl = (value) => {
        if (!value) return '';
        return value.startsWith('http') ? value : `https://${value}`;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!url) return;

        let finalUrl = url;
        if (!finalUrl.startsWith('http')) {
            finalUrl = 'https://' + finalUrl;
        }

        try {
            const domain = new URL(finalUrl).hostname;
            const displayTitle = title || domain;
            
            // If no icon is selected, default to letter icon to avoid unnecessary network requests
            let finalIcon = selectedIcon;
            if (!finalIcon) {
                const firstChar = displayTitle[0] || 'A';
                finalIcon = {
                    type: 'letter',
                    letter: firstChar.toUpperCase()
                };
            }

            onSave({
                ...shortcut,
                url: finalUrl,
                title: displayTitle,
                customIcon: finalIcon,
                iconPadding: iconPadding
            });
            onClose();
        } catch {
            alert('Invalid URL');
        }
    };

    if (!isOpen || !shortcut) return null;

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/10">
                    <h3 className="text-xl font-semibold text-white">编辑快捷方式</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs text-white/60">URL</label>
                        <input
                            type="text"
                            placeholder="example.com"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onBlur={() => {
                                const normalized = normalizeUrl(url);
                                setConfirmedUrl(normalized);
                            }}
                            className="w-full bg-black/10 border border-white/10 rounded-lg py-2.5 px-4 text-white text-sm focus:outline-none focus:border-white/30 transition-colors placeholder-white/30"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-white/60">名称</label>
                        <input
                            type="text"
                            placeholder="我的网站"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-black/10 border border-white/10 rounded-lg py-2.5 px-4 text-white text-sm focus:outline-none focus:border-white/30 transition-colors placeholder-white/30"
                        />
                    </div>

                    {/* Icon Selector */}
                    <IconSelector
                        url={confirmedUrl}
                        title={title}
                        onSelect={setSelectedIcon}
                        selectedIcon={selectedIcon}
                    />

                    {/* Icon Padding Toggle */}
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <label className="text-sm text-white/80">图标内边距</label>
                            <p className="text-xs text-white/40">为大图标添加内边距</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIconPadding(!iconPadding)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${iconPadding ? 'bg-blue-600' : 'bg-white/20'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${iconPadding ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-sm font-medium text-white rounded-lg transition-colors border border-white/10"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white rounded-lg transition-colors shadow-lg"
                        >
                            保存修改
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditShortcutModal;
