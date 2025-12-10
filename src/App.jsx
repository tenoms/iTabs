import { useState, useEffect, useCallback, useRef } from 'react';
import Layout from './components/Layout';
import SearchBar from './components/SearchBar';
import Settings from './components/Settings';
import ShortcutGrid from './components/ShortcutGrid';
import TodoPanel from './components/TodoPanel';
import NotesPanel from './components/NotesPanel';
import DataManagement from './components/DataManagement';
import { Toast } from './components/Toast';
import { Globe, Settings as SettingsIcon, Cloud, ClipboardList, StickyNote, Plus, Database } from 'lucide-react';

import { fetchRandomPhoto, getCachedImage, cacheImage } from './utils/unsplash';
import { removeIconFromCache } from './utils/icons';

// import { arrayMove } from '@dnd-kit/sortable';
import syncService from './services/syncService';

const DEFAULT_BG_URL = 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2070&auto=format&fit=crop';

function App() {
  const [bgUrl, setBgUrl] = useState(localStorage.getItem('bg_url') || DEFAULT_BG_URL);
  const [gridConfig, setGridConfig] = useState(() => {
    const saved = localStorage.getItem('grid_config');
    return saved ? JSON.parse(saved) : {
      cols: 8,
      rows: 4,
      iconSize: 80,
      showSearchBar: true
    };
  });
  const [bgConfig, setBgConfig] = useState(() => {
    const saved = localStorage.getItem('bg_config');
    return saved ? JSON.parse(saved) : {
      blur: 2,
      overlay: 30
    };
  });

  const [shortcuts, setShortcuts] = useState([]);
  const [settingsTrigger, setSettingsTrigger] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [todos, setTodos] = useState(() => {
    const saved = localStorage.getItem('todos');
    return saved ? JSON.parse(saved) : [];
  });
  const [isTodoOpen, setIsTodoOpen] = useState(false);
  const [isTodoPinned, setIsTodoPinned] = useState(() => localStorage.getItem('todo_pinned') === 'true');
  const isTodoVisible = isTodoOpen || isTodoPinned;
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('notes');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isDataManagementOpen, setIsDataManagementOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoggedIn, setIsLoggedIn] = useState(syncService.isLoggedIn());

  // Track if we're currently pulling data to prevent auto-push during pull
  const isPullingRef = useRef(false);

  const updateLocalTimestamp = () => {
    localStorage.setItem('last_local_update', new Date().toISOString());
  };

  // Auto-pull from cloud - defined with useCallback to avoid closure issues
  const pullFromCloud = useCallback(async () => {
    if (!syncService.isLoggedIn()) return;

    try {
      isPullingRef.current = true; // Set flag before pulling

      const cloudData = await syncService.pullData();
      if (!cloudData) {
        isPullingRef.current = false;
        return;
      }

      // Get last local update time
      const lastLocalUpdate = localStorage.getItem('last_local_update');
      const cloudUpdatedAt = cloudData.updatedAt;

      // Decide whether to apply cloud data:
      // - If cloud has a timestamp, require it to be newer than local
      // - If no local timestamp exists, always apply
      // If timestamps are equal, we assume data is already in sync and do not apply cloud data.
      // If a custom conflict resolution is needed for equal timestamps, implement it here.
      const shouldApplyCloud = cloudUpdatedAt
        ? (!lastLocalUpdate || new Date(cloudUpdatedAt) > new Date(lastLocalUpdate))
        : !lastLocalUpdate;

      if (shouldApplyCloud) {
        console.log('Pulling data from cloud...');

        let updated = false;

        if (cloudData.shortcuts) {
          console.log('Updating shortcuts:', cloudData.shortcuts);
          setShortcuts(cloudData.shortcuts);
          localStorage.setItem('shortcuts', JSON.stringify(cloudData.shortcuts));
          updated = true;
        }
        if (cloudData.gridConfig) {
          console.log('Updating gridConfig:', cloudData.gridConfig);
          setGridConfig(cloudData.gridConfig);
          localStorage.setItem('grid_config', JSON.stringify(cloudData.gridConfig));
          updated = true;
        }
        if (cloudData.bgConfig) {
          console.log('Updating bgConfig:', cloudData.bgConfig);
          setBgConfig(cloudData.bgConfig);
          localStorage.setItem('bg_config', JSON.stringify(cloudData.bgConfig));
          updated = true;
        }
        if (cloudData.bgUrl) {
          console.log('Updating bgUrl:', cloudData.bgUrl);
          setBgUrl(cloudData.bgUrl);
          localStorage.setItem('bg_url', cloudData.bgUrl);
          updated = true;
        }
        if (cloudData.todos) {
          console.log('Updating todos:', cloudData.todos);
          setTodos(cloudData.todos);
          localStorage.setItem('todos', JSON.stringify(cloudData.todos));
          updated = true;
        }
        if (cloudData.notes) {
          console.log('Updating notes:', cloudData.notes);
          setNotes(cloudData.notes);
          localStorage.setItem('notes', JSON.stringify(cloudData.notes));
          setActiveNoteId(null);
          updated = true;
        }

        if (updated) {
          if (cloudUpdatedAt) {
            localStorage.setItem('last_local_update', cloudUpdatedAt);
          }
          console.log('Cloud data pulled successfully - UI should update now');
        }
      } else {
        console.log('Local data is up to date');
      }

      // Reset flag after a short delay to allow state updates to complete
      setTimeout(() => {
        isPullingRef.current = false;
      }, 100);
    } catch (error) {
      console.error('Failed to pull from cloud:', error);
      isPullingRef.current = false; // Reset flag on error
    }
  }, []);

  // Load shortcuts from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('shortcuts');
    if (saved) {
      setShortcuts(JSON.parse(saved));
    } else {
      const defaults = [
        { id: 1, title: 'Google', url: 'https://google.com' },
      ];
      setShortcuts(defaults);
      localStorage.setItem('shortcuts', JSON.stringify(defaults));
    }

    // Initial pull on startup
    pullFromCloud();

    // Listen for storage changes (e.g. from Popup)
    const handleStorageChange = (e) => {
      if (e.key === 'shortcuts') {
        const newValue = e.newValue;
        if (newValue) {
          setShortcuts(JSON.parse(newValue));
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [pullFromCloud]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor login status changes
  useEffect(() => {
    const checkLoginStatus = () => {
      setIsLoggedIn(syncService.isLoggedIn());
    };

    // Check periodically (in case of logout from other tabs)
    const interval = setInterval(checkLoginStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleAddShortcut = (newShortcut) => {
    const updated = [...shortcuts, newShortcut];
    setShortcuts(updated);
    localStorage.setItem('shortcuts', JSON.stringify(updated));
    localStorage.setItem('last_local_update', new Date().toISOString());
  };

  const handleRemoveShortcut = (id) => {
    const target = shortcuts.find(s => s.id === id);
    if (target) {
      removeIconFromCache(target);
    }
    const updated = shortcuts.filter(s => s.id !== id);
    setShortcuts(updated);
    localStorage.setItem('shortcuts', JSON.stringify(updated));
    localStorage.setItem('last_local_update', new Date().toISOString());
  };

  const handleEditShortcut = (updatedShortcut) => {
    const newShortcuts = shortcuts.map(s => 
      s.id === updatedShortcut.id ? updatedShortcut : s
    );
    setShortcuts(newShortcuts);
    localStorage.setItem('shortcuts', JSON.stringify(newShortcuts));
    localStorage.setItem('last_local_update', new Date().toISOString());
  };

  const handleReorderShortcuts = (newShortcuts) => {
    setShortcuts(newShortcuts);
    localStorage.setItem('shortcuts', JSON.stringify(newShortcuts));
    localStorage.setItem('last_local_update', new Date().toISOString());
  };

  const handleBgConfigChange = (newConfig) => {
    setBgConfig(prev => {
      const updated = { ...prev, ...newConfig };
      localStorage.setItem('bg_config', JSON.stringify(updated));
      localStorage.setItem('last_local_update', new Date().toISOString());
      return updated;
    });
  };

  const handleConfigChange = (newConfig) => {
    setGridConfig(prev => {
      const updated = { ...prev, ...newConfig };
      localStorage.setItem('grid_config', JSON.stringify(updated));
      localStorage.setItem('last_local_update', new Date().toISOString());
      return updated;
    });
  };

  useEffect(() => {
    const loadBackground = async () => {
      // Check if we have a cached image for today
      const lastFetch = localStorage.getItem('bg_last_fetch');
      const today = new Date().toDateString();

      if (lastFetch !== today) {
        const photo = await fetchRandomPhoto();
        if (photo) {
          setBgUrl(photo.url);
          localStorage.setItem('bg_url', photo.url);
          localStorage.setItem('bg_last_fetch', today);
          // Cache it
          cacheImage(photo.url);
        }
      }
    };

    loadBackground();
  }, []);

  // Disable browser back/forward gestures (two-finger swipe on trackpad)
  useEffect(() => {
    const preventBrowserGesture = (e) => {
      // Prevent browser navigation gestures (horizontal swipe)
      // We block it if there's ANY horizontal movement to be safe
      if (Math.abs(e.deltaX) > 0) {
        e.preventDefault();
      }
    };

    // Must use non-passive to be able to preventDefault
    window.addEventListener('wheel', preventBrowserGesture, { passive: false });

    return () => {
      window.removeEventListener('wheel', preventBrowserGesture);
    };
  }, []);

  // Auto-sync when data changes (debounced)
  useEffect(() => {
    // Only sync if logged in and not currently pulling
    if (!syncService.isLoggedIn() || isPullingRef.current) return;

    const syncData = async () => {
      try {
        const data = {
          shortcuts,
          gridConfig,
          bgConfig,
          bgUrl,
          todos,
          notes
        };
        const result = await syncService.pushData(data);
        if (result) {
          console.log('Auto-sync completed');
        }
        // If result is null (offline), we silently skip
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    };

    // Debounce sync - wait 2 seconds after last change
    const timeoutId = setTimeout(syncData, 2000);

    return () => clearTimeout(timeoutId);
  }, [shortcuts, gridConfig, bgConfig, bgUrl, todos, notes]);

  // Persist todos and pin state
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    localStorage.setItem('todo_pinned', isTodoPinned ? 'true' : 'false');
    if (isTodoPinned) {
      setIsTodoOpen(true);
    }
  }, [isTodoPinned]);

  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes));
    if (notes.length > 0 && !activeNoteId) {
      setActiveNoteId(notes[0].id);
    } else if (activeNoteId && !notes.some(n => n.id === activeNoteId)) {
      setActiveNoteId(notes[0]?.id || null);
    }
  }, [notes, activeNoteId]);

  const handleAddTodo = (text) => {
    const newTodo = {
      id: Date.now(),
      text,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null
    };
    setTodos(prev => [newTodo, ...prev]);
    updateLocalTimestamp();
  };

  const handleToggleTodo = (id) => {
    setTodos(prev => prev.map(todo => {
      if (todo.id !== id) return todo;
      const completed = !todo.completed;
      return {
        ...todo,
        completed,
        completedAt: completed ? new Date().toISOString() : null
      };
    }));
    updateLocalTimestamp();
  };

  const handleDeleteTodo = (id) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
    updateLocalTimestamp();
  };

  const handleTodoDockClick = () => {
    if (isTodoPinned) {
      setToast({ message: 'Please unpin first', type: 'error' });
      return;
    }
    setIsTodoOpen(prev => !prev);
  };

  const handleAddNote = () => {
    const newNote = {
      id: Date.now(),
      title: '未命名笔记',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    setIsNotesOpen(true);
    updateLocalTimestamp();
  };

  const handleUpdateNote = (id, content) => {
    setNotes(prev => prev.map(note => {
      if (note.id !== id) return note;
      const firstLine = content.split('\n').find(line => line.trim() !== '') || '未命名笔记';
      return {
        ...note,
        content,
        title: firstLine.slice(0, 40),
        updatedAt: new Date().toISOString()
      };
    }));
    updateLocalTimestamp();
  };

  const handleDeleteNote = (id) => {
    setNotes(prev => prev.filter(note => note.id !== id));
    if (activeNoteId === id) {
      setActiveNoteId(null);
    }
    updateLocalTimestamp();
  };

  const handleSelectNote = (id) => {
    setActiveNoteId(id);
    setIsNotesOpen(true);
  };

  const handleImportNotes = (importedNotes) => {
    if (!Array.isArray(importedNotes)) {
      throw new Error('无效的笔记数据');
    }

    // 合并笔记，避免重复
    const existingIds = new Set(notes.map(n => n.id));
    const newNotes = importedNotes.filter(note => !existingIds.has(note.id));
    
    if (newNotes.length === 0) {
      setToast({ message: '没有新的笔记需要导入', type: 'error' });
      return 0;
    }

    const allNotes = [...notes, ...newNotes];
    setNotes(allNotes);
    localStorage.setItem('notes', JSON.stringify(allNotes));
    updateLocalTimestamp();
    setToast({ message: `成功导入 ${newNotes.length} 条笔记`, type: 'success' });
    return newNotes.length;
  };

  // Data Management
  const handleExportData = () => {
    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      todos,
      notes,
      shortcuts,
      gridConfig,
      bgConfig,
      bgUrl
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newtab-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (data) => {
    if (!data || typeof data !== 'object') {
      throw new Error('无效的数据格式');
    }

    // 验证数据格式：至少包含一个有效字段
    const hasValidData = 
      (data.todos && Array.isArray(data.todos)) ||
      (data.notes && Array.isArray(data.notes)) ||
      (data.shortcuts && Array.isArray(data.shortcuts)) ||
      (data.gridConfig && typeof data.gridConfig === 'object') ||
      (data.bgConfig && typeof data.bgConfig === 'object') ||
      (data.bgUrl && typeof data.bgUrl === 'string');

    if (!hasValidData) {
      throw new Error('文件不包含有效的备份数据。请确保导入的是从本应用导出的备份文件。');
    }

    let importedCount = 0;

    // Import todos
    if (data.todos && Array.isArray(data.todos)) {
      setTodos(data.todos);
      localStorage.setItem('todos', JSON.stringify(data.todos));
      importedCount++;
    }

    // Import notes
    if (data.notes && Array.isArray(data.notes)) {
      setNotes(data.notes);
      localStorage.setItem('notes', JSON.stringify(data.notes));
      setActiveNoteId(null);
      importedCount++;
    }

    // Import shortcuts
    if (data.shortcuts && Array.isArray(data.shortcuts)) {
      setShortcuts(data.shortcuts);
      localStorage.setItem('shortcuts', JSON.stringify(data.shortcuts));
      importedCount++;
    }

    // Import grid config
    if (data.gridConfig && typeof data.gridConfig === 'object') {
      setGridConfig(data.gridConfig);
      localStorage.setItem('grid_config', JSON.stringify(data.gridConfig));
      importedCount++;
    }

    // Import bg config
    if (data.bgConfig && typeof data.bgConfig === 'object') {
      setBgConfig(data.bgConfig);
      localStorage.setItem('bg_config', JSON.stringify(data.bgConfig));
      importedCount++;
    }

    // Import bg url
    if (data.bgUrl && typeof data.bgUrl === 'string') {
      setBgUrl(data.bgUrl);
      localStorage.setItem('bg_url', data.bgUrl);
      importedCount++;
    }

    if (importedCount === 0) {
      throw new Error('未找到可导入的数据');
    }

    setToast({ message: `数据导入成功！已导入 ${importedCount} 项数据。`, type: 'success' });
  };

  return (
    <Layout backgroundUrl={bgUrl} bgConfig={bgConfig}>
      <Settings
        gridConfig={gridConfig}
        bgConfig={bgConfig}
        onConfigChange={handleConfigChange}
        onBgConfigChange={handleBgConfigChange}
        onBgUpdate={setBgUrl}
        onAddShortcut={handleAddShortcut}
        shortcuts={shortcuts}
        onEditShortcut={handleEditShortcut}
        onRemoveShortcut={handleRemoveShortcut}
        onSyncPull={pullFromCloud}
        triggerTab={settingsTrigger}
        onOpenChange={setIsSettingsOpen}
      />
      <div className={`fixed right-6 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-3 liquid-glass-fixed rounded-2xl p-3 shadow-xl transition-all ${isSettingsOpen ? 'opacity-50 pointer-events-none scale-95' : 'opacity-100 pointer-events-auto scale-100'}`}>
        <button
          onClick={() => setSettingsTrigger({ tab: 'shortcuts', at: Date.now() })}
          className="w-12 h-12 rounded-xl liquid-glass-mini hover:scale-110 hover:border-white/40 text-white flex items-center justify-center transition-all active:scale-95"
          title="添加"
        >
          <Plus className="h-5 w-5" />
        </button>
        <button
          onClick={() => setIsNotesOpen(prev => !prev)}
          className="w-12 h-12 rounded-xl liquid-glass-mini hover:scale-110 hover:border-white/40 text-white flex items-center justify-center transition-all active:scale-95"
          title="笔记"
        >
          <StickyNote className="h-5 w-5" />
        </button>        
        <button
          onClick={handleTodoDockClick}
          className="w-12 h-12 rounded-xl liquid-glass-mini hover:scale-110 hover:border-white/40 text-white flex items-center justify-center transition-all active:scale-95"
          title="待办列表"
        >
          <ClipboardList className="h-5 w-5" />
        </button>
        <button
          onClick={() => setSettingsTrigger({ tab: 'general', at: Date.now() })}
          className="w-12 h-12 rounded-xl liquid-glass-mini hover:scale-110 hover:border-white/40 text-white flex items-center justify-center transition-all active:scale-95"
          title="通用"
        >
          <SettingsIcon className="h-5 w-5" />
        </button>        
        <button
          onClick={() => setSettingsTrigger({ tab: 'sync', at: Date.now() })}
          className="w-12 h-12 rounded-xl liquid-glass-mini hover:scale-110 hover:border-white/40 flex items-center justify-center transition-all active:scale-95"
          title="同步"
        >
          <Cloud className={`h-5 w-5 transition-colors ${
            !isLoggedIn ? 'text-white' : 
            !isOnline ? 'text-red-400' : 
            'text-green-400'
          }`} />
        </button>
        <button
          onClick={() => setIsDataManagementOpen(prev => !prev)}
          className="w-12 h-12 rounded-xl liquid-glass-mini hover:scale-110 hover:border-white/40 text-white flex items-center justify-center transition-all active:scale-95"
          title="数据管理"
        >
          <Database className="h-5 w-5" />
        </button>
      </div>

      <TodoPanel
        todos={todos}
        onAdd={handleAddTodo}
        onToggle={handleToggleTodo}
        onDelete={handleDeleteTodo}
        isOpen={isTodoVisible}
        pinned={isTodoPinned}
        onPinToggle={() => setIsTodoPinned(prev => !prev)}
        onOpenChange={setIsTodoOpen}
      />
      <NotesPanel
        notes={notes}
        activeNoteId={activeNoteId}
        onSelectNote={handleSelectNote}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
        onUpdateNote={handleUpdateNote}
        onImportNotes={handleImportNotes}
        isOpen={isNotesOpen}
        onOpenChange={setIsNotesOpen}
      />
      <DataManagement
        isOpen={isDataManagementOpen}
        onClose={() => setIsDataManagementOpen(false)}
        onExport={handleExportData}
        onImport={handleImportData}
      />
      <div
        className="w-full flex flex-col items-center mt-2"
        style={{
          marginLeft: isTodoVisible ? 160 : 0,
          transition: 'margin 300ms ease'
        }}
      >
        {gridConfig.showSearchBar && (
          <div className="w-full flex justify-center">
            <div
              style={{
                width: 'clamp(260px, 75vw, 720px)',
                maxWidth: isTodoVisible 
                  ? (gridConfig.centerSearchBar ? 'calc(100vw - 640px)' : 'calc(100% - 320px)')
                  : '75vw',
                transform: (gridConfig.centerSearchBar && isTodoVisible) ? 'translateX(-80px)' : 'none',
                transition: 'transform 300ms ease, max-width 300ms ease, width 300ms ease'
              }}
            >
              <SearchBar />
            </div>
          </div>
        )}

        <ShortcutGrid
          config={gridConfig}
          shortcuts={shortcuts}
          onRemoveShortcut={handleRemoveShortcut}
          onEditShortcut={handleEditShortcut}
          onReorder={handleReorderShortcuts}
          leftOffset={isTodoVisible ? 320 : 0}
        />
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </Layout>
  );
}

export default App;
