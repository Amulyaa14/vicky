/**
 * VideoStudio.tsx — Production-ready video editing studio.
 * Features: My Media upload/management, Content Library (Pixabay),
 * Templates, Transitions (10 effects), Effects, Timeline, Export (FFmpeg.wasm).
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import {
    Play, Pause, Volume2, VolumeX, Upload, X, Plus, Film,
    Scissors, Wand2, Download, Trash2,
    Layers, Eye, Search, Loader2, Music, GripVertical,
    Sliders, RotateCcw, Undo2, Redo2, FolderOpen,
    LayoutTemplate, ArrowLeftRight
} from 'lucide-react';
import { useMediaStore } from './studio/useMediaStore';
import { useContentLibrary } from './studio/useContentLibrary';
import { useExport } from './studio/useExport';
import type { ExportSettings } from './studio/useExport';
import type { Clip, TransitionItem, MediaItem, ClipAdjustments } from './studio/types';
import {
    TRANSITION_TYPES, CLIP_COLORS, TEMPLATES, EFFECTS,
    FALLBACK_STOCK_ASSETS, uid, fmt, DEFAULT_ADJUSTMENTS,
} from './studio/types';

/* ───────────────────────── COMPONENT ───────────────────────── */
const VideoStudio: React.FC = () => {
    /* ─── media store ─── */
    const media = useMediaStore();
    const library = useContentLibrary();
    const exporter = useExport();

    /* ─── player state ─── */
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

    /* ─── left panel ─── */
    type LeftTab = 'media' | 'library' | 'templates' | 'transitions';
    const [leftTab, setLeftTab] = useState<LeftTab>('media');
    const [libraryQuery, setLibraryQuery] = useState('');
    const [libraryType, setLibraryType] = useState<'image' | 'video'>('video');
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    /* ─── right panel ─── */
    const [rightTab, setRightTab] = useState<'properties' | 'adjust'>('properties');

    /* ─── template / effect ─── */
    const [activeEffect, setActiveEffect] = useState(0);
    const [showEffects, setShowEffects] = useState(false);
    const [fadeIn, setFadeIn] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);

    /* ─── timeline ─── */
    const [clips, setClips] = useState<Clip[]>([]);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [transitions, setTransitions] = useState<TransitionItem[]>([]);
    const [transitionPicker, setTransitionPicker] = useState<string | null>(null);
    const [dragOverTimeline, setDragOverTimeline] = useState(false);

    /* ─── export modal ─── */
    const [exportOpen, setExportOpen] = useState(false);
    const [exportSettings, setExportSettings] = useState<ExportSettings>({
        resolution: '1080p', fps: 30, format: 'mp4',
        quality: 'high', aspectRatio: '16:9',
    });

    /* ─── toast ─── */
    const [toast, setToast] = useState<string | null>(null);
    const showToast = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    }, []);

    /* ─── mobile panel state ─── */
    const [showLeftPanel, setShowLeftPanel] = useState(false);

    /* ─── file input refs ─── */
    const fileInputRef = useRef<HTMLInputElement>(null);

    const selectedClip = clips.find(c => c.id === selectedClipId) || null;

    /* ─── video event handlers ─── */
    const togglePlay = useCallback(() => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) { v.play(); setIsPlaying(true); }
        else { v.pause(); setIsPlaying(false); }
    }, []);

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        const onTime = () => setCurrentTime(v.currentTime);
        const onMeta = () => setDuration(v.duration || 0);
        const onEnd = () => setIsPlaying(false);
        v.addEventListener('timeupdate', onTime);
        v.addEventListener('loadedmetadata', onMeta);
        v.addEventListener('ended', onEnd);
        return () => {
            v.removeEventListener('timeupdate', onTime);
            v.removeEventListener('loadedmetadata', onMeta);
            v.removeEventListener('ended', onEnd);
        };
    }, [activeVideoUrl]);

    useEffect(() => {
        if (videoRef.current && selectedClip) {
            videoRef.current.playbackRate = selectedClip.speed || 1;
        }
    }, [selectedClip?.id, selectedClip?.speed]);

    const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const t = parseFloat(e.target.value);
        if (videoRef.current) { videoRef.current.currentTime = t; setCurrentTime(t); }
    };

    const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = parseFloat(e.target.value);
        setVolume(v);
        if (videoRef.current) videoRef.current.volume = v;
    };

    /* ─── uploads ─── */
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        await media.addFiles(e.target.files);
        e.target.value = '';
        showToast('Media added successfully!');
    };

    /* ─── add media to timeline ─── */
    const addToTimeline = useCallback((item: MediaItem) => {
        const clip: Clip = {
            id: uid(), label: item.name.replace(/\.[^/.]+$/, ''),
            duration: item.duration, startTrim: 0, endTrim: item.duration,
            type: item.type === 'audio' ? 'audio' : item.type,
            color: CLIP_COLORS[clips.length % CLIP_COLORS.length],
            src: item.url, thumbnailUrl: item.thumbnailUrl,
        };
        setClips(p => [...p, clip]);
        if (item.type === 'video' && item.url) setActiveVideoUrl(item.url);
        showToast(`Added "${item.name}" to timeline`);
    }, [clips.length, showToast]);

    /* ─── drag & drop ─── */
    const handleDragStart = (e: React.DragEvent, item: MediaItem) => {
        e.dataTransfer.setData('application/json', JSON.stringify(item));
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleTimelineDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOverTimeline(false);
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json')) as MediaItem;
            addToTimeline(data);
        } catch { /* not a media item drag */ }
    };

    const handleTimelineDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOverTimeline(true);
    };

    /* ─── clip actions ─── */
    const deleteClip = (id: string) => {
        setClips(p => p.filter(c => c.id !== id));
        setTransitions(p => p.filter(t => t.afterClipId !== id));
        if (selectedClipId === id) setSelectedClipId(null);
    };

    const updateClipTrim = (id: string, startTrim: number, endTrim: number) => {
        setClips(p => p.map(c => c.id === id ? { ...c, startTrim, endTrim } : c));
    };

    const updateClipAdjustment = (id: string, key: keyof ClipAdjustments, value: number) => {
        setClips(p => p.map(c => {
            if (c.id !== id) return c;
            const adj = c.adjustments || { ...DEFAULT_ADJUSTMENTS };
            return { ...c, adjustments: { ...adj, [key]: value } };
        }));
    };

    const updateClipSpeed = (id: string, speed: number) => {
        setClips(p => p.map(c => c.id === id ? { ...c, speed } : c));
        if (selectedClipId === id && videoRef.current) {
            videoRef.current.playbackRate = speed;
        }
    };

    const resetAdjustments = (id: string) => {
        setClips(p => p.map(c => c.id === id ? { ...c, adjustments: { ...DEFAULT_ADJUSTMENTS }, speed: 1 } : c));
        if (selectedClipId === id && videoRef.current) {
            videoRef.current.playbackRate = 1;
        }
    };

    /* ─── transitions ─── */
    const setTransition = (afterId: string, type: string, dur: number) => {
        setTransitions(p => {
            const without = p.filter(t => t.afterClipId !== afterId);
            return [...without, { afterClipId: afterId, type, duration: dur }];
        });
        setTransitionPicker(null);
    };

    /* ─── templates ─── */
    const loadTemplate = (tpl: (typeof TEMPLATES)[0]) => {
        const newClips: Clip[] = tpl.clips.map((c) => ({
            id: uid(), label: c.label, duration: c.duration,
            startTrim: 0, endTrim: c.duration, type: 'placeholder' as const,
            color: c.color, textOverlay: c.textOverlay, background: c.background,
        }));
        const newTransitions: TransitionItem[] = tpl.transitions.map(t => ({
            afterClipId: newClips[t.afterIndex].id,
            type: t.type, duration: t.duration,
        }));
        setClips(newClips);
        setTransitions(newTransitions);
        showToast(`Loaded "${tpl.name}" template`);
    };

    /* ─── library search ─── */
    const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
    const handleLibrarySearch = (q: string) => {
        setLibraryQuery(q);
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => {
            if (q.trim().length >= 2) library.search(q, libraryType);
        }, 400);
    };

    const handleLibraryDownload = async (item: typeof library.results[0]) => {
        setDownloadingId(item.id);
        try {
            const mediaItem = await library.downloadToMedia(item);
            media.addMediaItem(mediaItem);
            showToast(`Downloaded "${item.name}" to My Media`);
        } catch {
            showToast('Download failed');
        }
        setDownloadingId(null);
    };

    /* ─── computed ─── */
    const videoFilter = (() => {
        let f = '';
        if (activeEffect > 0) f += EFFECTS[activeEffect].filter + ' ';
        if (selectedClip?.adjustments) {
            const adj = selectedClip.adjustments;
            f += `brightness(${adj.brightness}%) contrast(${adj.contrast}%) saturate(${adj.saturation}%) `;
            if (adj.temperature > 0) f += `sepia(${adj.temperature * 0.5}%) hue-rotate(-${adj.temperature * 0.15}deg) `;
            else if (adj.temperature < 0) f += `sepia(${Math.abs(adj.temperature) * 0.3}%) hue-rotate(${180 + Math.abs(adj.temperature) * 0.5}deg) saturate(110%) `;
            if (adj.tint !== 0) f += `hue-rotate(${adj.tint}deg) `;
            if (adj.shadows > 0) f += `brightness(${100 + adj.shadows * 0.2}%) contrast(${100 - adj.shadows * 0.1}%) `;
            else if (adj.shadows < 0) f += `brightness(${100 + adj.shadows * 0.2}%) contrast(${100 - adj.shadows * 0.1}%) `;
            if (adj.highlights > 0) f += `brightness(${100 + adj.highlights * 0.2}%) saturate(${100 - adj.highlights * 0.1}%) `;
            else if (adj.highlights < 0) f += `brightness(${100 + adj.highlights * 0.2}%) contrast(${100 + adj.highlights * 0.1}%) `;
            if (adj.sharpness > 0) f += `contrast(${100 + adj.sharpness * 0.3}%) `;
        }
        return f.trim() || 'none';
    })();

    const fadeClass = (() => {
        const c: string[] = [];
        if (fadeIn) c.push('animate-fadeIn');
        if (fadeOut) c.push('animate-fadeOut');
        return c.join(' ');
    })();

    /* ═════════════════════ RENDER ═════════════════════ */
    return (
        <>
            <Helmet>
                <title>Video Studio – QuickTools</title>
                <meta name="description" content="Professional browser-based video editor. Add clips, transitions, effects, and export in HD — no software needed." />
            </Helmet>

            {/* Mobile warning banner — hidden on md and above */}
            <div className="md:hidden flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm px-4 py-3 rounded-xl mx-4 mt-4">
                <span className="text-xl">⚠️</span>
                <p>Video Studio works best on a <strong>desktop browser</strong>. The editing layout may be cramped on small screens.</p>
            </div>
            <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

                {/* Inline keyframes */}
                <style>{`
        @keyframes kfFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes kfFadeOut { from { opacity: 1; } to { opacity: 0; } }
        .animate-fadeIn { animation: kfFadeIn 1.5s ease-in forwards; }
        .animate-fadeOut { animation: kfFadeOut 1.5s ease-out forwards; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #8b5cf6; cursor: pointer; border: 2px solid #c4b5fd; box-shadow: 0 0 6px rgba(139,92,246,0.4); }
        input[type=range] { -webkit-appearance: none; height: 3px; border-radius: 2px; background: #1e1e2e; outline: none; }
        input[type=range]::-webkit-slider-runnable-track { background: linear-gradient(90deg, #7c3aed 0%, #1e1e2e 100%); height: 3px; border-radius: 2px; }
        .scrollbar-thin::-webkit-scrollbar { height: 5px; width: 5px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: hsl(var(--muted)); border-radius: 3px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: hsl(var(--accent)); }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .studio-card { background: hsl(var(--card) / 0.8); border: 1px solid hsl(var(--border) / 0.3); backdrop-filter: blur(12px); }
      `}</style>

                {/* Hidden file input */}
                <input ref={fileInputRef} type="file" accept="video/*,image/*,audio/*" multiple className="hidden" onChange={handleFileUpload} />

                {/* ═══════ TOP TOOLBAR ═══════ */}
                <div className="h-12 bg-muted/30 border-b border-border/40 flex items-center justify-between shrink-0 z-20 px-3 sm:px-5 overflow-x-auto">
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                        <button onClick={() => setShowLeftPanel(!showLeftPanel)}
                            className="md:hidden p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground transition-colors shrink-0" title="Toggle panel">
                            <Layers size={16} />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                <Film size={14} className="text-white" />
                            </div>
                            <span className="font-bold text-sm text-white whitespace-nowrap tracking-wide">Studio</span>
                        </div>
                        <div className="hidden sm:flex items-center gap-1 ml-2 border-l border-border/60 pl-3">
                            <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Undo"><Undo2 size={15} /></button>
                            <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors" title="Redo"><Redo2 size={15} /></button>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
                        <button onClick={() => setShowEffects(!showEffects)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showEffects ? 'bg-primary/20 text-primary ring-1 ring-primary/30' : 'hover:bg-muted text-muted-foreground'}`}>
                            <Wand2 size={13} /> <span className="hidden sm:inline">Effects</span>
                        </button>
                        <button onClick={() => setFadeIn(!fadeIn)}
                            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${fadeIn ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30' : 'hover:bg-white/5 text-gray-400'}`}>
                            Fade In
                        </button>
                        <button onClick={() => setFadeOut(!fadeOut)}
                            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${fadeOut ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30' : 'hover:bg-white/5 text-gray-400'}`}>
                            Fade Out
                        </button>
                        <div className="w-px h-5 bg-border/60 mx-1 hidden sm:block" />
                        <button onClick={() => { setExportOpen(true); exporter.resetExport(); }}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-lg text-xs font-bold transition-all text-white whitespace-nowrap shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30">
                            <Download size={13} /> Export
                        </button>
                    </div>
                </div>

                {/* ═══════ MAIN AREA ═══════ */}
                <div className="flex flex-1 overflow-hidden min-h-0 relative">

                    {/* ──── LEFT PANEL ──── */}
                    {/* On mobile: absolute overlay, on md+: fixed sidebar */}
                    <div className={`
                    ${showLeftPanel ? 'flex' : 'hidden'} md:flex
                    flex-col w-[85vw] sm:w-72 md:w-72
                    bg-muted/10 border-r border-border/40 shrink-0
                    absolute md:relative z-30 top-0 left-0 h-full md:h-auto
                `}>
                        {/* tabs */}
                        <div className="flex border-b border-border/40 shrink-0">
                            {([['media', 'My Media', FolderOpen], ['library', 'Library', Search], ['templates', 'Templates', LayoutTemplate], ['transitions', 'Transitions', ArrowLeftRight]] as const).map(([key, label, Icon]) => (
                                <button key={key} onClick={() => setLeftTab(key as LeftTab)}
                                    className={`flex-1 py-2.5 text-[10px] font-semibold tracking-wide transition-all flex flex-col items-center gap-1 ${leftTab === key ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                                    <Icon size={13} />
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
                            {/* ─── MY MEDIA TAB ─── */}
                            {leftTab === 'media' && (
                                <>
                                    <button onClick={() => fileInputRef.current?.click()}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600/20 to-purple-600/20 hover:from-violet-600/30 hover:to-purple-600/30 text-violet-300 border border-violet-500/20 rounded-xl text-xs font-semibold transition-all hover:shadow-lg hover:shadow-violet-500/5">
                                        <Upload size={14} /> Upload Media
                                    </button>
                                    {media.isUploading && (
                                        <div className="flex items-center gap-2 text-xs text-violet-400">
                                            <Loader2 size={14} className="animate-spin" /> Processing...
                                        </div>
                                    )}
                                    {media.error && (
                                        <div className="text-xs text-red-400 bg-red-900/20 px-3 py-2 rounded-lg border border-red-500/20">
                                            {media.error}
                                            <button onClick={media.clearError} className="ml-2 text-red-300 underline">dismiss</button>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {media.mediaItems.map(item => (
                                            <div key={item.id}
                                                draggable
                                                onDragStart={e => handleDragStart(e, item)}
                                                onClick={() => {
                                                    if (item.type === 'video') setActiveVideoUrl(item.url);
                                                    addToTimeline(item);
                                                }}
                                                className="group relative aspect-video rounded-xl overflow-hidden border border-border/40 cursor-grab hover:ring-2 ring-primary/60 transition-all bg-muted/20 hover:bg-muted/40">
                                                {item.thumbnailUrl ? (
                                                    <img src={item.thumbnailUrl} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        {item.type === 'audio' ? <Music size={24} className="text-blue-400" /> : <Film size={24} className="text-gray-600" />}
                                                    </div>
                                                )}
                                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                                                    <p className="text-[9px] font-bold text-white truncate">{item.name}</p>
                                                    <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${item.type === 'video' ? 'bg-violet-600/60 text-violet-200' : item.type === 'audio' ? 'bg-blue-600/60 text-blue-200' : 'bg-pink-600/60 text-pink-200'}`}>
                                                        {item.type.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <GripVertical size={14} className="text-white/60" />
                                                </div>
                                                <button onClick={e => { e.stopPropagation(); media.removeMedia(item.id); }}
                                                    className="absolute top-1 right-1 w-5 h-5 bg-red-600/80 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    {media.mediaItems.length === 0 && !media.isUploading && (
                                        <div className="text-center pt-8 space-y-2">
                                            <Upload size={32} className="mx-auto text-gray-700" />
                                            <p className="text-[10px] text-gray-600">Upload videos, images, or audio files</p>
                                            <p className="text-[9px] text-gray-700">Drag & drop to timeline</p>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* ─── CONTENT LIBRARY TAB ─── */}
                            {leftTab === 'library' && (
                                <>
                                    {library.hasApiKey ? (
                                        <>
                                            <div className="relative">
                                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                                <input type="text" value={libraryQuery} onChange={e => handleLibrarySearch(e.target.value)}
                                                    placeholder="Search stock assets..."
                                                    className="w-full bg-muted/20 border border-border/40 rounded-lg pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                                            </div>
                                            <div className="flex gap-1">
                                                {(['video', 'image'] as const).map(t => (
                                                    <button key={t} onClick={() => { setLibraryType(t); if (libraryQuery.trim()) library.search(libraryQuery, t); }}
                                                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${libraryType === t ? 'bg-primary text-primary-foreground' : 'bg-muted/20 text-muted-foreground hover:bg-muted/40'}`}>
                                                        {t === 'video' ? '🎬 Videos' : '🖼️ Images'}
                                                    </button>
                                                ))}
                                            </div>
                                            {library.isSearching && (
                                                <div className="flex items-center justify-center py-8">
                                                    <Loader2 size={20} className="animate-spin text-violet-400" />
                                                </div>
                                            )}
                                            {library.searchError && (
                                                <p className="text-xs text-red-400 text-center py-4">{library.searchError}</p>
                                            )}
                                            <div className="grid grid-cols-2 gap-2">
                                                {library.results.map(item => (
                                                    <button key={item.id} onClick={() => handleLibraryDownload(item)}
                                                        disabled={downloadingId === item.id}
                                                        className="relative aspect-video rounded-lg overflow-hidden border border-border/40 hover:ring-2 ring-primary transition-all group">
                                                        <img src={item.thumbnailUrl} alt={item.name} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            {downloadingId === item.id ? <Loader2 size={18} className="animate-spin text-white" /> : <Plus size={18} className="text-white" />}
                                                        </div>
                                                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                                                            <p className="text-[8px] text-white truncate">{item.name}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                            {!library.isSearching && library.results.length === 0 && libraryQuery.length >= 2 && (
                                                <p className="text-[10px] text-gray-600 text-center pt-4">No results found</p>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/10 border border-amber-500/20 rounded-xl p-3.5 mb-3">
                                                <p className="text-[11px] text-amber-300 font-bold flex items-center gap-1.5">⚠️ API Key Required</p>
                                                <p className="text-[10px] text-amber-400/60 mt-1.5 leading-relaxed">Get a free key from <b>pixabay.com/api/docs</b> and add <code className="bg-white/5 px-1 rounded text-amber-300">VITE_PIXABAY_API_KEY</code> to your .env file.</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {FALLBACK_STOCK_ASSETS.map(item => (
                                                    <button key={item.id} onClick={() => {
                                                        const mi: MediaItem = { ...item, file: undefined };
                                                        media.addMediaItem(mi);
                                                        showToast(`Added "${item.name}" to My Media`);
                                                    }}
                                                        className="relative aspect-video rounded-lg overflow-hidden border border-white/10 hover:ring-2 ring-violet-500 transition-all group">
                                                        <img src={item.thumbnailUrl} alt={item.name} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Plus size={18} className="text-white" />
                                                        </div>
                                                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                                                            <p className="text-[8px] text-white truncate font-bold">{item.name}</p>
                                                            <span className={`text-[7px] font-bold px-1 py-0.5 rounded ${item.type === 'video' ? 'bg-violet-600/60' : 'bg-pink-600/60'}`}>
                                                                {item.type.toUpperCase()}
                                                            </span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </>
                            )}

                            {/* ─── TEMPLATES TAB ─── */}
                            {leftTab === 'templates' && (
                                <div className="space-y-2">
                                    {TEMPLATES.map((tpl, i) => (
                                        <button key={i} onClick={() => loadTemplate(tpl)}
                                            className="w-full p-3 rounded-lg text-left text-xs transition-all border border-border/40 bg-muted/20 hover:bg-primary/10 hover:border-primary/30 group">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="text-lg">{tpl.emoji}</span>
                                                <span className="font-bold text-foreground">{tpl.name}</span>
                                                <span className="ml-auto text-[9px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">{tpl.aspect}</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">{tpl.category} · {tpl.clips.length} clips · {tpl.duration}s</p>
                                            <div className="flex gap-1 mt-2">
                                                {tpl.clips.map((c, j) => (
                                                    <div key={j} className="h-2 rounded-full flex-1" style={{ background: c.color, opacity: 0.6 }} />
                                                ))}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* ─── TRANSITIONS TAB ─── */}
                            {leftTab === 'transitions' && (
                                <div className="space-y-2">
                                    <p className="text-[10px] text-gray-500 mb-2">Click "+" between clips on the timeline to add a transition, or drag from here.</p>
                                    {TRANSITION_TYPES.map(tr => (
                                        <div key={tr.name}
                                            className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 border border-border/40 hover:bg-muted/40 transition-colors">
                                            <span className="text-xl w-8 text-center">{tr.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-foreground">{tr.name}</p>
                                                <p className="text-[9px] text-muted-foreground">{tr.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ──── CENTER: PREVIEW + EFFECTS ──── */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* Effects bar */}
                        {showEffects && (
                            <div className="bg-muted/30 border-b border-border/40 px-4 py-2.5 flex gap-1.5 flex-wrap shrink-0">
                                {EFFECTS.map((fx, i) => (
                                    <button key={i} onClick={() => setActiveEffect(i)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${activeEffect === i ? 'bg-primary/20 text-primary ring-1 ring-primary/30 shadow-sm shadow-primary/10' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
                                        {fx.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Video preview */}
                        <div className="flex-1 flex items-center justify-center bg-muted/20 relative overflow-hidden">
                            {/* Subtle background pattern */}
                            <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
                            {activeVideoUrl ? (
                                <div className={`relative w-full max-w-3xl aspect-video ${fadeClass}`}>
                                    <video ref={videoRef} src={activeVideoUrl}
                                        className="w-full h-full object-contain rounded-xl shadow-2xl shadow-black/50"
                                        style={{ filter: videoFilter }} playsInline onClick={togglePlay} />
                                    {!isPlaying && (
                                        <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center group">
                                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-2xl shadow-primary/30 group-hover:shadow-primary/50">
                                                <Play size={26} fill="currentColor" className="text-primary-foreground ml-1" />
                                            </div>
                                        </button>
                                    )}
                                    {EFFECTS[activeEffect].name === 'Vignette' && (
                                        <div className="absolute inset-0 rounded-xl pointer-events-none"
                                            style={{ boxShadow: 'inset 0 0 120px 40px rgba(0,0,0,0.7)' }} />
                                    )}
                                </div>
                            ) : (
                                <div className="text-center space-y-5 relative">
                                    <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-violet-600/20 to-purple-600/10 flex items-center justify-center border border-violet-500/10">
                                        <Film size={36} className="text-violet-500/60" />
                                    </div>
                                    <div>
                                        <p className="text-white/60 text-sm font-medium">Upload media or load a template</p>
                                        <p className="text-gray-600 text-xs mt-1">Drag files here or use the panel on the left</p>
                                    </div>
                                    <button onClick={() => { setLeftTab('media'); fileInputRef.current?.click(); }}
                                        className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl text-xs font-bold transition-all shadow-lg shadow-violet-500/20">
                                        <Upload size={14} className="inline mr-2" />Upload Media
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Player controls */}
                        <div className="bg-muted/30 border-t border-border/40 px-4 py-2 flex items-center gap-3 shrink-0">
                            <button onClick={togglePlay} className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                                {isPlaying ? <Pause size={17} /> : <Play size={17} />}
                            </button>
                            <span className="text-[10px] font-medium text-muted-foreground w-24 tabular-nums">{fmt(currentTime)} / {fmt(duration)}</span>
                            <input type="range" min={0} max={duration || 1} step={0.01} value={currentTime} onChange={seek} className="flex-1" />
                            <button onClick={() => setMuted(!muted)} className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                                {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                            </button>
                            <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={changeVolume} className="w-20" />
                        </div>
                    </div>

                    {/* ──── RIGHT PANEL: CLIP PROPERTIES ──── */}
                    <div className="w-64 bg-muted/10 border-l border-border/40 flex flex-col shrink-0 overflow-y-auto">
                        <div className="flex border-b border-border/40 shrink-0">
                            {([['properties', 'Properties'], ['adjust', 'Adjust']] as const).map(([key, label]) => (
                                <button key={key} onClick={() => setRightTab(key as 'properties' | 'adjust')}
                                    className={`flex-1 py-3 text-[10px] font-semibold tracking-wide transition-all ${rightTab === key ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'}`}>
                                    {label === 'Properties' ? <Eye size={11} className="inline mr-1" /> : <Sliders size={11} className="inline mr-1" />}
                                    {label}
                                </button>
                            ))}
                        </div>
                        {selectedClip ? (
                            <div className="p-4 space-y-4">
                                {rightTab === 'properties' ? (
                                    <>
                                        <div>
                                            <label className="text-[10px] text-muted-foreground block mb-1">Clip Name</label>
                                            <p className="text-xs font-bold text-foreground truncate">{selectedClip.label}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-muted-foreground block mb-1">Type</label>
                                            <p className="text-xs text-primary capitalize">{selectedClip.type}</p>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <label className="text-[10px] text-muted-foreground block mb-0.5">Duration</label>
                                                <p className="text-xs text-foreground">{fmt(selectedClip.endTrim - selectedClip.startTrim)}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                                                <span>Speed ({selectedClip.speed || 1}x)</span>
                                                {selectedClip.speed !== 1 && <button onClick={() => updateClipSpeed(selectedClip.id, 1)} className="text-primary hover:text-primary/80">Reset</button>}
                                            </div>
                                            <input type="range" min={0.25} max={4} step={0.25} value={selectedClip.speed || 1}
                                                onChange={e => updateClipSpeed(selectedClip.id, parseFloat(e.target.value))} className="w-full" />
                                        </div>

                                        <div>
                                            <label className="text-[10px] text-muted-foreground block mb-1">Trim Start ({fmt(selectedClip.startTrim)})</label>
                                            <input type="range" min={0} max={selectedClip.duration} step={0.1} value={selectedClip.startTrim}
                                                onChange={e => updateClipTrim(selectedClip.id, parseFloat(e.target.value), selectedClip.endTrim)} className="w-full" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-muted-foreground block mb-1">Trim End ({fmt(selectedClip.endTrim)})</label>
                                            <input type="range" min={0} max={selectedClip.duration} step={0.1} value={selectedClip.endTrim}
                                                onChange={e => updateClipTrim(selectedClip.id, selectedClip.startTrim, parseFloat(e.target.value))} className="w-full" />
                                        </div>
                                        <button onClick={() => deleteClip(selectedClip.id)}
                                            className="w-full flex items-center justify-center gap-2 py-2 mt-4 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold transition-colors">
                                            <Trash2 size={14} /> Delete Clip
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-foreground/80">Color Adjust</span>
                                            <button onClick={() => resetAdjustments(selectedClip.id)} className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 bg-muted/20 hover:bg-muted/40 px-2 py-1 rounded-lg transition-colors">
                                                <RotateCcw size={10} /> Reset
                                            </button>
                                        </div>
                                        <div className="space-y-3 pb-8">
                                            {[
                                                { label: 'Brightness', key: 'brightness', min: 0, max: 200, default: 100 },
                                                { label: 'Contrast', key: 'contrast', min: 0, max: 200, default: 100 },
                                                { label: 'Saturation', key: 'saturation', min: 0, max: 200, default: 100 },
                                                { label: 'Temperature', key: 'temperature', min: -100, max: 100, default: 0 },
                                                { label: 'Tint', key: 'tint', min: -100, max: 100, default: 0 },
                                                { label: 'Highlights', key: 'highlights', min: -100, max: 100, default: 0 },
                                                { label: 'Shadows', key: 'shadows', min: -100, max: 100, default: 0 },
                                                { label: 'Sharpness', key: 'sharpness', min: 0, max: 100, default: 0 },
                                            ].map(adj => {
                                                const cAdj = selectedClip.adjustments || DEFAULT_ADJUSTMENTS;
                                                const val = cAdj[adj.key as keyof ClipAdjustments];
                                                return (
                                                    <div key={adj.key} className="space-y-0.5">
                                                        <div className="flex justify-between text-[10px]">
                                                            <span className="text-muted-foreground">{adj.label}</span>
                                                            <span className="text-primary font-mono">{val}</span>
                                                        </div>
                                                        <input type="range" min={adj.min} max={adj.max} step={1} value={val}
                                                            onChange={e => updateClipAdjustment(selectedClip.id, adj.key as keyof ClipAdjustments, parseFloat(e.target.value))}
                                                            className="w-full"
                                                        />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-center p-4">
                                <div>
                                    <Layers size={28} className="mx-auto text-muted-foreground/30 mb-2" />
                                    <p className="text-[10px] text-muted-foreground">Select a clip on the timeline to view properties & adjustments</p>
                                </div>
                            </div>
                        )}
                        <div className="mt-auto p-3 border-t border-border/40 space-y-2 shrink-0">
                            <div className="flex justify-between text-[10px]">
                                <span className="text-muted-foreground">Global Effect</span>
                                <span className="text-primary font-semibold">{EFFECTS[activeEffect].name}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                                <span className="text-muted-foreground">Clips</span>
                                <span className="text-primary font-semibold">{clips.length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══════ TIMELINE ═══════ */}
                <div className={`h-40 bg-muted/20 border-t flex flex-col shrink-0 transition-colors ${dragOverTimeline ? 'border-primary/50 bg-primary/10' : 'border-border/40'}`}
                    onDrop={handleTimelineDrop}
                    onDragOver={handleTimelineDragOver}
                    onDragLeave={() => setDragOverTimeline(false)}>
                    <div className="h-8 bg-muted/40 border-b border-border/40 flex items-center px-4 gap-3 shrink-0">
                        <Scissors size={12} className="text-muted-foreground" />
                        <span className="text-[10px] font-semibold text-muted-foreground tracking-wide">TIMELINE</span>
                        <div className="flex-1" />
                        <span className="text-[10px] text-muted-foreground/60 font-medium">{clips.length} clip{clips.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex-1 flex items-center overflow-x-auto scrollbar-thin px-4 gap-0">
                        {clips.length === 0 && (
                            <p className="text-[10px] text-muted-foreground/60 mx-auto">
                                {dragOverTimeline ? '📥 Drop here to add to timeline' : 'Add media from the left panel or drag & drop here'}
                            </p>
                        )}
                        {clips.map((clip, idx) => {
                            const w = Math.max(90, (clip.endTrim - clip.startTrim) * 20);
                            const trans = transitions.find(t => t.afterClipId === clip.id);
                            return (
                                <React.Fragment key={clip.id}>
                                    <div onClick={() => { setSelectedClipId(clip.id); if (clip.src) setActiveVideoUrl(clip.src); }}
                                        className={`relative h-[68px] rounded-xl flex flex-col justify-center px-3 cursor-pointer shrink-0 transition-all border-2 ${selectedClipId === clip.id ? 'border-violet-400 ring-1 ring-violet-500/30 shadow-lg shadow-violet-500/10' : 'border-transparent hover:border-white/10'}`}
                                        style={{ width: w, background: `linear-gradient(135deg, ${clip.color}22, ${clip.color}11)` }}>
                                        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-lg" style={{ background: clip.color }} />
                                        {clip.thumbnailUrl && (
                                            <img src={clip.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-30" />
                                        )}
                                        <span className="text-[10px] font-bold text-white truncate relative z-10">{clip.label}</span>
                                        <span className="text-[9px] text-gray-400 relative z-10">{fmt(clip.endTrim - clip.startTrim)}</span>
                                        {clip.textOverlay && (
                                            <span className="text-[8px] text-violet-300 font-semibold truncate relative z-10">✏️ {clip.textOverlay}</span>
                                        )}
                                        <button onClick={(e) => { e.stopPropagation(); deleteClip(clip.id); }}
                                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center shadow-lg transition-colors z-20">
                                            <X size={10} />
                                        </button>
                                    </div>

                                    {/* transition slot */}
                                    {idx < clips.length - 1 && (
                                        <div className="relative flex items-center justify-center w-10 shrink-0">
                                            {trans ? (
                                                <button onClick={() => setTransitionPicker(transitionPicker === clip.id ? null : clip.id)}
                                                    className="px-1.5 py-0.5 bg-blue-600/30 border border-blue-500/40 rounded text-[8px] font-bold text-blue-400 hover:bg-blue-600/50 transition-colors whitespace-nowrap">
                                                    {trans.type}
                                                </button>
                                            ) : (
                                                <button onClick={() => setTransitionPicker(transitionPicker === clip.id ? null : clip.id)}
                                                    className="w-6 h-6 bg-white/5 hover:bg-violet-600/30 border border-white/10 rounded-full flex items-center justify-center transition-colors">
                                                    <Plus size={10} className="text-gray-500" />
                                                </button>
                                            )}

                                            {/* transition picker popup */}
                                            {transitionPicker === clip.id && (
                                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover border border-border/40 rounded-xl p-3 shadow-2xl z-30 w-52">
                                                    <p className="text-[9px] text-gray-500 font-bold mb-2 text-center tracking-wider">TRANSITION</p>
                                                    <div className="max-h-48 overflow-y-auto scrollbar-thin space-y-0.5">
                                                        {TRANSITION_TYPES.map(opt => (
                                                            <button key={opt.name}
                                                                onClick={() => setTransition(clip.id, opt.name, trans?.duration ?? 0.5)}
                                                                className={`flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${trans?.type === opt.name ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>
                                                                <span className="text-sm">{opt.icon}</span> {opt.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {trans && (
                                                        <div className="mt-2 pt-2 border-t border-white/10">
                                                            <label className="text-[9px] text-gray-500 block mb-1">Duration: {trans.duration.toFixed(1)}s</label>
                                                            <input type="range" min={0.3} max={2} step={0.1}
                                                                value={trans.duration}
                                                                onChange={e => setTransition(clip.id, trans.type, parseFloat(e.target.value))}
                                                                className="w-full" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {/* ═══════ EXPORT MODAL ═══════ */}
                {exportOpen && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md" onClick={() => setExportOpen(false)}>
                        <div className="bg-[#13131f] border border-white/[0.08] rounded-2xl w-full max-w-lg p-6 shadow-2xl shadow-violet-500/5" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-sm font-bold text-white">Export Video</h2>
                                <button onClick={() => setExportOpen(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors"><X size={16} /></button>
                            </div>

                            {!exporter.exportDone ? (
                                <>
                                    <div className="space-y-4">
                                        {/* Resolution */}
                                        <div>
                                            <label className="text-[10px] text-gray-500 block mb-1.5">Resolution</label>
                                            <div className="flex gap-2">
                                                {(['480p', '720p', '1080p', '4K'] as const).map(r => (
                                                    <button key={r} onClick={() => setExportSettings(s => ({ ...s, resolution: r }))}
                                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${exportSettings.resolution === r ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                                                        {r}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {/* FPS */}
                                        <div>
                                            <label className="text-[10px] text-gray-500 block mb-1.5">FPS</label>
                                            <div className="flex gap-2">
                                                {([24, 30, 60] as const).map(f => (
                                                    <button key={f} onClick={() => setExportSettings(s => ({ ...s, fps: f }))}
                                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${exportSettings.fps === f ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                                                        {f}fps
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Format */}
                                        <div>
                                            <label className="text-[10px] text-gray-500 block mb-1.5">Format</label>
                                            <div className="flex gap-2">
                                                {(['mp4', 'webm', 'gif'] as const).map(f => (
                                                    <button key={f} onClick={() => setExportSettings(s => ({ ...s, format: f }))}
                                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors uppercase ${exportSettings.format === f ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                                                        {f}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Quality */}
                                        <div>
                                            <label className="text-[10px] text-gray-500 block mb-1.5">Quality</label>
                                            <div className="flex gap-2">
                                                {(['low', 'medium', 'high', 'lossless'] as const).map(q => (
                                                    <button key={q} onClick={() => setExportSettings(s => ({ ...s, quality: q }))}
                                                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-colors capitalize ${exportSettings.quality === q ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                                                        {q}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Aspect Ratio */}
                                        <div>
                                            <label className="text-[10px] text-gray-500 block mb-1.5">Aspect Ratio</label>
                                            <div className="flex gap-2">
                                                {(['16:9', '9:16', '1:1', '4:3'] as const).map(a => (
                                                    <button key={a} onClick={() => setExportSettings(s => ({ ...s, aspectRatio: a }))}
                                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${exportSettings.aspectRatio === a ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                                                        {a}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    {exporter.isExporting && (
                                        <div className="mt-5">
                                            <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full transition-all duration-300"
                                                    style={{ width: `${Math.min(exporter.progress, 100)}%` }} />
                                            </div>
                                            <p className="text-[10px] text-gray-500 mt-1.5 text-center">
                                                {Math.min(Math.round(exporter.progress), 100)}% — Encoding...
                                            </p>
                                        </div>
                                    )}
                                    {exporter.exportError && (
                                        <div className="mt-4 text-xs text-red-400 bg-red-900/20 px-3 py-2 rounded-lg border border-red-500/20">
                                            {exporter.exportError}
                                        </div>
                                    )}

                                    <button
                                        onClick={() => exporter.startExport(activeVideoUrl, exportSettings)}
                                        disabled={exporter.isExporting}
                                        className="w-full mt-5 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2">
                                        {exporter.isExporting ? (
                                            <><Loader2 size={14} className="animate-spin" /> Exporting...</>
                                        ) : (
                                            <><Download size={14} /> Export as {exportSettings.format.toUpperCase()} ({exportSettings.resolution})</>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <div className="text-center py-6 space-y-4">
                                    <div className="text-4xl">✅</div>
                                    <p className="text-sm font-bold text-white">Export Complete!</p>
                                    <p className="text-xs text-gray-400">Your video is ready to download.</p>
                                    <button onClick={() => { exporter.downloadFile(`export_${Date.now()}.${exportSettings.format}`); }}
                                        className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-xl text-xs font-bold transition-colors">
                                        <Download size={14} className="inline mr-2" />Download File
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ═══════ TOAST ═══════ */}
                {toast && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-purple-600 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-2xl shadow-violet-500/20 z-[60] animate-fadeIn">
                        {toast}
                    </div>
                )}
            </div>
        </>
    );
};

export default VideoStudio;
