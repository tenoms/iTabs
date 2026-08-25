// Get the best icon URL for a website (Clearbit as primary)
export const getIconUrl = (url) => {
    try {
        const domain = new URL(url).hostname;
        return `https://logo.clearbit.com/${domain}`;
    } catch {
        return null;
    }
};

// Get all available icon URLs for fallback
export const getAllIconUrls = (url) => {
    try {
        const domain = new URL(url).hostname;
        return [
            { source: 'clearbit', url: `https://logo.clearbit.com/${domain}`, name: 'Clearbit' },
            { source: 'google', url: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`, name: 'Google' }
        ];
    } catch {
        return [];
    }
};

// Get icon sources object for fallback handling
export const getIconSources = (url) => {
    try {
        const domain = new URL(url).hostname;
        return {
            clearbit: `https://logo.clearbit.com/${domain}`,
            google: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
        };
    } catch {
        return null;
    }
};

// Remove icon from cache
export const removeIconFromCache = async (shortcut) => {
    if (!shortcut) return;
    
    try {
        const cache = await caches.open('icon-cache');
        
        // 1. If it has a specific custom icon URL
        if (shortcut.customIcon?.url) {
            await cache.delete(shortcut.customIcon.url);
        }
        
        // 2. Also try to clean up potential auto-detected URLs
        if (shortcut.url) {
            const candidates = getAllIconUrls(shortcut.url);
            for (const candidate of candidates) {
                await cache.delete(candidate.url);
            }
        }
    } catch (e) {
        console.warn('Failed to remove icon from cache:', e);
    }
};
