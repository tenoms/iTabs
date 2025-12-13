import { useState, useEffect } from 'react';
import { X, Pin, PinOff, Plus, Trash2, Check } from 'lucide-react';

const formatDate = (isoString) => {
    try {
        return new Date(isoString).toLocaleString([], {
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

const TodoItem = ({ todo, onToggle, onDelete }) => {
    const [isConfirming, setIsConfirming] = useState(false);

    useEffect(() => {
        if (isConfirming) {
            const timer = setTimeout(() => setIsConfirming(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [isConfirming]);

    return (
        <div className="group liquid-glass-mini rounded-xl p-3 transition-all hover:scale-[1.02] hover:border-white/30">
            <div className="flex items-start gap-3">
                <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => onToggle(todo.id)}
                    className="mt-1 h-4 w-4 accent-green-500 rounded"
                />
                <div className="flex-1 min-w-0">
                    <div className={`text-sm text-white ${todo.completed ? 'line-through text-white/60' : ''}`}>
                        {todo.text}
                    </div>
                    <div className="text-[11px] text-white/40 mt-1 space-y-0.5">
                        <div>添加: {formatDate(todo.createdAt)}</div>
                        {todo.completedAt && <div>完成: {formatDate(todo.completedAt)}</div>}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        if (isConfirming) {
                            onDelete(todo.id);
                        } else {
                            setIsConfirming(true);
                        }
                    }}
                    className={`p-2 rounded-lg transition-all hover:scale-110 active:scale-95 ${
                        isConfirming 
                            ? 'text-red-500 liquid-glass-mini border-red-500/30 hover:border-red-500/50' 
                            : 'text-white/50 hover:text-red-400 liquid-glass-mini hover:border-red-400/30'
                    }`}
                    title={isConfirming ? "确认删除" : "删除"}
                >
                    {isConfirming ? <Check className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                </button>
            </div>
        </div>
    );
};

const TodoPanel = ({
    todos,
    onAdd,
    onToggle,
    onDelete,
    isOpen,
    pinned,
    onPinToggle,
    onOpenChange
}) => {
    const [input, setInput] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        const text = input.trim();
        if (!text) return;
        onAdd(text);
        setInput('');
    };

    // Ensure pinned state keeps panel visible
    useEffect(() => {
        if (pinned && !isOpen && onOpenChange) {
            onOpenChange(true);
        }
    }, [pinned, isOpen, onOpenChange]);

    return (
        <div
            className={`fixed left-0 top-1/2 -translate-y-1/2 z-20 transition-all duration-300 ${
                isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
            }`}
            style={{ width: '280px' }}
        >
            <div className="liquid-glass rounded-tr-2xl rounded-br-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <span className="text-white font-semibold text-base">待办列表</span>
                        {pinned && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full liquid-glass-mini text-white/90">
                                pinned
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onPinToggle}
                            className="p-2 rounded-full liquid-glass-mini hover:scale-110 active:scale-95 text-red-400 hover:text-red-300 hover:border-red-400/30 transition-all"
                            title={pinned ? 'Unpin' : 'Pin'}
                        >
                            {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (!pinned) {
                                    onOpenChange?.(false);
                                }
                            }}
                            className={`p-2 rounded-full liquid-glass-mini hover:scale-110 active:scale-95 text-white/70 hover:text-white hover:border-white/30 transition-all ${pinned ? 'opacity-30 cursor-not-allowed' : ''}`}
                            title="Close"
                            disabled={pinned}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div 
                    className="p-4 space-y-4 max-h-[60vh] overflow-y-auto"
                    onWheel={(e) => e.stopPropagation()}
                >
                    {todos.length === 0 ? (
                        <div className="text-sm text-white/50">还没有提醒，添加一个吧。</div>
                    ) : (
                        <div className="space-y-3">
                            {todos.map((todo) => (
                                <TodoItem
                                    key={todo.id}
                                    todo={todo}
                                    onToggle={onToggle}
                                    onDelete={onDelete}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="border-t border-white/10 p-4 liquid-glass-mini">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="添加一个提醒..."
                            className="flex-1 liquid-glass-mini rounded-lg px-3 py-1.5 text-white text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all"
                        />
                        <button
                            type="submit"
                            className="px-3 py-1.5 rounded-lg liquid-glass-mini hover:scale-110 active:scale-95 hover:border-blue-400/50 text-white hover:text-blue-400 text-sm font-medium flex items-center justify-center transition-all"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TodoPanel;
