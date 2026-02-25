/**
 * useExport — FFmpeg.wasm encoding with MediaRecorder fallback.
 * Provides real progress tracking and blob download.
 */
import { useState, useCallback, useRef } from 'react';

export interface ExportSettings {
    resolution: '480p' | '720p' | '1080p' | '4K';
    fps: 24 | 30 | 60;
    format: 'mp4' | 'webm' | 'gif';
    quality: 'low' | 'medium' | 'high' | 'lossless';
    aspectRatio: '16:9' | '9:16' | '1:1' | '4:3';
}

const RES_MAP: Record<string, string> = {
    '480p': '854:480', '720p': '1280:720',
    '1080p': '1920:1080', '4K': '3840:2160',
};

const CRF_MAP: Record<string, number> = {
    low: 35, medium: 28, high: 20, lossless: 0,
};

export interface UseExportReturn {
    isExporting: boolean;
    progress: number;
    exportError: string | null;
    exportDone: boolean;
    downloadUrl: string | null;
    startExport: (videoUrl: string | null, settings: ExportSettings) => Promise<void>;
    downloadFile: (filename?: string) => void;
    resetExport: () => void;
}

export function useExport(): UseExportReturn {
    const [isExporting, setIsExporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [exportError, setExportError] = useState<string | null>(null);
    const [exportDone, setExportDone] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const ffmpegRef = useRef<any>(null);

    const resetExport = useCallback(() => {
        setIsExporting(false);
        setProgress(0);
        setExportError(null);
        setExportDone(false);
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        setDownloadUrl(null);
    }, [downloadUrl]);

    const exportWithMediaRecorder = useCallback(async (
        videoUrl: string,
        settings: ExportSettings
    ): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = videoUrl;
            video.muted = false;
            video.playsInline = true;

            video.onloadeddata = () => {
                const canvas = document.createElement('canvas');
                const resHeight = settings.resolution === '480p' ? 480 :
                    settings.resolution === '720p' ? 720 :
                        settings.resolution === '1080p' ? 1080 : 2160;
                const resWidth = Math.round(resHeight * (16 / 9));
                canvas.width = resWidth;
                canvas.height = resHeight;
                const ctx = canvas.getContext('2d')!;

                const stream = canvas.captureStream(settings.fps);
                // Add audio track if the video has audio
                try {
                    const audioCtx = new AudioContext();
                    const source = audioCtx.createMediaElementSource(video);
                    const dest = audioCtx.createMediaStreamDestination();
                    source.connect(dest);
                    source.connect(audioCtx.destination);
                    dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
                } catch { /* no audio track — fine */ }

                const mimeType = settings.format === 'webm' ? 'video/webm;codecs=vp9'
                    : settings.format === 'mp4' ? 'video/mp4'
                        : 'video/webm';
                const recorder = new MediaRecorder(stream, {
                    mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm',
                    videoBitsPerSecond: settings.quality === 'lossless' ? 20_000_000
                        : settings.quality === 'high' ? 10_000_000
                            : settings.quality === 'medium' ? 5_000_000 : 2_000_000,
                });

                const chunks: BlobPart[] = [];
                recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: recorder.mimeType });
                    resolve(blob);
                };
                recorder.onerror = () => reject(new Error('MediaRecorder error'));

                // Draw frames
                const drawFrame = () => {
                    if (video.ended || video.paused) return;
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    if (video.duration > 0) {
                        setProgress(Math.round((video.currentTime / video.duration) * 100));
                    }
                    requestAnimationFrame(drawFrame);
                };

                recorder.start(100);
                video.play();
                drawFrame();

                video.onended = () => {
                    recorder.stop();
                    video.remove();
                };
            };
            video.onerror = () => reject(new Error('Failed to load video for export'));
        });
    }, []);

    const exportWithFFmpeg = useCallback(async (
        videoUrl: string,
        settings: ExportSettings
    ): Promise<Blob> => {
        const { FFmpeg } = await import('@ffmpeg/ffmpeg');
        const { fetchFile } = await import('@ffmpeg/util');

        if (!ffmpegRef.current) {
            const ffmpeg = new FFmpeg();
            ffmpeg.on('progress', ({ progress: p }) => {
                setProgress(Math.round(Math.min(p * 100, 99)));
            });
            await ffmpeg.load({
                coreURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
                wasmURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
            });
            ffmpegRef.current = ffmpeg;
        }

        const ffmpeg = ffmpegRef.current;
        const inputExt = videoUrl.includes('.webm') ? 'webm' : 'mp4';
        const inputName = `input.${inputExt}`;
        const outputExt = settings.format === 'gif' ? 'gif' : settings.format;
        const outputName = `output.${outputExt}`;

        await ffmpeg.writeFile(inputName, await fetchFile(videoUrl));

        const scale = RES_MAP[settings.resolution];
        const crf = CRF_MAP[settings.quality];

        const args: string[] = ['-i', inputName];

        if (settings.format === 'gif') {
            args.push('-vf', `fps=${settings.fps},scale=${scale}:flags=lanczos`);
        } else if (settings.format === 'webm') {
            args.push('-vf', `scale=${scale}:force_original_aspect_ratio=decrease`,
                '-c:v', 'libvpx-vp9', '-crf', String(crf), '-b:v', '0',
                '-r', String(settings.fps), '-c:a', 'libopus');
        } else {
            args.push('-vf', `scale=${scale}:force_original_aspect_ratio=decrease`,
                '-c:v', 'libx264', '-crf', String(crf), '-preset', 'medium',
                '-r', String(settings.fps), '-c:a', 'aac', '-b:a', '128k');
        }
        args.push('-y', outputName);

        await ffmpeg.exec(args);
        const data = await ffmpeg.readFile(outputName);
        const mimeType = settings.format === 'gif' ? 'image/gif'
            : settings.format === 'webm' ? 'video/webm' : 'video/mp4';
        return new Blob([data], { type: mimeType });
    }, []);

    const startExport = useCallback(async (videoUrl: string | null, settings: ExportSettings) => {
        if (!videoUrl) {
            setExportError('No video loaded. Upload a video first.');
            return;
        }

        setIsExporting(true);
        setProgress(0);
        setExportError(null);
        setExportDone(false);

        try {
            let blob: Blob;
            if (typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated) {
                try {
                    blob = await exportWithFFmpeg(videoUrl, settings);
                } catch (ffErr) {
                    console.warn('FFmpeg failed, falling back to MediaRecorder:', ffErr);
                    blob = await exportWithMediaRecorder(videoUrl, { ...settings, format: 'webm' });
                }
            } else {
                blob = await exportWithMediaRecorder(videoUrl, { ...settings, format: 'webm' });
            }

            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setProgress(100);
            setExportDone(true);
        } catch (err: any) {
            setExportError(err.message || 'Export failed');
        } finally {
            setIsExporting(false);
        }
    }, [exportWithFFmpeg, exportWithMediaRecorder]);

    const downloadFile = useCallback((filename?: string) => {
        if (!downloadUrl) return;
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename || 'export.mp4';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }, [downloadUrl]);

    return {
        isExporting, progress, exportError, exportDone,
        downloadUrl, startExport, downloadFile, resetExport,
    };
}
