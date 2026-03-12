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
    startExport: (clips: import('./types').Clip[], settings: ExportSettings) => Promise<void>;
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

    const exportWithFFmpeg = useCallback(async (
        clips: import('./types').Clip[],
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
        const scale = RES_MAP[settings.resolution];
        const crf = CRF_MAP[settings.quality];
        
        // 1. Write all unique source files to FFmpeg FS
        const uniqueSrcs = Array.from(new Set(clips.map(c => c.src).filter(Boolean)));
        const srcMap: Record<string, string> = {};
        for (let i = 0; i < uniqueSrcs.length; i++) {
            const src = uniqueSrcs[i]!;
            const ext = src.includes('.webm') ? 'webm' : 'mp4';
            const name = `input_${i}.${ext}`;
            await ffmpeg.writeFile(name, await fetchFile(src));
            srcMap[src] = name;
        }

        // 2. Build Complex Filter for Trimming and Concatenation
        // Format: [0:v]trim=start=1:end=2,setpts=PTS-STARTPTS[v0]; [0:a]atrim=start=1:end=2,asetpts=PTS-STARTPTS[a0]; ... [v0][a0][v1][a1]concat=n=2:v=1:a=1[outv][outa]
        let filterStr = '';
        let concatVideoStr = '';
        let concatAudioStr = '';

        clips.forEach((clip, i) => {
            const inputIdx = uniqueSrcs.indexOf(clip.src!);
            
            // Video part
            filterStr += `[${inputIdx}:v]trim=start=${clip.startTrim}:end=${clip.endTrim},setpts=PTS-STARTPTS,scale=${scale}:force_original_aspect_ratio=decrease,pad=${scale.replace(':', ':')}:(ow-iw)/2:(oh-ih)/2[v${i}]; `;
            
            // Audio part (assume audio exists for now)
            filterStr += `[${inputIdx}:a]atrim=start=${clip.startTrim}:end=${clip.endTrim},asetpts=PTS-STARTPTS[a${i}]; `;
            
            concatVideoStr += `[v${i}]`;
            concatAudioStr += `[a${i}]`;
        });

        filterStr += `${concatVideoStr}${concatAudioStr}concat=n=${clips.length}:v=1:a=1[outv][outa]`;

        const outputExt = settings.format === 'gif' ? 'gif' : settings.format;
        const outputName = `output.${outputExt}`;

        const args: string[] = [];
        uniqueSrcs.forEach(src => {
            args.push('-i', srcMap[src!]);
        });

        args.push('-filter_complex', filterStr, '-map', '[outv]', '-map', '[outa]');

        if (settings.format === 'gif') {
            // GIFs usually don't have audio map [outv] only
            // Simple override for GIF
            const gifFilter = filterStr.replace(/\[outa\]/g, '').replace(/:a=1/g, ':a=0').replace(/\[a\d+\]/g, '').replace(/atrim=.*?;/g, '');
            args.splice(args.indexOf('-filter_complex'), 4); // remove filters/maps
            args.push('-filter_complex', gifFilter, '-map', '[outv]', '-r', String(settings.fps));
        } else if (settings.format === 'webm') {
            args.push('-c:v', 'libvpx-vp9', '-crf', String(crf), '-b:v', '0', '-r', String(settings.fps), '-c:a', 'libopus');
        } else {
            args.push('-c:v', 'libx264', '-crf', String(crf), '-preset', 'medium', '-r', String(settings.fps), '-c:a', 'aac', '-b:a', '128k');
        }
        
        args.push('-y', outputName);

        await ffmpeg.exec(args);
        const data = await ffmpeg.readFile(outputName);
        const mimeType = settings.format === 'gif' ? 'image/gif'
            : settings.format === 'webm' ? 'video/webm' : 'video/mp4';
        
        // Cleanup FS
        for (const name of Object.values(srcMap)) {
            await ffmpeg.deleteFile(name);
        }

        return new Blob([data], { type: mimeType });
    }, []);

    const startExport = useCallback(async (clips: import('./types').Clip[], settings: ExportSettings) => {
        if (clips.length === 0) {
            setExportError('Timeline is empty.');
            return;
        }

        setIsExporting(true);
        setProgress(0);
        setExportError(null);
        setExportDone(false);

        try {
            let blob: Blob;
            // Force FFmpeg for timeline export because MediaRecorder cannot handle concatenation easily
            if (typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated) {
                blob = await exportWithFFmpeg(clips, settings);
            } else {
                 setExportError('Processing requires cross-origin isolation. Please ensure headers are set.');
                 setIsExporting(false);
                 return;
            }

            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setProgress(100);
            setExportDone(true);
        } catch (err: any) {
            console.error('Export Error:', err);
            setExportError(err.message || 'Export failed');
        } finally {
            setIsExporting(false);
        }
    }, [exportWithFFmpeg]);

    const downloadFile = useCallback((filename?: string) => {
        if (!downloadUrl) return;
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename || 'video_studio_export.mp4';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }, [downloadUrl]);

    return {
        isExporting, progress, exportError, exportDone,
        downloadUrl, startExport, downloadFile, resetExport,
    };
}
