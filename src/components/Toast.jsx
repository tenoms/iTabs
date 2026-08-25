import { useEffect } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';

export const Toast = ({ message, type = 'success', onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);

        return () => clearTimeout(timer);
    }, [onClose]);

    const icons = {
        success: <Check className="h-5 w-5" />,
        error: <AlertCircle className="h-5 w-5" />,
    };

    const colors = {
        success: 'bg-green-500/90',
        error: 'bg-red-500/90',
    };

    return (
        <div className="fixed top-6 right-6 z-100 animate-slide-in">
            <div className={`${colors[type]} backdrop-blur-xl text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px] border border-white/20`}>
                <div className="shrink-0">
                    {icons[type]}
                </div>
                <div className="flex-1 text-sm font-medium">
                    {message}
                </div>
                <button
                    onClick={onClose}
                    className="shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};

// Toast container component
const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <div className="fixed top-6 right-6 z-100 flex flex-col gap-2">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
};

export default ToastContainer;
