import { useIconSource } from '../hooks/useIconSource';
import { useEffect, useRef } from 'react';

const MiniIcon = ({ item }) => {
    const iconSrc = useIconSource(item);

    return (
        <div className="aspect-square rounded-md overflow-hidden liquid-glass-mini flex items-center justify-center">
             {item.customIcon?.type === 'letter' ? (
                <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-blue-500 to-purple-600 rounded-md">
                    <span className="text-[8px] font-bold text-white">
                        {(item.customIcon.letter || item.title?.[0] || 'A').toUpperCase()}
                    </span>
                </div>
            ) : (
                iconSrc ? (
                    <img 
                        src={iconSrc} 
                        alt="" 
                        className="w-full h-full object-cover rounded-md"
                        onError={(e) => {
                            if (!e.target.parentElement) return;
                            e.target.style.display = 'none';
                            e.target.parentElement.classList.add('bg-gradient-to-br', 'from-blue-500', 'to-purple-600');
                        }}
                    />
                ) : (
                    <div className="w-full h-full bg-white/5 animate-pulse" />
                )
            )}
        </div>
    );
};

const FolderIcon = ({ folder, iconSize }) => {
    const previewItems = folder.children.slice(0, 9);
    const folderRef = useRef(null);
    
    // Calculate mini icon size based on container size
    // 3x3 grid or 2x2 grid
    const padding = iconSize * 0.15;
    // 动态光泽效果
    useEffect(() => {
        const element = folderRef.current;
        if (!element) return;

        const handleMouseMove = (e) => {
            const rect = element.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            element.style.setProperty('--mouse-x', `${x}%`);
            element.style.setProperty('--mouse-y', `${y}%`);
        };

        element.addEventListener('mousemove', handleMouseMove);
        return () => element.removeEventListener('mousemove', handleMouseMove);
    }, []);
    
    return (
        <div 
            ref={folderRef}
            className="relative liquid-glass-folder rounded-[22px] overflow-hidden"
            style={{ 
                width: `${iconSize}px`, 
                height: `${iconSize}px`,
                padding: `${padding}px`
            }}
        >
            <div className="glass-refraction" />
            <div className="w-full h-full grid grid-cols-3 gap-1 content-start relative z-10">
                {previewItems.map((item, index) => (
                    <MiniIcon key={item.id || index} item={item} />
                ))}
            </div>
        </div>
    );
};

export default FolderIcon;
