import { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Download, FileAudio2, Loader2, Music2, RefreshCw, Upload, CheckCircle2 } from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import ffmpegCoreURL from '@ffmpeg/core?url';
import ffmpegWasmURL from '@ffmpeg/core/wasm?url';
import toast from 'react-hot-toast';
import AdSpace from '../components/ui/AdSpace';
import FileUpload from '../components/ui/FileUpload';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'https://my-cloudflare-api.rpadmajaa-14.workers.dev';

type FFmpegTier =
    | { name: string; type: 'bundled'; coreURL: string; wasmURL: string }
    | { name: string; type: 'cdn'; baseURL: string };

const FFMPEG_TIERS: FFmpegTier[] = [
    { name: 'Bundled core', type: 'bundled', coreURL: ffmpegCoreURL, wasmURL: ffmpegWasmURL },
    { name: 'CDN fallback (jsDelivr)', type: 'cdn', baseURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd' },
    { name: 'CDN fallback (unpkg)', type: 'cdn', baseURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd' },
    { name: 'Legacy fallback (jsDelivr)', type: 'cdn', baseURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.4/dist/umd' },
    { name: 'Legacy fallback (unpkg)', type: 'cdn', baseURL: 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd' },
];

const ACCEPTED_VIDEO_TYPES = 'video/mp4,video/webm,video/quicktime,video/x-matroska,video/x-msvideo';

const Mp4ToMp3 = () => {
    const { token } = useAuth();
    const ffmpegRef = useRef<FFmpeg | null>(null);
    const [loadAttempted, setLoadAttempted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [sourceUrl, setSourceUrl] = useState<string | null>(null);
    const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
    const [outputUrl, setOutputUrl] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isConverting, setIsConverting] = useState(false);

    const loadFFmpeg = useCallback(async () => {
        if (loadAttempted) return;
        setLoadAttempted(true);
        setIsLoading(true);
        setMessage('Initializing audio engine...');

        const ffmpeg = new FFmpeg();
        ffmpegRef.current = ffmpeg;

        for (const tier of FFMPEG_TIERS) {
            try {
                setMessage(`${tier.name}...`);
                let coreURL: string;
                let wasmURL: string;

                if (tier.type === 'bundled') {
                    coreURL = tier.coreURL;
                    wasmURL = tier.wasmURL;
                } else {
                    coreURL = await toBlobURL(`${tier.baseURL}/ffmpeg-core.js`, 'text/javascript');
                    wasmURL = await toBlobURL(`${tier.baseURL}/ffmpeg-core.wasm`, 'application/wasm');
                }

                const opts: Record<string, unknown> = { coreURL, wasmURL };

                await Promise.race([
                    ffmpeg.load(opts),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 180000)),
                ]);

                setIsReady(true);
                setIsLoading(false);
                setMessage('');
                return;
            } catch (loadError) {
                console.warn(`[Mp4ToMp3] ${tier.name} failed:`, loadError);
            }
        }

        setError('Audio engine could not be loaded from available CDNs. Check your internet/firewall and refresh the page.');
        setMessage('');
        setIsLoading(false);
    }, [loadAttempted]);

    useEffect(() => {
        loadFFmpeg();
    }, [loadFFmpeg]);

    useEffect(() => {
        if (!file) {
            setSourceUrl(null);
            return;
        }

        const url = URL.createObjectURL(file);
        setSourceUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    useEffect(() => {
        if (!outputBlob) {
            setOutputUrl(null);
            return;
        }

        const url = URL.createObjectURL(outputBlob);
        setOutputUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [outputBlob]);

    const handleFileSelect = useCallback((selectedFile: File) => {
        if (!selectedFile.type.startsWith('video/')) {
            setError('Please upload a video file such as MP4 or WebM.');
            return;
        }

        setFile(selectedFile);
        setOutputBlob(null);
        setError(null);
        setProgress(0);
        setMessage('');
    }, []);

    const handleConvert = useCallback(async () => {
        const ffmpeg = ffmpegRef.current;
        if (!file || !ffmpeg || !isReady) {
            setError('Audio engine is still loading. Please wait a moment.');
            return;
        }

        setIsConverting(true);
        setError(null);
        setProgress(0);
        setMessage('Preparing conversion...');

        try {
            const inputExt = file.name.split('.').pop()?.toLowerCase() || 'mp4';
            const inputName = `input.${inputExt}`;
            const outputName = 'output.mp3';

            ffmpeg.on('progress', ({ progress: currentProgress }: { progress: number }) => {
                setProgress(Math.round((currentProgress || 0) * 100));
                setMessage(`Converting... ${Math.round((currentProgress || 0) * 100)}%`);
            });

            await ffmpeg.writeFile(inputName, await fetchFile(file));
            await ffmpeg.exec([
                '-y',
                '-i', inputName,
                '-vn',
                '-c:a', 'mp3',
                '-q:a', '2',
                outputName,
            ]);

            const data = await ffmpeg.readFile(outputName);
            const blob = new Blob([data as unknown as BlobPart], { type: 'audio/mpeg' });
            setOutputBlob(blob);
            setProgress(100);
            setMessage('Conversion complete.');

            if (token) {
                try {
                    await fetch(`${API_URL}/api/history/audio`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            fileName: file.name,
                            outputFileName: `${file.name.replace(/\.[^.]+$/, '')}.mp3`,
                            sourceFormat: inputExt,
                            targetFormat: 'mp3',
                        }),
                    });
                } catch (historyError) {
                    console.error('Failed to save audio history:', historyError);
                }
            }

            toast.success('MP3 generated successfully.');
        } catch (conversionError) {
            console.error(conversionError);
            const errorMessage = conversionError instanceof Error ? conversionError.message : 'Unknown conversion error';
            setError(`Conversion failed: ${errorMessage}`);
        } finally {
            setIsConverting(false);
            setMessage('');
        }
    }, [file, isReady, token]);

    const handleDownload = useCallback(() => {
        if (!outputUrl) return;

        const a = document.createElement('a');
        a.href = outputUrl;
        a.download = `${file?.name.replace(/\.[^.]+$/, '') || 'audio'}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('Download started.');
    }, [file?.name, outputUrl]);

    const handleReset = useCallback(() => {
        setFile(null);
        setOutputBlob(null);
        setError(null);
        setProgress(0);
        setMessage('');
    }, []);

    return (
        <div className="pb-20 overflow-x-hidden">
            <Helmet>
                <title>MP4 to MP3 Converter – QuickTools</title>
                <meta name="description" content="Convert MP4, WebM, MOV, and other videos to MP3 directly in your browser." />
            </Helmet>

            <div className="container px-4 pt-8 sm:pt-12 max-w-5xl mx-auto">
                <div className="text-center mb-8 sm:mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-medium mb-4">
                        <Music2 size={12} /> Audio Extractor
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
                        MP4 to MP3 Converter
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
                        Convert video files to MP3 locally in your browser. The app stores only conversion metadata in D1, not the media itself.
                    </p>
                </div>

                <AdSpace className="mb-8 sm:mb-12 border-amber-500/20" />

                <div className="grid lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-7 space-y-6">
                        {!file ? (
                            <div className="glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-10 border border-border/50">
                                <FileUpload
                                    accept={ACCEPTED_VIDEO_TYPES}
                                    supportedFormats="MP4, WebM, MOV, MKV, AVI"
                                    onFileSelect={handleFileSelect}
                                />
                                <div className="mt-6 grid sm:grid-cols-3 gap-3 text-left">
                                    {[
                                        'Upload a video file you own or have permission to use.',
                                        'The conversion runs locally using FFmpeg in the browser.',
                                        'Only job metadata is saved to the database for history.'
                                    ].map((item) => (
                                        <div key={item} className="rounded-xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-border/50">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                        <FileAudio2 size={22} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-foreground truncate">{file.name}</p>
                                        <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                    <button
                                        onClick={handleReset}
                                        className="px-3 py-2 rounded-lg text-sm font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors"
                                    >
                                        Change file
                                    </button>
                                </div>

                                <div className="mt-6 rounded-2xl border border-border/60 bg-background/60 p-4 sm:p-5">
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                                        <Upload size={16} />
                                        Source preview
                                    </div>
                                    {sourceUrl ? (
                                        <video controls src={sourceUrl} className="w-full rounded-xl max-h-[360px] bg-black" />
                                    ) : null}
                                </div>

                                {error && (
                                    <div className="mt-5 flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                                        {error}
                                    </div>
                                )}

                                {message && (
                                    <div className="mt-5 flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm">
                                        <Loader2 size={14} className="animate-spin" />
                                        {message}
                                    </div>
                                )}

                                <div className="mt-5">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                                        <span>Conversion progress</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                                    {!outputUrl ? (
                                        <button
                                            onClick={handleConvert}
                                            disabled={isConverting || isLoading || !isReady}
                                            className="flex-1 px-6 py-3 rounded-full bg-amber-600 hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold flex items-center justify-center gap-2 transition-all"
                                        >
                                            {isConverting ? <Loader2 size={18} className="animate-spin" /> : <Music2 size={18} />}
                                            {isConverting ? 'Converting...' : 'Convert to MP3'}
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={handleDownload}
                                                className="flex-1 px-6 py-3 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center justify-center gap-2 transition-all"
                                            >
                                                <Download size={18} /> Download MP3
                                            </button>
                                            <button
                                                onClick={handleConvert}
                                                disabled={isConverting}
                                                className="flex-1 px-6 py-3 rounded-full bg-muted hover:bg-muted/80 text-foreground font-medium flex items-center justify-center gap-2 transition-all"
                                            >
                                                <RefreshCw size={16} /> Reconvert
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-5 space-y-6">
                        <div className="rounded-2xl border border-border/50 bg-background/70 p-6 shadow-sm">
                            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                                <CheckCircle2 size={18} className="text-amber-500" />
                                How it works
                            </h2>
                            <div className="space-y-4 text-sm text-muted-foreground">
                                <p>1. Upload a supported video file.</p>
                                <p>2. FFmpeg extracts the audio track and encodes it as MP3.</p>
                                <p>3. Download the result instantly, then optionally save the history entry to your account.</p>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border/50 bg-background/70 p-6 shadow-sm">
                            <h2 className="text-lg font-bold mb-3">Storage model</h2>
                            <p className="text-sm text-muted-foreground leading-6">
                                Media files are processed in the browser. The database stores conversion metadata only, which keeps the app fast and avoids putting large binaries into D1.
                            </p>
                            <p className="text-sm text-muted-foreground leading-6 mt-3">
                                If you want cloud retention later, add object storage such as R2 or S3 and keep D1 for job records.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Mp4ToMp3;