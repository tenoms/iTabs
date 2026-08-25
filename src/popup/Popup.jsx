import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import IconSelector from '../components/IconSelector';

const Popup = () => {
    const [url, setUrl] = useState('');
    const [title, setTitle] = useState('');
    const [customIcon, setCustomIcon] = useState(null);
    const [iconPadding, setIconPadding] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [bgUrl] = useState(() => localStorage.getItem('bg_url') || '');

    // Get current tab info and background on mount
    useEffect(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                const currentTab = tabs[0];
                setUrl(currentTab.url || '');
                setTitle(currentTab.title || '');

                // Get favicon
                if (currentTab.favIconUrl) {
                    setCustomIcon({
                        type: 'source',
                        source: 'favicon',
                        url: currentTab.favIconUrl
                    });
                }
            }
            setLoading(false);
        });
    }, []);

    const handleSave = async () => {
        if (!url || !title) return;

        setSaving(true);

        try {
            // Create new shortcut
            const newShortcut = {
                id: Date.now(),
                url: url,
                title: title,
                customIcon: customIcon,
                iconPadding: iconPadding
            };

            // 1. Get existing shortcuts from both sources to be safe
            const lsData = localStorage.getItem('shortcuts');
            let lsShortcuts = lsData ? JSON.parse(lsData) : [];

            const csData = await chrome.storage.local.get(['shortcuts']);
            let csShortcuts = csData.shortcuts || [];

            // Use the one that has more data, or default to localStorage if equal
            let currentShortcuts = lsShortcuts;
            if (csShortcuts.length > lsShortcuts.length) {
                currentShortcuts = csShortcuts;
            }

            // 2. Add new shortcut
            const updatedShortcuts = [...currentShortcuts, newShortcut];

            // 3. Save to localStorage (Primary for App.jsx)
            localStorage.setItem('shortcuts', JSON.stringify(updatedShortcuts));
            localStorage.setItem('last_local_update', String(Date.now()));

            // 4. Save to chrome.storage.local (Backup)
            await chrome.storage.local.set({ shortcuts: updatedShortcuts });
            await chrome.storage.local.set({
                last_local_update: String(Date.now())
            });

            setSaved(true);
            setTimeout(() => {
                window.close();
            }, 1000);
        } catch (error) {
            console.error('Failed to save shortcut:', error);
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="w-96 min-h-[400px] bg-gray-900 text-white p-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
        );
    }

    return (
        <div
            className="w-96 min-h-[400px] text-white bg-cover bg-center relative overflow-hidden"
            style={{
                backgroundImage: bgUrl ? `url(${bgUrl})` : 'none',
                backgroundColor: !bgUrl ? '#111827' : 'transparent' // Fallback to gray-900
            }}
        >
            {/* Glassmorphism Overlay - Matching Settings.jsx style */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xl"></div>

            <div className="relative p-6 z-10">
                {saved ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 backdrop-blur-sm border border-green-500/30 flex items-center justify-center mb-4">
                            <Check className="w-8 h-8 text-green-400" />
                        </div>
                        <p className="text-lg font-medium">快捷方式已添加！</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-medium text-white tracking-tight">添加快捷方式</h2>
                            <button
                                onClick={() => window.close()}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-5">
                            {/* URL */}
                            <div className="space-y-2">
                                <label className="block text-xs font-medium text-white/70">
                                    URL
                                </label>
                                <input
                                    type="text"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 px-4 text-white text-sm focus:outline-none focus:border-white/30 transition-colors placeholder-white/30 backdrop-blur-sm"
                                    placeholder="https://example.com"
                                />
                            </div>

                            {/* Title */}
                            <div className="space-y-2">
                                <label className="block text-xs font-medium text-white/70">
                                    名称
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2.5 px-4 text-white text-sm focus:outline-none focus:border-white/30 transition-colors placeholder-white/30 backdrop-blur-sm"
                                    placeholder="网站名称"
                                />
                            </div>

                            {/* Icon Selector */}
                            <div className="space-y-2">
                                <label className="block text-xs font-medium text-white/70">
                                    图标名字
                                </label>
                                <div className="bg-white/5 border border-white/10 rounded-lg p-3 backdrop-blur-sm">
                                    <IconSelector
                                        url={url}
                                        title={title}
                                        onSelect={setCustomIcon}
                                        selectedIcon={customIcon}
                                    />
                                </div>
                            </div>

                            {/* Icon Padding */}
                            <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm">
                                <div>
                                    <p className="text-sm font-medium text-white">图标内边距</p>
                                    <p className="text-xs text-white/50 mt-0.5">为大图标添加内边距</p>
                                </div>
                                <button
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

                            {/* Save Button */}
                            <button
                                onClick={handleSave}
                                disabled={!url || !title || saving}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all shadow-lg text-sm"
                            >
                                {saving ? '保存中...' : '添加快捷方式'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Popup;
