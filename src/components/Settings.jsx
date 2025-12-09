import React, { useState, useEffect } from 'react';
import { X, Cloud, RefreshCw, Globe, LogOut, Github, Combine } from 'lucide-react';
import { fetchRandomPhoto, cacheImage } from '../utils/unsplash';
import WallpaperModal from './WallpaperModal';
import IconSelector from './IconSelector';
import ToastContainer, { useToast } from './Toast';
import syncService from '../services/syncService';

const Settings = ({
    gridConfig,
    bgConfig,
    onConfigChange,
    onBgConfigChange,
    onBgUpdate,
    onAddShortcut,
    shortcuts,
    onEditShortcut,
    onRemoveShortcut,
    onSyncPull,
    triggerTab,
    onOpenChange
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [isLoadingBg, setIsLoadingBg] = useState(false);
    const { toasts, showToast, removeToast } = useToast();

    // Sync state
    const [isLoggedIn, setIsLoggedIn] = useState(syncService.isLoggedIn());
    const [userEmail, setUserEmail] = useState(syncService.getEmail());
    const [isSyncing, setIsSyncing] = useState(false);

    const handleBgRefresh = async () => {
        setIsLoadingBg(true);
        const photo = await fetchRandomPhoto();
        if (photo) {
            localStorage.setItem('bg_url', photo.url);
            localStorage.setItem('bg_last_fetch', new Date().toDateString());
            cacheImage(photo.url);
            if (onBgUpdate) onBgUpdate(photo.url);
        }
        setIsLoadingBg(false);
    };

    useEffect(() => {
        if (triggerTab?.tab) {
            setActiveTab(triggerTab.tab);
            setIsOpen(true);
        }
    }, [triggerTab]);

    useEffect(() => {
        onOpenChange?.(isOpen);
    }, [isOpen, onOpenChange]);

    const tabTitle = activeTab === 'shortcuts' ? '链接'
        : activeTab === 'sync' ? '同步'
            : '通用';

    return (
        <>
            <div
                className={`fixed inset-0 z-50 transition-all duration-300 ${isOpen ? 'visible' : 'invisible'}`}
            >
                {/* Backdrop */}
                <div
                    className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setIsOpen(false)}
                />

                {/* Drawer Panel */}
                <div
                    className={`absolute top-0 right-0 h-full w-96 bg-white/10 backdrop-blur-2xl border-l border-white/20 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col rounded-l-2xl overflow-hidden ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-white/10">
                        <h2 className="text-xl font-semibold text-white tracking-tight">{tabTitle}</h2>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div 
                        className="flex-1 p-6 overflow-y-auto"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        {activeTab === 'shortcuts' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-medium text-white mb-4">添加新快捷方式</h3>
                                    <AddShortcutForm onAddShortcut={onAddShortcut} showToast={showToast} />
                                </div>

                                <div className="pt-4 border-t border-white/10">
                                    <h3 className="text-sm font-medium text-white mb-4">关于</h3>
                                    <a
                                        href="https://github.com/tenoms"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/10 hover:border-white/20 group"
                                    >
                                        <Github className="h-5 w-5 text-white/80 group-hover:text-white transition-colors" />
                                        <div className="flex-1">
                                            <div className="text-sm text-white font-medium">iTab</div>
                                            <div className="text-xs text-white/40">View source on GitHub</div>
                                        </div>
                                    </a>
                                </div>

                            </div>
                        )}

                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                <div className="space-y-8">
                                    <div>
                                        <h3 className="text-lg font-medium text-white mb-6">自定义布局</h3>
                                        <div className="space-y-6">
                                            {/* Rows */}
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <label className="text-sm text-white/80">行数</label>
                                                    <span className="text-sm font-mono text-white/60">{gridConfig.rows}</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="4"
                                                    value={gridConfig.rows}
                                                    onChange={(e) => onConfigChange({ rows: Number(e.target.value) })}
                                                    className="w-full accent-white/80 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                                                />
                                            </div>

                                            {/* Columns */}
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <label className="text-sm text-white/80">列数</label>
                                                    <span className="text-sm font-mono text-white/60">{gridConfig.cols}</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="3"
                                                    max="8"
                                                    value={gridConfig.cols}
                                                    onChange={(e) => onConfigChange({ cols: Number(e.target.value) })}
                                                    className="w-full accent-white/80 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                                                />
                                            </div>

                                            {/* Icon Size */}
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <label className="text-sm text-white/80">图标大小</label>
                                                    <span className="text-sm font-mono text-white/60">{gridConfig.iconSize}px</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="48"
                                                    max="120"
                                                    value={gridConfig.iconSize}
                                                    onChange={(e) => onConfigChange({ iconSize: Number(e.target.value) })}
                                                    className="w-full accent-white/80 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                                                />
                                            </div>

                                            {/* Info Text */}
                                            <p className="text-xs text-white/40 pt-2">
                                                间距会根据网格大小自动调整
                                            </p>
                                        </div>
                                    </div>

                                    {/* Display Settings */}
                                    <div className="pt-4 border-t border-white/10">
                                        <h3 className="text-sm font-medium text-white mb-4">显示</h3>
                                        <div className="space-y-4">
                                            {/* Show Search Bar Toggle */}
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm text-white/80">显示搜索栏</label>
                                                <button
                                                    type="button"
                                                    onClick={() => onConfigChange({ showSearchBar: !gridConfig.showSearchBar })}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${gridConfig.showSearchBar ? 'bg-blue-600' : 'bg-white/20'
                                                        }`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${gridConfig.showSearchBar ? 'translate-x-6' : 'translate-x-1'
                                                            }`}
                                                    />
                                                </button>
                                            </div>

                                            {/* Center Search Bar Toggle */}
                                            {gridConfig.showSearchBar && (
                                                <div className="flex items-center justify-between">
                                                    <label className="text-sm text-white/80">搜索栏始终居中</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => onConfigChange({ centerSearchBar: !gridConfig.centerSearchBar })}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${gridConfig.centerSearchBar ? 'bg-blue-600' : 'bg-white/20'
                                                            }`}
                                                    >
                                                        <span
                                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${gridConfig.centerSearchBar ? 'translate-x-6' : 'translate-x-1'
                                                                }`}
                                                        />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Background Settings */}
                                    <div className="pt-4 border-t border-white/10">
                                        <h3 className="text-sm font-medium text-white mb-4">Background</h3>
                                        <div className="space-y-6">
                                            {/* Blur Slider */}
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <label className="text-sm text-white/80">模糊度</label>
                                                    <span className="text-sm font-mono text-white/60">{bgConfig?.blur || 0}px</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="20"
                                                    value={bgConfig?.blur || 0}
                                                    onChange={(e) => onBgConfigChange({ blur: Number(e.target.value) })}
                                                    className="w-full accent-white/80 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                                                />
                                            </div>

                                            {/* Overlay Slider */}
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <label className="text-sm text-white/80">Darkness</label>
                                                    <span className="text-sm font-mono text-white/60">{bgConfig?.overlay || 0}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="90"
                                                    value={bgConfig?.overlay || 0}
                                                    onChange={(e) => onBgConfigChange({ overlay: Number(e.target.value) })}
                                                    className="w-full accent-white/80 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                                                />
                                            </div>

                                            {/* Wallpaper Preview & Change */}
                                            <div className="space-y-3">
                                                <label className="text-sm text-white/80">Wallpaper</label>
                                                <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-white/20 shadow-lg">
                                                    <img
                                                        src={localStorage.getItem('bg_url')}
                                                        alt="Current Wallpaper"
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setIsWallpaperModalOpen(true)}
                                                        className="flex-1 py-2 bg-white/20 hover:bg-white/30 text-sm font-medium text-white rounded-lg transition-colors shadow-lg border border-white/10"
                                                    >
                                                        更换背景
                                                    </button>
                                                    <button
                                                        onClick={handleBgRefresh}
                                                        disabled={isLoadingBg}
                                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-sm font-medium text-white rounded-lg transition-colors shadow-lg border border-white/10 disabled:opacity-50"
                                                    >
                                                        {isLoadingBg ? (
                                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <RefreshCw className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}


                        {activeTab === 'sync' && (
                            <div className="space-y-6">
                                {!isLoggedIn ? (
                                    <LoginForm
                                        onLogin={(email) => {
                                            setIsLoggedIn(true);
                                            setUserEmail(email);
                                            showToast('Logged in successfully!', 'success');
                                        }}
                                        showToast={showToast}
                                        onSyncPull={onSyncPull}
                                    />
                                ) : (
                                    <SyncPanel
                                        email={userEmail}
                                        isSyncing={isSyncing}
                                        onSync={async () => {
                                            setIsSyncing(true);
                                            try {
                                                // Collect all data to sync
                                                const data = {
                                                    shortcuts,
                                                    gridConfig,
                                                    bgConfig,
                                                    bgUrl: localStorage.getItem('bg_url') || ''
                                                };

                                                // Push to server
                                                await syncService.pushData(data);
                                                showToast('Data synced successfully!', 'success');
                                            } catch (error) {
                                                showToast(error.message, 'error');
                                            } finally {
                                                setIsSyncing(false);
                                            }
                                        }}
                                        onLogout={async () => {
                                            await syncService.logout();
                                            setIsLoggedIn(false);
                                            setUserEmail(null);
                                            showToast('Logged out successfully', 'success');
                                        }}
                                        lastSync={syncService.getLastSync()}
                                    />
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </div>

            <WallpaperModal
                isOpen={isWallpaperModalOpen}
                onClose={() => setIsWallpaperModalOpen(false)}
                onSelectWallpaper={(url) => {
                    localStorage.setItem('bg_url', url);
                    localStorage.setItem('bg_last_fetch', new Date().toDateString());
                    cacheImage(url);
                    if (onBgUpdate) onBgUpdate(url);
                }}
            />

            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </>
    );
};

// Separate component for Add Shortcut form
const AddShortcutForm = ({ onAddShortcut, showToast }) => {
    const [url, setUrl] = useState('');
    const [confirmedUrl, setConfirmedUrl] = useState('');
    const [title, setTitle] = useState('');
    const [selectedIcon, setSelectedIcon] = useState(null);

    const capitalize = (text) => {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1);
    };

    const deriveTitleFromUrl = (value) => {
        if (!value) return '';
        try {
            const normalized = value.startsWith('http') ? value : `https://${value}`;
            const parsed = new URL(normalized);
            const host = parsed.hostname.replace(/^www\./, '');
            const base = host.split('.')[0];
            return capitalize(base || host);
        } catch {
            const trimmed = value.replace(/^https?:\/\//, '');
            const segment = trimmed.split(/[/?#]/)[0];
            return capitalize(segment.replace(/^www\./, '') || value);
        }
    };

    const normalizeUrl = (value) => {
        if (!value) return '';
        return value.startsWith('http') ? value : `https://${value}`;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const urlInput = formData.get('url');
        const formTitle = formData.get('title');

        if (!urlInput) return;

        const finalUrl = normalizeUrl(urlInput);

        try {
            const domain = new URL(finalUrl).hostname;
            const displayTitle = capitalize(formTitle) || title || deriveTitleFromUrl(urlInput) || capitalize(domain);
            
            // If no icon is selected, default to letter icon
            let finalIcon = selectedIcon;
            if (!finalIcon) {
                const firstChar = displayTitle[0] || 'A';
                finalIcon = {
                    type: 'letter',
                    letter: firstChar.toUpperCase()
                };
            }

            onAddShortcut({
                id: Date.now(),
                title: displayTitle,
                url: finalUrl,
                customIcon: finalIcon
            });
            e.target.reset();
            setUrl('');
            setConfirmedUrl('');
            setTitle('');
            setSelectedIcon(null);
            showToast('快捷方式添加成功！', 'success');
        } catch (err) {
            showToast('URL 无效，请检查后重试。', 'error');
        }
    };

    return (
        <form onSubmit={handleSubmit}
            className="space-y-4"
        >
            <div className="space-y-2 relative">
                <label className="text-xs text-white/60">URL</label>
                <input
                    name="url"
                    type="text"
                    placeholder="输入 URL..."
                    value={url}
                    onChange={(e) => {
                        const value = e.target.value;
                        setUrl(value);
                        // Live typing should not trigger icon fetch; defer to blur
                    }}
                    onBlur={() => {
                        const normalized = normalizeUrl(url);
                        setConfirmedUrl(normalized);
                        setTitle(deriveTitleFromUrl(url));
                    }}
                    className="w-full bg-black/10 border border-white/10 rounded-lg py-2.5 px-4 text-white text-sm focus:outline-none focus:border-white/30 transition-colors placeholder-white/30"
                    required
                />
            </div>
            <div className="space-y-2">
                <label className="text-xs text-white/60">名称（可选）</label>
                <input
                    name="title"
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

            <button
                type="submit"
                className="w-full py-2.5 bg-white/20 hover:bg-white/30 text-sm font-medium text-white rounded-lg transition-colors shadow-lg border border-white/10"
            >
                Add Shortcut
            </button>
        </form>
    );
};

// Login Form Component
const LoginForm = ({ onLogin, showToast, onSyncPull }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [workerUrl, setWorkerUrl] = useState(syncService.getWorkerUrl());
    const [isRegistering, setIsRegistering] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showDataConflict, setShowDataConflict] = useState(false);
    const [pendingLoginEmail, setPendingLoginEmail] = useState(null);

    const hasLocalData = () => {
        const shortcuts = localStorage.getItem('shortcuts');
        const todos = localStorage.getItem('todos');
        const notes = localStorage.getItem('notes');
        return (shortcuts && JSON.parse(shortcuts).length > 0) ||
               (todos && JSON.parse(todos).length > 0) ||
               (notes && JSON.parse(notes).length > 0);
    };

    const mergeData = async () => {
        try {
            const cloudData = await syncService.pullData();
            if (!cloudData) {
                showToast('云端无数据，无法合并', 'error');
                return false;
            }

            // Merge shortcuts - deduplicate by URL
            const localShortcuts = JSON.parse(localStorage.getItem('shortcuts') || '[]');
            const cloudShortcuts = cloudData.shortcuts || [];
            const shortcutMap = new Map();
            
            // Add cloud shortcuts first (priority)
            cloudShortcuts.forEach(s => shortcutMap.set(s.url, s));
            // Add local shortcuts if URL doesn't exist
            localShortcuts.forEach(s => {
                if (!shortcutMap.has(s.url)) {
                    shortcutMap.set(s.url, s);
                }
            });
            const mergedShortcuts = Array.from(shortcutMap.values());

            // Merge todos - deduplicate by ID, keep latest
            const localTodos = JSON.parse(localStorage.getItem('todos') || '[]');
            const cloudTodos = cloudData.todos || [];
            const todoMap = new Map();
            
            [...localTodos, ...cloudTodos].forEach(todo => {
                const existing = todoMap.get(todo.id);
                if (!existing || new Date(todo.updatedAt || 0) > new Date(existing.updatedAt || 0)) {
                    todoMap.set(todo.id, todo);
                }
            });
            const mergedTodos = Array.from(todoMap.values());

            // Merge notes - deduplicate by ID, keep latest
            const localNotes = JSON.parse(localStorage.getItem('notes') || '[]');
            const cloudNotes = cloudData.notes || [];
            const noteMap = new Map();
            
            [...localNotes, ...cloudNotes].forEach(note => {
                const existing = noteMap.get(note.id);
                if (!existing || new Date(note.updatedAt || 0) > new Date(existing.updatedAt || 0)) {
                    noteMap.set(note.id, note);
                }
            });
            const mergedNotes = Array.from(noteMap.values());

            // Prepare merged data
            const mergedData = {
                shortcuts: mergedShortcuts,
                todos: mergedTodos,
                notes: mergedNotes,
                gridConfig: cloudData.gridConfig || JSON.parse(localStorage.getItem('grid_config') || '{}'),
                bgConfig: cloudData.bgConfig || JSON.parse(localStorage.getItem('bg_config') || '{}'),
                bgUrl: cloudData.bgUrl || localStorage.getItem('bg_url') || ''
            };

            // Apply merged data to localStorage
            localStorage.setItem('shortcuts', JSON.stringify(mergedData.shortcuts));
            localStorage.setItem('todos', JSON.stringify(mergedData.todos));
            localStorage.setItem('notes', JSON.stringify(mergedData.notes));
            localStorage.setItem('grid_config', JSON.stringify(mergedData.gridConfig));
            localStorage.setItem('bg_config', JSON.stringify(mergedData.bgConfig));
            localStorage.setItem('bg_url', mergedData.bgUrl);
            localStorage.setItem('last_local_update', new Date().toISOString());

            // Push merged data to cloud immediately
            await syncService.pushData(mergedData);
            
            showToast('数据合并成功！', 'success');
            
            // Reload to apply changes
            setTimeout(() => {
                window.location.reload();
            }, 500);
            
            return true;
        } catch (error) {
            showToast('合并数据失败: ' + error.message, 'error');
        }
    };

    const handleDataChoice = async (choice) => {
        if (choice === 'cloud') {
            // User chose cloud data
            if (onSyncPull) {
                onSyncPull();
            }
            setShowDataConflict(false);
            if (pendingLoginEmail) {
                onLogin(pendingLoginEmail);
                setPendingLoginEmail(null);
            }
        } else if (choice === 'local') {
            // User chose local data - push it to cloud
            try {
                const localData = {
                    shortcuts: JSON.parse(localStorage.getItem('shortcuts') || '[]'),
                    todos: JSON.parse(localStorage.getItem('todos') || '[]'),
                    notes: JSON.parse(localStorage.getItem('notes') || '[]'),
                    gridConfig: JSON.parse(localStorage.getItem('grid_config') || '{}'),
                    bgConfig: JSON.parse(localStorage.getItem('bg_config') || '{}'),
                    bgUrl: localStorage.getItem('bg_url') || ''
                };
                
                await syncService.pushData(localData);
                localStorage.setItem('last_local_update', new Date().toISOString());
                showToast('本地数据已上传到云端', 'success');
                
                setShowDataConflict(false);
                if (pendingLoginEmail) {
                    onLogin(pendingLoginEmail);
                    setPendingLoginEmail(null);
                }
            } catch (error) {
                showToast('上传数据失败: ' + error.message, 'error');
            }
        } else if (choice === 'merge') {
            // Smart merge - this will handle login callback after merge completes
            const success = await mergeData();
            if (success) {
                setShowDataConflict(false);
                if (pendingLoginEmail) {
                    onLogin(pendingLoginEmail);
                    setPendingLoginEmail(null);
                }
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Save worker URL before login/register
            syncService.setWorkerUrl(workerUrl);
            
            if (isRegistering) {
                await syncService.register(email, password);
                showToast('账户创建成功！', 'success');
                onLogin(email);
                // For new accounts, always push local data first
                return;
            } else {
                await syncService.login(email, password);
                
                // Check if there's local data and cloud data
                if (hasLocalData()) {
                    const cloudData = await syncService.pullData();
                    if (cloudData) {
                        // Both local and cloud have data - show choice UI
                        setPendingLoginEmail(email);
                        setShowDataConflict(true);
                        return;
                    } else {
                        // Cloud has no data, use local and push
                        localStorage.setItem('last_local_update', new Date().toISOString());
                    }
                } else {
                    // No local data, pull from cloud
                    if (onSyncPull) {
                        onSyncPull();
                    }
                }
                onLogin(email);
            }
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Show data conflict choice UI
    if (showDataConflict) {
        return (
            <div>
                <h3 className="text-sm font-medium text-white mb-4">数据冲突</h3>
                
                <div className="space-y-4">
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <p className="text-sm text-white/90 leading-relaxed">
                            检测到本地和云端都有数据，请选择要使用的数据源：
                        </p>
                    </div>

                    <button
                        onClick={() => handleDataChoice('cloud')}
                        className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-lg transition-all text-left group"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-white">使用云端数据</span>
                            <Cloud className="h-5 w-5 text-blue-400" />
                        </div>
                        <p className="text-xs text-white/60">
                            从云端下载数据并覆盖本地（本地数据将丢失）
                        </p>
                    </button>

                    <button
                        onClick={() => handleDataChoice('local')}
                        className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-lg transition-all text-left group"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-white">使用本地数据</span>
                            <Globe className="h-5 w-5 text-green-400" />
                        </div>
                        <p className="text-xs text-white/60">
                            保留本地数据并上传到云端（云端数据将被覆盖）
                        </p>
                    </button>

                    <button
                        onClick={() => handleDataChoice('merge')}
                        className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-lg transition-all text-left group"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-white">智能合并</span>
                            <Combine className="h-5 w-5 text-purple-400" />
                        </div>
                        <p className="text-xs text-white/60">
                            智能合并本地和云端数据（去重并保留最新版本）
                        </p>
                    </button>

                    <button
                        onClick={async () => {
                            setShowDataConflict(false);
                            setPendingLoginEmail(null);
                            await syncService.logout();
                        }}
                        className="w-full text-xs text-white/60 hover:text-white transition-colors"
                    >
                        取消登录
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h3 className="text-sm font-medium text-white mb-4">
                {isRegistering ? '创建账户' : '登录同步'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs text-white/60">邮箱</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full bg-black/10 border border-white/10 rounded-lg py-2.5 px-4 text-white text-sm focus:outline-none focus:border-white/30 transition-colors placeholder-white/30"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-white/60">密码</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-black/10 border border-white/10 rounded-lg py-2.5 px-4 text-white text-sm focus:outline-none focus:border-white/30 transition-colors placeholder-white/30"
                        required
                    />
                </div>

                {/* Advanced Settings */}
                <div className="pt-2">
                    <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-xs text-white/60 hover:text-white transition-colors"
                    >
                        {showAdvanced ? '隐藏' : '显示'}高级设置
                    </button>
                    
                    {showAdvanced && (
                        <div className="mt-3 space-y-2">
                            <label className="text-xs text-white/60">服务器地址</label>
                            <input
                                type="url"
                                value={workerUrl}
                                onChange={(e) => setWorkerUrl(e.target.value)}
                                placeholder="https://your-worker.workers.dev"
                                className="w-full bg-black/10 border border-white/10 rounded-lg py-2.5 px-4 text-white text-xs focus:outline-none focus:border-white/30 transition-colors placeholder-white/30 font-mono"
                            />
                            <p className="text-xs text-white/40">
                                自定义 Cloudflare Worker 地址
                            </p>
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white rounded-lg transition-colors shadow-lg disabled:opacity-50"
                >
                    {isLoading ? '请稍候...' : (isRegistering ? '创建账户' : '登录')}
                </button>

                <button
                    type="button"
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="w-full text-xs text-white/60 hover:text-white transition-colors"
                >
                    {isRegistering ? '已有账户？登录' : '没有账户？注册'}
                </button>
            </form>

            <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
                <p className="text-xs text-white/60 leading-relaxed">
                    同步您的快捷方式、待办、笔记、设置和背景到云端，您可以在所有设备上访问您的数据。
                </p>
            </div>
        </div>
    );
};

// Sync Panel Component
const SyncPanel = ({ email, isSyncing, onSync, onLogout, lastSync }) => {
    const formatLastSync = (timestamp) => {
        if (!timestamp) return '从未';
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    return (
        <div>
            <h3 className="text-sm font-medium text-white mb-4">同步设置</h3>

            <div className="space-y-4">
                {/* User Info */}
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-white/60">已登录</span>
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-1 text-xs text-white/60 hover:text-red-400 transition-colors"
                        >
                            <LogOut className="h-3 w-3" />
                            登出
                        </button>
                    </div>
                    <div className="text-sm text-white font-medium">{email}</div>
                </div>

                {/* Last Sync */}
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-xs text-white/60 mb-1">上次同步</div>
                    <div className="text-sm text-white">{formatLastSync(lastSync)}</div>
                </div>

                {/* Info */}
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-xs text-white/60 leading-relaxed">
                        您的快捷方式、设置和背景会自动同步到云端。修改数据后会自动保存。
                    </p>
                </div>

            </div>
        </div>
    );
};

export default Settings;
