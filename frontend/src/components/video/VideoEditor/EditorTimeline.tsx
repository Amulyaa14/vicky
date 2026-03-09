/**
 * Bottom timeline - Video thumbnails, trim handles, audio track.
 * Supports drag-drop clips, text and effects tracks.
 */
import React from 'react';
import { Type, Music, Scissors, ZoomIn, ZoomOut } from 'lucide-react';

interface EditorTimelineProps {
    videoUrl: string;
    duration: number;
    trimStart: number;
    trimEnd: number;
    onTrimChange: (start: number, end: number) => void;
}

const EditorTimeline: React.FC<EditorTimelineProps> = ({
    videoUrl,
    duration,
    trimStart,
    trimEnd,
    onTrimChange,
}) => {
    const formatTime = (t: number) => `${Math.floor(t)}s`;
    const thumbCount = Math.min(12, Math.max(4, Math.floor(duration / 0.5)));

    const handleStartDrag = (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startVal = trimStart;
        const onMove = (ev: MouseEvent) => {
            const dx = ev.clientX - startX;
            const scale = duration / 400;
            const newStart = Math.max(0, Math.min(trimEnd - 0.5, startVal + dx * scale));
            onTrimChange(newStart, trimEnd);
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const handleEndDrag = (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startVal = trimEnd;
        const onMove = (ev: MouseEvent) => {
            const dx = ev.clientX - startX;
            const scale = duration / 400;
            const newEnd = Math.min(duration, Math.max(trimStart + 0.5, startVal + dx * scale));
            onTrimChange(trimStart, newEnd);
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const leftPercent = duration > 0 ? (trimStart / duration) * 100 : 0;
    const widthPercent = duration > 0 ? ((trimEnd - trimStart) / duration) * 100 : 100;

    return (
        <div className="h-48 lg:h-56 bg-[#111111] border-t border-white/10 flex flex-col shrink-0">
            {/* Timeline toolbar */}
            <div className="h-8 bg-[#1a1a1a] border-b border-white/5 flex items-center justify-between px-3">
                <div className="flex items-center gap-2">
                    <button className="p-1.5 hover:bg-white/10 rounded" title="Split">
                        <Scissors size={14} />
                    </button>
                    <button className="p-1.5 hover:bg-white/10 rounded" title="Zoom in">
                        <ZoomIn size={14} />
                    </button>
                    <button className="p-1.5 hover:bg-white/10 rounded" title="Zoom out">
                        <ZoomOut size={14} />
                    </button>
                </div>
                {/* Time ruler */}
                <div className="flex gap-4 text-[10px] text-white/40">
                    {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
                        <span key={i}>{formatTime(i)}</span>
                    ))}
                </div>
            </div>

            {/* Tracks */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-3 space-y-3">
                {/* Text track */}
                <div className="relative h-10 bg-white/5 rounded-md border border-white/5 flex items-center px-4">
                    <Type size={12} className="text-purple-400 mr-2 shrink-0" />
                    <span className="text-[10px] text-white/40">Add text</span>
                </div>

                {/* Video track - thumbnails with trim handles */}
                <div className="relative h-14 flex items-center">
                    <div className="flex-1 relative h-full bg-purple-600/20 rounded-md border border-purple-500/30 overflow-hidden">
                        <div className="absolute inset-0 flex">
                            {Array.from({ length: thumbCount }).map((_, i) => (
                                <div
                                    key={i}
                                    className="h-full flex-1 min-w-[40px] border-r border-white/5 overflow-hidden shrink-0"
                                >
                                    <video
                                        src={videoUrl}
                                        className="w-full h-full object-cover opacity-90"
                                        muted
                                        preload="metadata"
                                    />
                                </div>
                            ))}
                        </div>
                        {/* Trim handles overlay */}
                        <div
                            className="absolute inset-y-0 bg-purple-500/40 rounded-md border border-purple-400"
                            style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                        >
                            <div
                                className="absolute left-0 top-0 bottom-0 w-2 bg-purple-400 cursor-ew-resize hover:bg-white rounded-l"
                                onMouseDown={handleStartDrag}
                            />
                            <div
                                className="absolute right-0 top-0 bottom-0 w-2 bg-purple-400 cursor-ew-resize hover:bg-white rounded-r"
                                onMouseDown={handleEndDrag}
                            />
                        </div>
                    </div>
                </div>

                {/* Audio track */}
                <div className="relative h-10 bg-white/5 rounded-md border border-white/5 flex items-center px-4">
                    <Music size={12} className="text-blue-400 mr-2 shrink-0" />
                    <span className="text-[10px] text-white/40">Add audio</span>
                    <div className="flex-1 h-6 mx-4 bg-white/5 rounded flex items-center justify-center">
                        <div className="flex gap-0.5 h-2">
                            {[0.4, 0.6, 0.3, 0.8, 0.5, 0.7, 0.4, 0.9, 0.6, 0.5, 0.7, 0.4, 0.8, 0.5, 0.6, 0.4, 0.7, 0.5, 0.6, 0.4].map((h, i) => (
                                <div
                                    key={i}
                                    className="w-1 bg-blue-500/50 rounded-full"
                                    style={{ height: `${h * 100}%` }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditorTimeline;
