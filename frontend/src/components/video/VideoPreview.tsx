import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Pencil, Download, Loader2, ArrowLeft } from 'lucide-react';

interface VideoPreviewProps {
    videoUrl: string;
    file: File | null;
    outputVideoUrl: string | null;
    outputFormat?: string;
    onEdit: () => void;
    onDownload: () => void;
    onBack: () => void;
    onConvert: (opts: { format: string; resolution: string }) => void;
    engineReady: boolean;
}

const getFormatFromFileName = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    return ext === 'webm' ? 'WebM' : ext === 'mov' ? 'MOV' : ext === 'avi' ? 'AVI' : 'MP4';
};

const VideoPreview: React.FC<VideoPreviewProps> = ({
    videoUrl,
    file,
    outputFormat,
    onEdit,
    onDownload,
    onBack,
    onConvert,
    engineReady,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [videoWidth, setVideoWidth] = useState(0);
    const [videoHeight, setVideoHeight] = useState(0);
    const [convertFormat, setConvertFormat] = useState('mp4');
    const [convertRes, setConvertRes] = useState('auto');
    const [isConverting, setIsConverting] = useState(false);

    const format = outputFormat || getFormatFromFileName(file?.name || 'video.mp4');
    const resolution = videoWidth && videoHeight ? `${videoHeight}p` : '-';
    const fileSize = file ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : '-';
    const durationStr = duration ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}` : '-';

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        const onMeta = () => {
            setDuration(v.duration);
            setVideoWidth(v.videoWidth);
            setVideoHeight(v.videoHeight);
        };
        v.addEventListener('loadedmetadata', onMeta);
        if (v.videoWidth) onMeta();
        return () => v.removeEventListener('loadedmetadata', onMeta);
    }, [videoUrl]);

    const handlePlayPause = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleConvert = async () => {
        if (!engineReady) return;
        setIsConverting(true);
        await onConvert({ format: convertFormat, resolution: convertRes });
        setIsConverting(false);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col overflow-hidden text-white font-sans">
            {/* Toolbar */}
            <div className="h-14 bg-[#1a1a1a] flex items-center justify-between px-4 shrink-0 border-b border-white/10">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm">
                    <ArrowLeft size={18} />
                    Back
                </button>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onEdit}
                        className="flex items-center gap-2 px-5 py-2 bg-pink-600 hover:bg-pink-700 rounded-full text-sm font-bold"
                    >
                        <Pencil size={16} />
                        Edit
                    </button>
                    <button
                        onClick={onDownload}
                        className="flex items-center gap-2 px-5 py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm font-bold"
                    >
                        <Download size={16} />
                        Download
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto p-6">
                    {/* Video Player */}
                    <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 mb-6 group cursor-pointer">
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            className="w-full h-full object-contain"
                            onClick={handlePlayPause}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onEnded={() => setIsPlaying(false)}
                        />
                        <div
                            className={`absolute inset-0 flex items-center justify-center cursor-pointer transition-opacity ${isPlaying ? 'opacity-0 group-hover:opacity-100 bg-black/30' : 'bg-black/20'}`}
                            onClick={handlePlayPause}
                        >
                            <div className="p-6 bg-pink-600 rounded-full shadow-2xl hover:scale-110 transition-transform">
                                {isPlaying ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" className="ml-1" />}
                            </div>
                        </div>
                    </div>

                    {/* Video Info */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white/5 rounded-xl p-4">
                            <p className="text-xs text-gray-400 mb-1">Format</p>
                            <p className="font-semibold">{format}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                            <p className="text-xs text-gray-400 mb-1">Resolution</p>
                            <p className="font-semibold">{resolution}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                            <p className="text-xs text-gray-400 mb-1">Duration</p>
                            <p className="font-semibold">{durationStr}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                            <p className="text-xs text-gray-400 mb-1">File Size</p>
                            <p className="font-semibold">{fileSize}</p>
                        </div>
                    </div>

                    {/* Convert Format Section */}
                    <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/5">
                        <h3 className="text-lg font-bold mb-4">Convert Format</h3>
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Format</label>
                                <select
                                    value={convertFormat}
                                    onChange={e => setConvertFormat(e.target.value)}
                                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2 text-white"
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
                                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2 text-white"
                                >
                                    <option value="auto">Auto</option>
                                    <option value="1080p">1080p</option>
                                    <option value="720p">720p</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                            <button
                                onClick={handleConvert}
                                disabled={isConverting}
                                className="flex items-center gap-2 px-6 py-2.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-sm font-bold"
                            >
                                {isConverting ? <Loader2 size={18} className="animate-spin" /> : null}
                                Convert & Download
                            </button>
                            {!engineReady && <span className="text-sm text-amber-400">Engine loading...</span>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoPreview;
