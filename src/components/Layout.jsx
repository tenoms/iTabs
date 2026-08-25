import { useState, useEffect } from 'react';

const Layout = ({ children, backgroundUrl, bgConfig }) => {
    const { blur = 2, overlay = 30 } = bgConfig || {};
    const [imageLoaded, setImageLoaded] = useState(false);
    const [currentBg, setCurrentBg] = useState(backgroundUrl);

    // Preload background image
    useEffect(() => {
        let frame;
        let cancelled = false;

        if (!backgroundUrl) {
            frame = requestAnimationFrame(() => {
                setCurrentBg('');
                setImageLoaded(true);
            });
            return () => cancelAnimationFrame(frame);
        }

        frame = requestAnimationFrame(() => setImageLoaded(false));
        const img = new Image();
        img.src = backgroundUrl;
        img.onload = () => {
            if (cancelled) return;
            setCurrentBg(backgroundUrl);
            setImageLoaded(true);
        };
        img.onerror = () => {
            if (cancelled) return;
            setCurrentBg(backgroundUrl);
            setImageLoaded(true); // Show anyway even if failed
        };

        return () => {
            cancelled = true;
            cancelAnimationFrame(frame);
        };
    }, [backgroundUrl]);

    return (
        <div
            className="relative min-h-screen w-full overflow-hidden bg-gray-900 text-white"
            style={{ overscrollBehaviorX: 'none' }}
        >
            {/* Background Image */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-700 ease-in-out"
                style={{
                    backgroundImage: currentBg ? `url(${currentBg})` : 'none',
                    backgroundColor: !currentBg ? '#111827' : 'transparent',
                    opacity: imageLoaded ? 1 : 0
                }}
            >
                <div
                    className="absolute inset-0 transition-all duration-300"
                    style={{
                        backgroundColor: `rgba(0, 0, 0, ${overlay / 100})`,
                        backdropFilter: `blur(${blur}px)`,
                        WebkitBackdropFilter: `blur(${blur}px)`
                    }}
                />
            </div>

            {/* Content */}
            <div className="relative z-10 flex min-h-screen flex-col items-center justify-start pt-16 p-8">
                {children}
            </div>
        </div>
    );
};

export default Layout;
