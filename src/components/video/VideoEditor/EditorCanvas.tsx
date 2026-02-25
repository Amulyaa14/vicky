/**
 * Center workspace - Video preview and editing canvas.
 * Play, pause, timeline preview, zoom/crop, duration display.
 */
import React, { useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Maximize } from 'lucide-react';

interface EditorCanvasProps {
    videoUrl: string;
    videoRef: React.Ref<HTMLVideoElement>;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    onPlayPause: () => void;
    onRewind?: () => void;
    onForward?: () => void;
    /** Real-time preview: brightness, contrast, filter, etc */
    brightness?: number;
    contrast?: number;
    saturation?: number;
    temperature?: number;
    tint?: number;
    highlights?: number;
    shadows?: number;
    sharpness?: number;
    speed?: number;
    filter?: string;
    textOverlay?: string;
    effect?: string;
    fadeIn?: boolean;
    fadeOut?: boolean;
}

const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 100);
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

const getFilterCss = (
    filter = 'none', effect = 'none',
    brightness = 1, contrast = 1, saturation = 1,
    temperature = 0, tint = 0, highlights = 0, shadows = 0, sharpness = 0
): string => {
    let f = '';
    if (filter === 'grayscale') f += 'grayscale(100%) ';
    else if (filter === 'sepia') f += 'sepia(100%) ';
    else if (filter === 'vintage') f += 'sepia(50%) contrast(1.1) ';

    if (effect === 'blur') f += 'blur(4px) ';
    else if (effect === 'invert') f += 'invert(100%) ';

    f += `brightness(${brightness * 100}%) contrast(${contrast * 100}%) saturate(${saturation * 100}%) `;

    if (temperature > 0) f += `sepia(${temperature * 0.5}%) hue-rotate(-${temperature * 0.15}deg) `;
    else if (temperature < 0) f += `sepia(${Math.abs(temperature) * 0.3}%) hue-rotate(${180 + Math.abs(temperature) * 0.5}deg) saturate(110%) `;

    if (tint !== 0) f += `hue-rotate(${tint}deg) `;
    if (shadows > 0) f += `brightness(${100 + shadows * 0.2}%) contrast(${100 - shadows * 0.1}%) `;
    else if (shadows < 0) f += `brightness(${100 + shadows * 0.2}%) contrast(${100 - shadows * 0.1}%) `;
    if (highlights > 0) f += `brightness(${100 + highlights * 0.2}%) saturate(${100 - highlights * 0.1}%) `;
    else if (highlights < 0) f += `brightness(${100 + highlights * 0.2}%) contrast(${100 + highlights * 0.1}%) `;
    if (sharpness > 0) f += `contrast(${100 + sharpness * 0.3}%) `;

    return f.trim() || 'none';
};

const EditorCanvas: React.FC<EditorCanvasProps> = ({
    videoUrl,
    videoRef,
    isPlaying,
    currentTime,
    duration,
    onPlayPause,
    onRewind,
    onForward,
    brightness = 1,
    contrast = 1,
    saturation = 1,
    temperature = 0,
    tint = 0,
    highlights = 0,
    shadows = 0,
    sharpness = 0,
    speed = 1,
    filter = 'none',
    textOverlay,
    effect = 'none',
    fadeIn = false,
    fadeOut = false,
}) => {
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    const filterStyle = getFilterCss(filter, effect, brightness, contrast, saturation, temperature, tint, highlights, shadows, sharpness);

    useEffect(() => {
        if (videoRef && 'current' in videoRef && videoRef.current) {
            videoRef.current.playbackRate = speed;
        }
    }, [speed, videoRef]);

    const getFadeOpacity = () => {
        if (fadeIn && currentTime < 2) return 1 - (currentTime / 2);
        if (fadeOut && duration > 0 && currentTime > duration - 2) return (currentTime - (duration - 2)) / 2;
        return 0;
    };

    return (
        <div className="flex-1 flex flex-col bg-[#0e0e0e] overflow-hidden min-w-0">
            {/* Video frame - resizable appearance */}
            <div className="flex-1 flex items-center justify-center p-4 relative group">
                <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden border border-white/10 ring-1 ring-purple-500/20 shadow-2xl resize">
                    {/* Resize handles (visual) */}
                    <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-purple-500/30 m-2 rounded opacity-0 group-hover:opacity-100 transition-opacity" />
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        className="w-full h-full object-contain"
                        style={{ filter: filterStyle }}
                        playsInline
                    />
                    {textOverlay && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 rounded-lg text-white text-lg font-bold whitespace-nowrap">
                            {textOverlay}
                        </div>
                    )}
                    {/* Fade overlay */}
                    {(fadeIn || fadeOut) && (
                        <div className="absolute inset-0 bg-black pointer-events-none" style={{ opacity: getFadeOpacity() }} />
                    )}
                    {/* Play overlay when paused */}
                    <button
                        onClick={onPlayPause}
                        className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
                    >
                        <div className="p-4 bg-purple-600 rounded-full shadow-xl hover:scale-110 transition-transform">
                            {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-0.5" />}
                        </div>
                    </button>
                </div>
            </div>

            {/* Player controls */}
            <div className="h-14 bg-[#141414] border-t border-white/5 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onRewind}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Rewind"
                    >
                        <SkipBack size={20} />
                    </button>
                    <button
                        onClick={onPlayPause}
                        className="p-2 bg-white text-black rounded-full hover:scale-110 transition-transform"
                        title={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                    </button>
                    <button
                        onClick={onForward}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Forward"
                    >
                        <SkipForward size={20} />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Loop">
                        <RotateCcw size={18} />
                    </button>
                </div>
                <div className="text-sm font-mono text-white/80">
                    <span className="text-purple-400">{formatTime(currentTime)}</span> / {formatTime(duration)}
                </div>
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Fullscreen">
                    <Maximize size={18} />
                </button>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-white/5">
                <div
                    className="h-full bg-purple-500 transition-all duration-150"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};

export default EditorCanvas;
