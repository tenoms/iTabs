import { useState, useEffect } from 'react';
import { getAllIconUrls } from '../utils/icons';

export const useIconSource = (shortcut) => {
    const [iconSrc, setIconSrc] = useState(null);

    useEffect(() => {
        let isMounted = true;
        let blobUrl = null;

        const load = async () => {
            // 1. Custom Data (Base64) - No caching needed (already local)
            if (shortcut.customIcon?.type === 'custom') {
                if (isMounted) setIconSrc(shortcut.customIcon.data);
                return;
            }

            // 2. Letter - No image source
            if (shortcut.customIcon?.type === 'letter') {
                if (isMounted) setIconSrc(null);
                return;
            }

            // 3. Network URL - If user has selected a specific icon, use it directly
            if (shortcut.customIcon?.url) {
                // User has explicitly chosen this icon, use it directly without probing
                if (isMounted) setIconSrc(shortcut.customIcon.url);
                return;
            }

            // 4. Auto-detect icon from URL - Try to find a working source
            const candidates = getAllIconUrls(shortcut.url);

            if (!candidates.length) {
                if (isMounted) setIconSrc(false);
                return;
            }

            try {
                const cache = await caches.open('icon-cache');

                // First pass: Check cache for any candidate
                for (const candidate of candidates) {
                    try {
                        const cachedResponse = await cache.match(candidate.url);
                        if (cachedResponse && cachedResponse.ok && cachedResponse.type !== 'opaque') {
                            const blob = await cachedResponse.blob();
                            if (blob.size > 0) {
                                blobUrl = URL.createObjectURL(blob);
                                if (isMounted) setIconSrc(blobUrl);
                                return;
                            }
                        }
                    } catch {
                        // Continue to next candidate
                    }
                }
                
                // Second pass: Probe live URLs
                for (const candidate of candidates) {
                    try {
                        // Probe with Image object to avoid CORS errors on 404s
                        await new Promise((resolve, reject) => {
                            const img = new Image();
                            img.onload = resolve;
                            img.onerror = reject;
                            img.src = candidate.url;
                        });

                        // If we get here, the image exists and loaded
                        if (isMounted) setIconSrc(candidate.url);
                        
                        // Try to cache it for next time
                        try {
                            // Skip caching for Google URLs to avoid CORS errors
                            // Google favicons don't support CORS, so fetch/cache.add will fail
                            if (!candidate.url.includes('google.com/s2/favicons')) {
                                await cache.add(candidate.url);
                            }
                        } catch {
                            // If CORS fails but image loaded, we just can't cache it.
                            // This is acceptable.
                        }
                        return; // Found a working one
                    } catch {
                        // Probe failed (404 or network error), try next candidate
                        continue;
                    }
                }

                // If all failed
                if (isMounted) setIconSrc(false);

            } catch (error) {
                console.warn('Icon loading failed:', error);
                // Fallback to primary URL if everything explodes, or false?
                // Better to fail gracefully to letter
                if (isMounted) setIconSrc(false);
            }
        };

        load();

        return () => {
            isMounted = false;
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
    }, [shortcut]);

    return iconSrc;
};
