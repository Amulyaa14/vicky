/**
 * Video Editor - 3-panel layout with functional Save and Export.
 * Save: persists edit state to localStorage.
 * Export: processes video via FFmpeg and downloads.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Share2, Loader2, Save } from 'lucide-react';
import EditorLeftSidebar from './EditorLeftSidebar';
import EditorCanvas from './EditorCanvas';
import EditorTimeline from './EditorTimeline';
import EditorRightToolbar from './EditorRightToolbar';
import EditingControls from './EditingControls';
import ExportPanel from './ExportPanel';
import type { VideoEditState } from '../../../types/videoEditor';

export interface VideoEditorProps {
    videoUrl: string;
    fileName: string;
    file: File | null;
    editState: VideoEditState;
    onEditChange: (updates: Partial<VideoEditState>) => void;
    onSave: (state: VideoEditState) => void;
    onExport: (opts: { format: string; resolution: string }) => void;
    onDownload: () => void;
    onBack: () => void;
    engineReady: boolean;
    isExporting?: boolean;
    onReplaceMedia?: (file: File) => void;
    message?: string;
}

const VideoEditor: React.FC<VideoEditorProps> = ({
    videoUrl,
    fileName,
    editState,
    onEditChange,
    onSave,
    onExport,
    onDownload,
    onBack,
    engineReady,
    isExporting = false,
    onReplaceMedia,
    message,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [trimStart, setTrimStart] = useState(editState.trimStart);
    const [trimEnd, setTrimEnd] = useState(editState.trimEnd > 0 ? editState.trimEnd : 0);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [activeSidebar, setActiveSidebar] = useState('media');
    const [activeTool, setActiveTool] = useState('captions');

    // Sync trimEnd from duration when video loads (if no saved trim)
    useEffect(() => {
        if (duration > 0 && editState.trimEnd <= 0) setTrimEnd(duration);
    }, [duration, editState.trimEnd]);

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        const onMeta = () => {
            const d = v.duration;
            if (d && !isNaN(d)) {
                setDuration(d);
                if (trimEnd <= 0) setTrimEnd(d);
            }
        };
        const onTimeUpdate = () => setCurrentTime(v.currentTime);
        v.addEventListener('loadedmetadata', onMeta);
        v.addEventListener('timeupdate', onTimeUpdate);
        if (v.readyState >= 1 && v.duration) onMeta();
        return () => {
            v.removeEventListener('loadedmetadata', onMeta);
            v.removeEventListener('timeupdate', onTimeUpdate);
        };
    }, [videoUrl]);

    // Apply volume, muted, playback rate for real-time preview
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        v.volume = editState.muted ? 0 : editState.volume;
        v.muted = editState.muted;
        v.playbackRate = editState.speed;
    }, [editState.volume, editState.muted, editState.speed]);

    const handlePlayPause = useCallback(() => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    }, []);

    const handleRewind = useCallback(() => {
        if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 2);
        }
    }, []);

    const handleForward = useCallback(() => {
        if (videoRef.current) {
            videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 2);
        }
    }, []);

    const handleTrimChange = useCallback((start: number, end: number) => {
        setTrimStart(start);
        setTrimEnd(end);
        onEditChange({ trimStart: start, trimEnd: end });
    }, [onEditChange]);

    const handleSave = () => {
        setIsSaving(true);
        const state: VideoEditState = {
            ...editState,
            trimStart,
            trimEnd,
        };
        onSave(state);
        setIsSaving(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#0e0e0e] flex flex-col overflow-hidden text-white font-sans">
            {/* Top bar */}
            <div className="h-14 bg-[#1a1a1a] border-b border-white/5 flex items-center justify-between px-4 shrink-0">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
                    <ArrowLeft size={18} />
                    Back
                </button>
                <span className="text-sm text-gray-400 truncate max-w-[200px] hidden sm:inline">{fileName}</span>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg text-xs font-medium transition-colors">
                        <Share2 size={14} />
                        Share
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-bold transition-colors"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saveSuccess ? 'Saved!' : 'Save'}
                    </button>
                    <ExportPanel
                        onExport={onExport}
                        onDownload={onDownload}
                        disabled={!engineReady}
                        isExporting={isExporting}
                    />
                </div>
            </div>

            {/* Main layout */}
            <div className="flex-1 flex overflow-hidden min-h-0 relative">
                {/* Exporting Overlay */}
                {isExporting && (
                    <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center pointer-events-auto">
                        <Loader2 size={48} className="text-purple-500 animate-spin mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">Exporting Video...</h2>
                        <p className="text-gray-400 max-w-sm text-center">
                            {message || 'Please wait while we process your video. This may take a few minutes depending on the file size.'}
                        </p>
                    </div>
                )}

                <EditorLeftSidebar
                    activeSection={activeSidebar}
                    onSectionChange={setActiveSidebar}
                    onImportMedia={() => { }}
                    onReplaceMedia={onReplaceMedia}
                    onEditChange={onEditChange}
                />
                <EditorCanvas
                    videoUrl={videoUrl}
                    videoRef={videoRef}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    onPlayPause={handlePlayPause}
                    onRewind={handleRewind}
                    onForward={handleForward}
                    brightness={editState.brightness}
                    contrast={editState.contrast}
                    saturation={editState.saturation}
                    temperature={editState.temperature}
                    tint={editState.tint}
                    highlights={editState.highlights}
                    shadows={editState.shadows}
                    sharpness={editState.sharpness}
                    speed={editState.speed}
                    filter={editState.filter}
                    textOverlay={editState.textOverlay}
                    effect={editState.effect}
                    fadeIn={editState.fadeIn}
                    fadeOut={editState.fadeOut}
                />
                <EditorRightToolbar activeTool={activeTool} onToolChange={setActiveTool} />
                <EditingControls
                    activeTool={activeTool}
                    editState={editState}
                    onEditChange={onEditChange}
                />
            </div>

            <EditorTimeline
                videoUrl={videoUrl}
                duration={duration}
                trimStart={trimStart}
                trimEnd={trimEnd}
                onTrimChange={handleTrimChange}
            />
        </div>
    );
};

export default VideoEditor;
