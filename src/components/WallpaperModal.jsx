import { useState, useEffect, useCallback } from 'react';
import { X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { fetchPopularPhotos } from '../utils/unsplash';

const CATEGORY_MAP = {
    '壁纸': 'desktop wallpaper',
    '自然': 'nature',
    '3D渲染': '3d renders',
    '旅行': 'travel',
    '建筑': 'architecture',
    '纹理': 'textures',
    '动物': 'animals',
    '动漫': 'anime',
    '极简': 'minimalist'
};

const CATEGORIES = Object.keys(CATEGORY_MAP);

const WallpaperModal = ({ isOpen, onClose, onSelectWallpaper }) => {
    // State for tabs and photos
    const [activeTab, setActiveTab] = useState('unsplash');
    const [unsplashPhotos, setUnsplashPhotos] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('壁纸');

    const loadUnsplashPhotos = useCallback(async (category) => {
        setIsLoading(true);
        // Use English keyword for search
        const query = CATEGORY_MAP[category];
        const photos = await fetchPopularPhotos(query);
        setUnsplashPhotos(photos);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (isOpen && activeTab === 'unsplash') {
            // Fetching wallpapers is a legitimate side effect; suppress lint warning about setting state here
            // eslint-disable-next-line react-hooks/set-state-in-effect
            loadUnsplashPhotos(selectedCategory);
        }
    }, [isOpen, activeTab, selectedCategory, loadUnsplashPhotos]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            onSelectWallpaper(reader.result);
            onClose();
        };
        reader.readAsDataURL(file);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-4xl bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/10">
                    <h3 className="text-xl font-semibold text-white">选择壁纸</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('unsplash')}
                        className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'unsplash' ? 'text-white border-b-2 border-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    >
                        Unsplash
                    </button>
                    <button
                        onClick={() => setActiveTab('local')}
                        className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'local' ? 'text-white border-b-2 border-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    >
                        本地图片
                    </button>
                </div>

                {/* Content */}
                <div 
                    className="flex-1 overflow-y-auto p-6"
                    onWheel={(e) => e.stopPropagation()}
                >
                    {activeTab === 'unsplash' && (
                        <div className="space-y-6">
                            {/* Categories */}
                            <div className="flex flex-wrap gap-2">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${selectedCategory === cat
                                            ? 'bg-white text-black border-white'
                                            : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            {isLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {unsplashPhotos.map((photo) => (
                                        <button
                                            key={photo.id}
                                            onClick={() => {
                                                onSelectWallpaper(photo.url);
                                                onClose();
                                            }}
                                            className="group relative aspect-video rounded-lg overflow-hidden border border-white/10 hover:border-blue-500 transition-all"
                                        >
                                            <img
                                                src={photo.thumb}
                                                alt={photo.photographer}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-linear-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-xs text-white truncate">by {photo.photographer}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'local' && (
                        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-white/10 rounded-xl hover:border-white/30 transition-colors bg-white/5">
                            <Upload className="h-12 w-12 text-white/40 mb-4" />
                            <p className="text-white/80 font-medium mb-2">点击上传图片</p>
                            <p className="text-white/40 text-sm mb-6">支持 JPG、PNG、WebP</p>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                                id="file-upload"
                            />
                            <label
                                htmlFor="file-upload"
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors cursor-pointer"
                            >
                                选择文件
                            </label>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WallpaperModal;
