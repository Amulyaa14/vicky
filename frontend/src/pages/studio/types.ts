/* ───────── Video Studio Types & Constants ───────── */

export interface MediaItem {
    id: string;
    name: string;
    type: 'video' | 'image' | 'audio';
    url: string;
    thumbnailUrl: string;
    duration: number;
    file?: File;
}

export interface ClipAdjustments {
    brightness: number; // 0-200
    contrast: number; // 0-200
    saturation: number; // 0-200
    temperature: number; // -100 to 100
    tint: number; // -100 to 100
    highlights: number; // -100 to 100
    shadows: number; // -100 to 100
    sharpness: number; // 0 to 100
}

export const DEFAULT_ADJUSTMENTS: ClipAdjustments = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    temperature: 0,
    tint: 0,
    highlights: 0,
    shadows: 0,
    sharpness: 0,
};

export interface Clip {
    id: string;
    label: string;
    duration: number;
    startTrim: number;
    endTrim: number;
    type: 'video' | 'image' | 'audio' | 'placeholder';
    color: string;
    src?: string;
    thumbnailUrl?: string;
    textOverlay?: string;
    background?: string;
    speed?: number; // 0.25 to 4
    adjustments?: ClipAdjustments;
}

export interface TransitionItem {
    afterClipId: string;
    type: string;
    duration: number;
}

export const TRANSITION_TYPES = [
    { name: 'Fade', icon: '🌗', desc: 'Smooth opacity fade' },
    { name: 'Cut', icon: '✂️', desc: 'Instant hard cut' },
    { name: 'Dissolve', icon: '💫', desc: 'Cross-dissolve blend' },
    { name: 'Slide Left', icon: '⬅️', desc: 'Slide from right' },
    { name: 'Slide Right', icon: '➡️', desc: 'Slide from left' },
    { name: 'Wipe Up', icon: '⬆️', desc: 'Wipe upward' },
    { name: 'Wipe Down', icon: '⬇️', desc: 'Wipe downward' },
    { name: 'Zoom In', icon: '🔍', desc: 'Zoom in transition' },
    { name: 'Zoom Out', icon: '🔎', desc: 'Zoom out reveal' },
    { name: 'Cross Zoom', icon: '💥', desc: 'Zoom blur crossfade' },
] as const;

export const CLIP_COLORS = [
    '#6366f1', '#8b5cf6', '#3b82f6', '#14b8a6', '#ec4899', '#f59e0b',
    '#10b981', '#ef4444', '#06b6d4', '#a855f7',
];

export interface TemplateDefinition {
    name: string;
    emoji: string;
    category: string;
    aspect: string;
    aspectValue: number;
    duration: number;
    clips: { label: string; duration: number; color: string; textOverlay?: string; background?: string }[];
    transitions: { afterIndex: number; type: string; duration: number }[];
}

export const TEMPLATES: TemplateDefinition[] = [
    {
        name: 'Social Media', emoji: '📱', category: 'Reel / Story',
        aspect: '9:16', aspectValue: 9 / 16, duration: 15,
        clips: [
            { label: 'Hook Shot', duration: 4, color: '#ec4899', textOverlay: 'YOUR HOOK HERE' },
            { label: 'Main Content', duration: 7, color: '#8b5cf6' },
            { label: 'CTA / Outro', duration: 4, color: '#6366f1', textOverlay: 'Follow for more!' },
        ],
        transitions: [
            { afterIndex: 0, type: 'Slide Left', duration: 0.5 },
            { afterIndex: 1, type: 'Zoom In', duration: 0.4 },
        ],
    },
    {
        name: 'YouTube', emoji: '🎬', category: 'Long-form 16:9',
        aspect: '16:9', aspectValue: 16 / 9, duration: 30,
        clips: [
            { label: 'Intro', duration: 5, color: '#3b82f6', textOverlay: 'VIDEO TITLE' },
            { label: 'Section A', duration: 10, color: '#8b5cf6' },
            { label: 'Section B', duration: 10, color: '#6366f1' },
            { label: 'Outro + Subscribe', duration: 5, color: '#14b8a6', textOverlay: 'Like & Subscribe!' },
        ],
        transitions: [
            { afterIndex: 0, type: 'Fade', duration: 0.8 },
            { afterIndex: 1, type: 'Dissolve', duration: 0.6 },
            { afterIndex: 2, type: 'Fade', duration: 0.8 },
        ],
    },
    {
        name: 'Slideshow', emoji: '🖼️', category: 'Photo slideshow',
        aspect: '16:9', aspectValue: 16 / 9, duration: 40,
        clips: [
            { label: 'Slide 1', duration: 6, color: '#f59e0b' },
            { label: 'Slide 2', duration: 6, color: '#ec4899' },
            { label: 'Slide 3', duration: 7, color: '#8b5cf6' },
            { label: 'Slide 4', duration: 7, color: '#3b82f6' },
            { label: 'Slide 5', duration: 7, color: '#14b8a6' },
            { label: 'Slide 6', duration: 7, color: '#6366f1', textOverlay: 'THE END' },
        ],
        transitions: [
            { afterIndex: 0, type: 'Cross Zoom', duration: 0.7 },
            { afterIndex: 1, type: 'Cross Zoom', duration: 0.7 },
            { afterIndex: 2, type: 'Cross Zoom', duration: 0.7 },
            { afterIndex: 3, type: 'Cross Zoom', duration: 0.7 },
            { afterIndex: 4, type: 'Cross Zoom', duration: 0.7 },
        ],
    },
    {
        name: 'Promo', emoji: '🚀', category: 'Product / Ad',
        aspect: '16:9', aspectValue: 16 / 9, duration: 20,
        clips: [
            { label: 'Attention Grab', duration: 5, color: '#ef4444', textOverlay: 'NEW PRODUCT', background: 'linear-gradient(135deg,#ef4444,#f59e0b)' },
            { label: 'Features', duration: 8, color: '#8b5cf6' },
            { label: 'CTA', duration: 7, color: '#3b82f6', textOverlay: 'BUY NOW →', background: 'linear-gradient(135deg,#3b82f6,#6366f1)' },
        ],
        transitions: [
            { afterIndex: 0, type: 'Wipe Up', duration: 0.5 },
            { afterIndex: 1, type: 'Slide Right', duration: 0.6 },
        ],
    },
    {
        name: 'Birthday', emoji: '🎂', category: 'Celebration',
        aspect: '1:1', aspectValue: 1, duration: 25,
        clips: [
            { label: 'Wishes', duration: 6, color: '#ec4899', textOverlay: '🎉 Happy Birthday!', background: 'linear-gradient(135deg,#ec4899,#a855f7)' },
            { label: 'Memories 1', duration: 7, color: '#f59e0b' },
            { label: 'Memories 2', duration: 6, color: '#8b5cf6' },
            { label: 'Final Message', duration: 6, color: '#6366f1', textOverlay: '🎂 Make a Wish!' },
        ],
        transitions: [
            { afterIndex: 0, type: 'Zoom In', duration: 0.6 },
            { afterIndex: 1, type: 'Fade', duration: 0.8 },
            { afterIndex: 2, type: 'Zoom In', duration: 0.6 },
        ],
    },
    {
        name: 'Minimal', emoji: '◽', category: 'Clean & Simple',
        aspect: '16:9', aspectValue: 16 / 9, duration: 15,
        clips: [
            { label: 'Scene A', duration: 8, color: '#374151', background: '#111' },
            { label: 'Scene B', duration: 7, color: '#4b5563', background: '#1a1a1a' },
        ],
        transitions: [
            { afterIndex: 0, type: 'Cut', duration: 0 },
        ],
    },
];

export const FALLBACK_STOCK_ASSETS: Omit<MediaItem, 'file'>[] = [
    { id: 'stock-1', name: 'Ocean Waves', type: 'video', url: 'https://www.pexels.com/download/video/1093662/', thumbnailUrl: 'https://images.pexels.com/videos/1093662/free-video-1093662.jpg?auto=compress&cs=tinysrgb&w=300', duration: 12 },
    { id: 'stock-2', name: 'City Traffic', type: 'video', url: 'https://www.pexels.com/download/video/2053100/', thumbnailUrl: 'https://images.pexels.com/videos/2053100/free-video-2053100.jpg?auto=compress&cs=tinysrgb&w=300', duration: 15 },
    { id: 'stock-3', name: 'Forest Trail', type: 'image', url: 'https://images.pexels.com/photos/338936/pexels-photo-338936.jpeg?auto=compress&cs=tinysrgb&w=1280', thumbnailUrl: 'https://images.pexels.com/photos/338936/pexels-photo-338936.jpeg?auto=compress&cs=tinysrgb&w=300', duration: 5 },
    { id: 'stock-4', name: 'Mountain Lake', type: 'image', url: 'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1280', thumbnailUrl: 'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=300', duration: 5 },
    { id: 'stock-5', name: 'Sunset Sky', type: 'image', url: 'https://images.pexels.com/photos/276267/pexels-photo-276267.jpeg?auto=compress&cs=tinysrgb&w=1280', thumbnailUrl: 'https://images.pexels.com/photos/276267/pexels-photo-276267.jpeg?auto=compress&cs=tinysrgb&w=300', duration: 5 },
    { id: 'stock-6', name: 'Rain Drops', type: 'video', url: 'https://www.pexels.com/download/video/4759487/', thumbnailUrl: 'https://images.pexels.com/videos/4759487/pexels-photo-4759487.jpeg?auto=compress&cs=tinysrgb&w=300', duration: 10 },
    { id: 'stock-7', name: 'Abstract Lights', type: 'image', url: 'https://images.pexels.com/photos/1169754/pexels-photo-1169754.jpeg?auto=compress&cs=tinysrgb&w=1280', thumbnailUrl: 'https://images.pexels.com/photos/1169754/pexels-photo-1169754.jpeg?auto=compress&cs=tinysrgb&w=300', duration: 5 },
    { id: 'stock-8', name: 'Flower Close-up', type: 'image', url: 'https://images.pexels.com/photos/56866/garden-rose-red-pink-56866.jpeg?auto=compress&cs=tinysrgb&w=1280', thumbnailUrl: 'https://images.pexels.com/photos/56866/garden-rose-red-pink-56866.jpeg?auto=compress&cs=tinysrgb&w=300', duration: 5 },
    { id: 'stock-9', name: 'Technology', type: 'image', url: 'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=1280', thumbnailUrl: 'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=300', duration: 5 },
    { id: 'stock-10', name: 'Coffee Beans', type: 'image', url: 'https://images.pexels.com/photos/585753/pexels-photo-585753.jpeg?auto=compress&cs=tinysrgb&w=1280', thumbnailUrl: 'https://images.pexels.com/photos/585753/pexels-photo-585753.jpeg?auto=compress&cs=tinysrgb&w=300', duration: 5 },
];

export const uid = () => Math.random().toString(36).slice(2, 9);

export const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
};

export const EFFECTS = [
    { name: 'None', filter: 'none' },
    { name: 'B&W', filter: 'grayscale(1)' },
    { name: 'Warm', filter: 'sepia(0.35) saturate(1.3)' },
    { name: 'Cool', filter: 'hue-rotate(200deg) saturate(0.8)' },
    { name: 'Vivid', filter: 'saturate(2) contrast(1.15)' },
    { name: 'Fade Out', filter: 'brightness(1.3) contrast(0.7)' },
    { name: 'Vignette', filter: 'contrast(1.15) brightness(0.9)' },
    { name: 'Sharpen', filter: 'contrast(1.4) brightness(1.05)' },
];
