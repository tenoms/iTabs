const ACCESS_KEY = 'DdtQNAmfq454nJHxP7E9FS7QHM_55GPQVsPv20hZ6M8';

export const fetchRandomPhoto = async () => {
    try {
        const response = await fetch(
            `https://api.unsplash.com/photos/random?orientation=landscape&query=nature,wallpaper`,
            {
                headers: {
                    Authorization: `Client-ID ${ACCESS_KEY}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch image');
        }

        const data = await response.json();
        return {
            url: data.urls.full, // Use full resolution for wallpaper
            regularUrl: data.urls.regular,
            fullUrl: data.urls.full,
            downloadLocation: data.links.download_location,
            photographer: data.user.name,
            photographerLink: data.user.links.html,
        };
    } catch (error) {
        console.error('Unsplash Error:', error);
        return null;
    }
};

export const fetchPopularPhotos = async (query = '', page = 1) => {
    try {
        let url;
        if (query) {
            url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=20&orientation=landscape`;
        } else {
            url = `https://api.unsplash.com/photos?order_by=popular&page=${page}&per_page=20&orientation=landscape`;
        }

        const response = await fetch(url, {
            headers: {
                Authorization: `Client-ID ${ACCESS_KEY}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch images');
        }

        const data = await response.json();
        const results = query ? data.results : data;

        return results.map(img => ({
            id: img.id,
            url: img.urls.full, // Use full resolution for wallpaper
            regularUrl: img.urls.regular,
            fullUrl: img.urls.full,
            thumb: img.urls.small,
            photographer: img.user.name,
            photographerLink: img.user.links.html,
        }));
    } catch (error) {
        console.error('Unsplash Error:', error);
        return [];
    }
};

export const cacheImage = async (url) => {
    try {
        const cache = await caches.open('bg-cache');
        await cache.add(url);
        return true;
    } catch (error) {
        console.error('Cache Error:', error);
        return false;
    }
};

export const getCachedImage = async (url) => {
    try {
        const cache = await caches.open('bg-cache');
        const response = await cache.match(url);
        if (response) {
            const blob = await response.blob();
            return URL.createObjectURL(blob);
        }
        return null;
    } catch {
        return null;
    }
};
