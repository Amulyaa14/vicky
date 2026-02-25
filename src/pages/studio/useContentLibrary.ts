/**
 * useContentLibrary — Pixabay API search with fallback stock assets.
 */
import { useState, useCallback, useRef } from 'react';
import { PIXABAY_API_KEY } from '../../config/env';
import type { MediaItem } from './types';
import { FALLBACK_STOCK_ASSETS, uid } from './types';

interface PixabayImageHit {
    id: number;
    webformatURL: string;
    largeImageURL: string;
    tags: string;
    previewURL: string;
}

interface PixabayVideoHit {
    id: number;
    tags: string;
    videos: {
        tiny: { url: string; thumbnail: string };
        small: { url: string; thumbnail: string };
        medium: { url: string; thumbnail: string };
    };
    duration: number;
    pictureId: string;
    userImageURL: string;
}

export interface LibraryResult {
    id: string;
    name: string;
    type: 'video' | 'image';
    thumbnailUrl: string;
    downloadUrl: string;
    duration: number;
}

export interface UseContentLibraryReturn {
    results: LibraryResult[];
    isSearching: boolean;
    searchError: string | null;
    hasApiKey: boolean;
    fallbackAssets: typeof FALLBACK_STOCK_ASSETS;
    search: (query: string, type: 'image' | 'video') => Promise<void>;
    downloadToMedia: (item: LibraryResult) => Promise<MediaItem>;
}

export function useContentLibrary(): UseContentLibraryReturn {
    const [results, setResults] = useState<LibraryResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const hasApiKey = !!PIXABAY_API_KEY;

    const search = useCallback(async (query: string, type: 'image' | 'video') => {
        if (!PIXABAY_API_KEY || !query.trim()) {
            setResults([]);
            return;
        }

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setIsSearching(true);
        setSearchError(null);

        try {
            const endpoint = type === 'video'
                ? `https://pixabay.com/api/videos/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&per_page=20&safesearch=true`
                : `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&per_page=20&safesearch=true&image_type=photo`;

            const res = await fetch(endpoint, { signal: controller.signal });
            if (!res.ok) throw new Error(`API error: ${res.status}`);
            const data = await res.json();

            if (type === 'video') {
                const hits = (data.hits as PixabayVideoHit[]) || [];
                setResults(hits.map(h => ({
                    id: `pxv-${h.id}`,
                    name: h.tags.split(',')[0]?.trim() || 'Video',
                    type: 'video' as const,
                    thumbnailUrl: `https://i.vimeocdn.com/video/${h.pictureId}_295x166.jpg`,
                    downloadUrl: h.videos.small?.url || h.videos.tiny?.url || h.videos.medium?.url,
                    duration: h.duration || 10,
                })));
            } else {
                const hits = (data.hits as PixabayImageHit[]) || [];
                setResults(hits.map(h => ({
                    id: `pxi-${h.id}`,
                    name: h.tags.split(',')[0]?.trim() || 'Image',
                    type: 'image' as const,
                    thumbnailUrl: h.previewURL || h.webformatURL,
                    downloadUrl: h.largeImageURL || h.webformatURL,
                    duration: 5,
                })));
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                setSearchError(err.message || 'Search failed');
                setResults([]);
            }
        } finally {
            setIsSearching(false);
        }
    }, []);

    const downloadToMedia = useCallback(async (item: LibraryResult): Promise<MediaItem> => {
        const res = await fetch(item.downloadUrl);
        const blob = await res.blob();
        const ext = item.type === 'video' ? 'mp4' : 'jpg';
        const file = new File([blob], `${item.name}.${ext}`, { type: blob.type });
        const url = URL.createObjectURL(blob);
        return {
            id: uid(),
            name: item.name,
            type: item.type,
            url,
            thumbnailUrl: item.thumbnailUrl,
            duration: item.duration,
            file,
        };
    }, []);

    return {
        results,
        isSearching,
        searchError,
        hasApiKey,
        fallbackAssets: FALLBACK_STOCK_ASSETS,
        search,
        downloadToMedia,
    };
}
