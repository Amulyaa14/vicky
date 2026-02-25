/**
 * useMediaStore — Manages uploaded media items with thumbnail generation.
 * Uses in-memory state; items survive within the session.
 */
import { useState, useCallback } from 'react';
import type { MediaItem } from './types';
import { uid } from './types';

const ACCEPTED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/x-msvideo'];
const ACCEPTED_IMAGE = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const ACCEPTED_AUDIO = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac'];

function getMediaType(file: File): 'video' | 'image' | 'audio' | null {
    if (ACCEPTED_VIDEO.some(t => file.type.startsWith(t.split('/')[0]) && file.type === t)) return 'video';
    if (ACCEPTED_IMAGE.some(t => file.type === t)) return 'image';
    if (ACCEPTED_AUDIO.some(t => file.type === t)) return 'audio';
    // Fallback by extension
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) return 'video';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(ext)) return 'audio';
    return null;
}

function generateVideoThumbnail(url: string): Promise<string> {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.preload = 'metadata';
        video.src = url;
        video.onloadeddata = () => {
            video.currentTime = 1;
        };
        video.onseeked = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 320;
                canvas.height = 180;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(video, 0, 0, 320, 180);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            } catch {
                resolve('');
            }
        };
        video.onerror = () => resolve('');
        setTimeout(() => resolve(''), 5000); // timeout fallback
    });
}

function getVideoDuration(url: string): Promise<number> {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = url;
        video.onloadedmetadata = () => resolve(video.duration || 10);
        video.onerror = () => resolve(10);
        setTimeout(() => resolve(10), 5000);
    });
}

function getAudioDuration(url: string): Promise<number> {
    return new Promise((resolve) => {
        const audio = document.createElement('audio');
        audio.preload = 'metadata';
        audio.src = url;
        audio.onloadedmetadata = () => resolve(audio.duration || 10);
        audio.onerror = () => resolve(10);
        setTimeout(() => resolve(10), 5000);
    });
}

export interface UseMediaStoreReturn {
    mediaItems: MediaItem[];
    isUploading: boolean;
    error: string | null;
    addFiles: (files: FileList | File[]) => Promise<void>;
    addMediaItem: (item: MediaItem) => void;
    removeMedia: (id: string) => void;
    clearError: () => void;
}

export function useMediaStore(): UseMediaStoreReturn {
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addMediaItem = useCallback((item: MediaItem) => {
        setMediaItems(prev => {
            if (prev.some(m => m.id === item.id)) return prev;
            return [...prev, item];
        });
    }, []);

    const addFiles = useCallback(async (files: FileList | File[]) => {
        setError(null);
        setIsUploading(true);
        const fileArr = Array.from(files);
        const rejected: string[] = [];

        for (const file of fileArr) {
            const mediaType = getMediaType(file);
            if (!mediaType) {
                rejected.push(file.name);
                continue;
            }

            const url = URL.createObjectURL(file);
            let thumbnailUrl = '';
            let duration = 5;

            try {
                if (mediaType === 'video') {
                    [thumbnailUrl, duration] = await Promise.all([
                        generateVideoThumbnail(url),
                        getVideoDuration(url),
                    ]);
                } else if (mediaType === 'image') {
                    thumbnailUrl = url;
                } else if (mediaType === 'audio') {
                    duration = await getAudioDuration(url);
                    thumbnailUrl = ''; // audio uses icon fallback
                }
            } catch {
                // fallback
            }

            const item: MediaItem = {
                id: uid(),
                name: file.name,
                type: mediaType,
                url,
                thumbnailUrl,
                duration,
                file,
            };
            setMediaItems(prev => [...prev, item]);
        }

        if (rejected.length > 0) {
            setError(`Unsupported: ${rejected.join(', ')}`);
        }
        setIsUploading(false);
    }, []);

    const removeMedia = useCallback((id: string) => {
        setMediaItems(prev => {
            const item = prev.find(m => m.id === id);
            if (item) URL.revokeObjectURL(item.url);
            return prev.filter(m => m.id !== id);
        });
    }, []);

    const clearError = useCallback(() => setError(null), []);

    return { mediaItems, isUploading, error, addFiles, addMediaItem, removeMedia, clearError };
}
