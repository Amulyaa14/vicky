import { Scissors, RefreshCw, Aperture, Loader2, Play, Pencil, Download } from 'lucide-react';
import AdSpace from '../components/ui/AdSpace';
import FileUpload from '../components/ui/FileUpload';
import { useState, useEffect, useCallback, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import VideoPreview from '../components/video/VideoPreview';
import VideoEditor from '../components/video/VideoEditor';
import {
    DEFAULT_EDIT_STATE,
    loadEditState,
    saveEditState,
    type VideoEditState,
} from '../types/videoEditor';

const FFMPEG_TIERS = [
    { name: 'Compatibility (Single-threaded)', baseURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd', useWorker: false },
    { name: 'Legacy (v0.12.4)', baseURL: 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd', useWorker: false },
    { name: 'Multi-threaded', baseURL: 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd', useWorker: true },
    { name: 'Multi-threaded (CDN)', baseURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.6/dist/umd', useWorker: true },
];

const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska';

const VideoTools = () => {
    const ffmpegRef = useRef<FFmpeg | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadAttempted, setLoadAttempted] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [originalVideoUrl, setOriginalVideoUrl] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'selection' | 'actions' | 'preview' | 'edit'>('selection');
    const [selectedTool, setSelectedTool] = useState<string>('compress');
    const [message, setMessage] = useState('');
    const [outputVideo, setOutputVideo] = useState<string | null>(null);
    const [outputFormat, setOutputFormat] = useState<string>('');
    const [editState, setEditState] = useState<VideoEditState>(DEFAULT_EDIT_STATE);
    const [isExporting, setIsExporting] = useState(false);
    const [convertFormat, setConvertFormat] = useState('mp4');
    const [convertRes, setConvertRes] = useState('auto');

    const loadFFmpeg = useCallback(async () => {
        if (loadAttempted) return;
        setLoadAttempted(true);
        setIsLoading(true);
        setMessage('Initializing video engine...');

        const ffmpeg = new FFmpeg();
        ffmpegRef.current = ffmpeg;

        for (let i = 0; i < FFMPEG_TIERS.length; i++) {
            const tier = FFMPEG_TIERS[i];
            try {
                setMessage(`${tier.name}...`);
                const coreURL = await toBlobURL(`${tier.baseURL}/ffmpeg-core.js`, 'text/javascript');
                const wasmURL = await toBlobURL(`${tier.baseURL}/ffmpeg-core.wasm`, 'application/wasm');
                const opts: Record<string, unknown> = { coreURL, wasmURL };
                if (tier.useWorker) {
                    opts.workerURL = await toBlobURL(`${tier.baseURL}/ffmpeg-core.worker.js`, 'text/javascript');
                }
                await Promise.race([
                    ffmpeg.load(opts),
                    new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout')), 60000)),
                ]);
                setLoaded(true);
                setIsLoading(false);
                setMessage('');
                return;
            } catch (e) {
                console.warn(`[VideoTools] ${tier.name} failed:`, e);
            }
        }

        setIsLoading(false);
        setMessage('');
    }, [loadAttempted]);

    useEffect(() => {
        loadFFmpeg();
    }, []);

    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file);
            setOriginalVideoUrl(url);
            setViewMode('actions');
            // Load saved project from localStorage
            const saved = loadEditState(file.name);
            if (saved) setEditState(saved);
            else setEditState({ ...DEFAULT_EDIT_STATE });
            return () => URL.revokeObjectURL(url);
        } else {
            setOriginalVideoUrl(null);
            setViewMode('selection');
        }
    }, [file]);

    const processVideo = async (opts: {
        format?: string;
        resolution?: string;
        trimStart?: number;
        trimEnd?: number;
        brightness?: number;
        contrast?: number;
        speed?: number;
        filter?: string;
        volume?: number;
        muted?: boolean;
        textOverlay?: string;
        effect?: string;
        fadeIn?: boolean;
        fadeOut?: boolean;
        autoDownload?: boolean;
    }) => {
        const ffmpeg = ffmpegRef.current;
        if (!file || !ffmpeg || !loaded) {
            setMessage('Video engine not ready. Please wait...');
            return;
        }
        setOutputVideo(null);
        setMessage('Processing...');
        setIsExporting(true);

        try {
            const inputExt = file.name.split('.').pop()?.toLowerCase() || 'mp4';
            const inputName = `input.${inputExt}`;
            await ffmpeg.writeFile(inputName, await fetchFile(file));

            ffmpeg.on('progress', ({ progress }: { progress: number }) => {
                setMessage(`Processing... ${Math.round((progress || 0) * 100)}%`);
            });

            const format = opts.format || 'mp4';
            const res = opts.resolution || 'auto';
            const trimStart = opts.trimStart ?? editState.trimStart ?? 0;
            const trimEnd = opts.trimEnd ?? editState.trimEnd ?? -1;
            const brightness = opts.brightness ?? editState.brightness ?? 1;
            const contrast = opts.contrast ?? editState.contrast ?? 1;
            const speed = opts.speed ?? editState.speed ?? 1;
            const filter = opts.filter ?? editState.filter ?? 'none';
            const volume = opts.volume ?? editState.volume ?? 1;
            const muted = opts.muted ?? editState.muted ?? false;
            const textOverlay = opts.textOverlay ?? editState.textOverlay ?? '';
            const effect = opts.effect ?? editState.effect ?? 'none';
            const fadeIn = opts.fadeIn ?? editState.fadeIn ?? false;
            const fadeOut = opts.fadeOut ?? editState.fadeOut ?? false;

            const outputExt = format === 'webm' ? 'webm' : format === 'mov' ? 'mov' : format === 'avi' ? 'avi' : 'mp4';
            const outFile = `output.${outputExt}`;

            // Build video filter chain
            const vfParts: string[] = [];
            if (brightness !== 1 || contrast !== 1) {
                vfParts.push(`eq=brightness=${brightness}:contrast=${contrast}`);
            }
            if (filter === 'grayscale') vfParts.push('format=gray');
            else if (filter === 'sepia') vfParts.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131');
            else if (filter === 'vintage') vfParts.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131', 'eq=contrast=1.1');

            if (effect === 'blur') vfParts.push('boxblur=4:1');
            else if (effect === 'invert') vfParts.push('negate');

            if (fadeIn) vfParts.push('fade=t=in:st=0:d=2');
            const dur = trimEnd > 0 ? trimEnd : 0;
            if (fadeOut && dur > 2) vfParts.push(`fade=t=out:st=${dur - 2}:d=2`);

            if (speed !== 1) vfParts.push(`setpts=PTS/${speed}`);
            if (res === '720p') vfParts.push('scale=-2:720');
            else if (res === '1080p') vfParts.push('scale=-2:1080');

            if (textOverlay) {
                try {
                    // Fetch a basic font to draw text
                    await ffmpeg.writeFile('font.ttf', await fetchFile('https://unpkg.com/@canvas-fonts/arial@1.0.4/Arial.ttf'));
                    const escapedText = textOverlay.replace(/'/g, "\\'").replace(/:/g, '\\:');
                    vfParts.push(`drawtext=fontfile=font.ttf:text='${escapedText}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h-th-40`);
                } catch (err) {
                    console.warn('Failed to load font or apply text overlay', err);
                }
            }

            const vfStr = vfParts.length > 0 ? vfParts.join(',') : undefined;

            const args: string[] = [];
            if (trimStart > 0) args.push('-ss', String(trimStart));
            args.push('-i', inputName);
            if (trimEnd > 0 && trimEnd > trimStart) args.push('-t', String(trimEnd - trimStart));

            const afParts: string[] = [];
            if (speed !== 1) afParts.push(`atempo=${speed}`);
            if (volume !== 1 && !muted) afParts.push(`volume=${volume}`);

            if (muted) {
                args.push('-an');
            } else if (afParts.length > 0) {
                args.push('-filter:a', afParts.join(','));
            }

            if (vfStr) args.push('-vf', vfStr);

            if (format === 'webm') {
                args.push('-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0');
                if (!muted) args.push('-c:a', 'libopus');
                args.push(outFile);
            } else {
                args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '28');
                if (!muted) args.push('-c:a', 'aac');
                args.push(outFile);
            }

            await ffmpeg.exec(args);

            const data = await ffmpeg.readFile(outFile);
            const mime = format === 'webm' ? 'video/webm' : 'video/mp4';
            const url = URL.createObjectURL(new Blob([data as any], { type: mime }));
            setOutputVideo(url);
            setOutputFormat(outputExt.toUpperCase());
            setViewMode('preview');

            if (opts.autoDownload) {
                const a = document.createElement('a');
                a.href = url;
                a.download = `video_${file.name.replace(/\.[^/.]+$/, '')}.${outputExt}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        } catch (error: unknown) {
            setMessage(`Error: ${error instanceof Error ? error.message : 'Processing failed'}`);
        } finally {
            setIsExporting(false);
        }
    };

    const handleDownload = useCallback(() => {
        const url = outputVideo || originalVideoUrl;
        if (!url) return;
        const a = document.createElement('a');
        a.href = url;
        a.download = `video_${file?.name || 'export'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }, [outputVideo, originalVideoUrl, file?.name]);

    const handleSaveEditState = useCallback((state: VideoEditState) => {
        if (!file) return;
        setEditState(state);
        saveEditState(file.name, state);
        setMessage('Project saved!');
        setTimeout(() => setMessage(''), 2000);
    }, [file]);

    const handleExport = useCallback((opts: { format: string; resolution: string }) => {
        processVideo({
            format: opts.format,
            resolution: opts.resolution,
            trimStart: editState.trimStart,
            trimEnd: editState.trimEnd > 0 ? editState.trimEnd : undefined,
            brightness: editState.brightness,
            contrast: editState.contrast,
            speed: editState.speed,
            filter: editState.filter,
            volume: editState.volume,
            muted: editState.muted,
            textOverlay: editState.textOverlay,
            effect: editState.effect,
            fadeIn: editState.fadeIn,
            fadeOut: editState.fadeOut,
            autoDownload: true,
        });
    }, [editState]);

    const handleBack = useCallback(() => {
        setFile(null);
        setOutputVideo(null);
        setOutputFormat('');
        setEditState(DEFAULT_EDIT_STATE);
        setViewMode('selection');
    }, []);

    const tools = [
        { id: 'trim', icon: Scissors, name: 'Video Trimmer', desc: 'Cut and trim video clips precisely.' },
        { id: 'convert', icon: RefreshCw, name: 'Format Converter', desc: 'Convert MP4, MOV, AVI and more.' },
        { id: 'compress', icon: Aperture, name: 'Compressor', desc: 'Reduce file size without quality loss.' },
    ];

    if (viewMode === 'preview' && (outputVideo || originalVideoUrl)) {
        return (
            <VideoPreview
                videoUrl={(outputVideo || originalVideoUrl) as string}
                file={file}
                outputVideoUrl={outputVideo}
                outputFormat={outputFormat}
                onEdit={() => setViewMode('edit')}
                onDownload={handleDownload}
                onBack={handleBack}
                onConvert={(opts) => processVideo({ ...opts, autoDownload: true })}
                engineReady={loaded}
            />
        );
    }

    if (viewMode === 'edit' && (outputVideo || originalVideoUrl)) {
        return (
            <VideoEditor
                videoUrl={(outputVideo || originalVideoUrl) as string}
                fileName={file?.name || 'Untitled Video'}
                file={file}
                editState={editState}
                onEditChange={(updates) => setEditState((s) => ({ ...s, ...updates }))}
                onSave={handleSaveEditState}
                onExport={handleExport}
                onDownload={handleDownload}
                onBack={() => setViewMode('preview')}
                engineReady={loaded}
                isExporting={isExporting}
                message={message}
                onReplaceMedia={(f) => setFile(f)}
            />
        );
    }

    if (viewMode === 'actions' && file && originalVideoUrl) {
        return (
            <div className="pb-20">
                <div className="container px-4 pt-12 text-center max-w-5xl mx-auto">
                    <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
                        Video Studio
                    </h1>
                    <p className="text-gray-400 mb-8">Choose an action for your video</p>

                    {message && (
                        <div className="mb-4 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm">
                            {message}
                        </div>
                    )}

                    <div className="mt-8 p-8 glass-card rounded-3xl min-h-[300px]">
                        <p className="text-gray-400 mb-6 truncate max-w-md mx-auto">{file.name}</p>
                        <div className="flex flex-wrap justify-center gap-4 mb-8">
                            <button
                                onClick={() => setViewMode('preview')}
                                className="flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 rounded-full text-sm font-bold transition-all shadow-lg shadow-pink-600/20"
                            >
                                <Play size={18} />
                                Preview
                            </button>
                            <button
                                onClick={() => setViewMode('edit')}
                                className="flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 rounded-full text-sm font-bold transition-all shadow-lg shadow-pink-600/20"
                            >
                                <Pencil size={18} />
                                Edit
                            </button>
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full text-sm font-bold transition-all"
                            >
                                <Download size={18} />
                                Download Original
                            </button>
                        </div>

                        <div className="pt-8 border-t border-white/10 max-w-xl mx-auto text-left">
                            <h3 className="text-lg font-bold mb-4">Quick Convert & Download</h3>
                            <div className="grid sm:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Format</label>
                                    <select
                                        value={convertFormat}
                                        onChange={e => setConvertFormat(e.target.value)}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="mp4">MP4</option>
                                        <option value="webm">WebM</option>
                                        <option value="mov">MOV</option>
                                        <option value="avi">AVI</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Resolution</label>
                                    <select
                                        value={convertRes}
                                        onChange={e => setConvertRes(e.target.value)}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="auto">Auto (Original)</option>
                                        <option value="1080p">1080p</option>
                                        <option value="720p">720p</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-center flex-col items-center">
                                <button
                                    onClick={() => processVideo({ autoDownload: true, format: convertFormat, resolution: convertRes })}
                                    disabled={!loaded || isExporting}
                                    className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-sm font-bold shadow-lg shadow-pink-500/25 transition-all text-white w-full sm:w-auto justify-center"
                                >
                                    {isExporting ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                                    {isExporting ? 'Processing...' : 'Convert & Download'}
                                </button>
                                {!loaded && loadAttempted && !isLoading && (
                                    <p className="text-amber-400/90 text-xs mt-3 text-center">Engine unavailable. Quick Convert disabled.</p>
                                )}
                                {!loaded && isLoading && (
                                    <p className="text-pink-400 text-xs mt-3 text-center animate-pulse">Initializing engine...</p>
                                )}
                            </div>
                        </div>

                        <button onClick={handleBack} className="mt-8 text-sm text-gray-500 hover:text-white transition-colors">
                            ← Choose another video
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-20">
            <div className="container px-4 pt-12 text-center max-w-5xl mx-auto">
                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
                    Video Studio
                </h1>
                <p className="text-gray-400 mb-12">Professional video editing tools in your browser.</p>

                <AdSpace className="mb-16 border-pink-500/20" />

                <div className="grid md:grid-cols-3 gap-8 mb-12">
                    {tools.map(tool => (
                        <div
                            key={tool.id}
                            onClick={() => setSelectedTool(tool.id)}
                            className={`glass-card p-8 rounded-2xl transition-all cursor-pointer group text-left border ${selectedTool === tool.id ? 'border-pink-500 bg-pink-500/10' : 'border-slate-700 hover:bg-white/5'}`}
                        >
                            <div className="w-14 h-14 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <tool.icon size={28} />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{tool.name}</h3>
                            <p className="text-gray-400 text-sm">{tool.desc}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-8 p-8 glass-card rounded-3xl text-center min-h-[400px]">
                    {isLoading && (
                        <div className="flex items-center justify-center gap-2 mb-4 text-sm text-gray-400">
                            <Loader2 className="animate-spin" size={16} />
                            <span>{message || 'Loading video engine...'}</span>
                        </div>
                    )}
                    {!loaded && !isLoading && loadAttempted && (
                        <p className="text-amber-400/90 text-sm mb-4 max-w-md mx-auto">
                            Video engine unavailable. You can preview and download. Export requires a refresh.
                        </p>
                    )}
                    <FileUpload
                        onFileSelect={setFile}
                        accept={VIDEO_ACCEPT}
                        supportedFormats="MP4, WebM, MOV, AVI"
                    />
                </div>
            </div>
        </div>
    );
};

export default VideoTools;
