/**
 * Video editor edit state - persisted to localStorage
 */
export interface VideoEditState {
    trimStart: number;
    trimEnd: number;
    brightness: number;
    contrast: number;
    saturation: number;
    temperature: number;
    tint: number;
    highlights: number;
    shadows: number;
    sharpness: number;
    speed: number;
    volume: number;
    muted: boolean;
    textOverlay?: string;
    filter?: 'none' | 'grayscale' | 'sepia' | 'vintage';
    effect?: 'none' | 'blur' | 'invert';
    fadeIn?: boolean;
    fadeOut?: boolean;
}

export const DEFAULT_EDIT_STATE: VideoEditState = {
    trimStart: 0,
    trimEnd: -1,
    brightness: 1,
    contrast: 1,
    saturation: 1,
    temperature: 0,
    tint: 0,
    highlights: 0,
    shadows: 0,
    sharpness: 0,
    speed: 1,
    volume: 1,
    muted: false,
    filter: 'none',
    effect: 'none',
    fadeIn: false,
    fadeOut: false,
};

const STORAGE_KEY = 'video_editor_project';

export function loadEditState(fileName: string): VideoEditState | null {
    try {
        const raw = localStorage.getItem(`${STORAGE_KEY}_${fileName}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<VideoEditState>;
        return { ...DEFAULT_EDIT_STATE, ...parsed };
    } catch {
        return null;
    }
}

export function saveEditState(fileName: string, state: VideoEditState): void {
    try {
        localStorage.setItem(`${STORAGE_KEY}_${fileName}`, JSON.stringify(state));
    } catch {
        // ignore quota errors
    }
}
