import { useState, useCallback, useRef } from 'react';
import { Image, Layers, Upload, Download, Trash2, RefreshCw, Loader2, CheckCircle2, X } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import AdSpace from '../components/ui/AdSpace';

import { removeBackground } from '@imgly/background-removal';

const BgRemover = () => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [sliderValue, setSliderValue] = useState(50);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadFile = useCallback((f: File) => {
        if (!f.type.startsWith('image/')) { setError('Please upload an image file (JPG, PNG, WEBP).'); return; }
        setFile(f);
        setResult(null);
        setResultBlob(null);
        setError(null);
        setProgress(0);
        const url = URL.createObjectURL(f);
        setPreview(url);
    }, []);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
    };

    const handleRemove = async () => {
        if (!file) return;
        setIsProcessing(true);
        setError(null);
        setProgress(0);

        try {
            const blob = await removeBackground(file, {
                progress: (_key: string, current: number, total: number) => {
                    if (total > 0) {
                        const percent = Math.round((current / total) * 100);
                        setProgress(percent);
                    }
                }
            });
            setProgress(100);
            const url = URL.createObjectURL(blob);
            setResult(url);
            setResultBlob(blob);
            setSliderValue(50);
        } catch (err) {
            setError('Processing failed. The AI model might not have loaded properly.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!resultBlob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(resultBlob);
        a.download = `${file?.name.replace(/\.[^.]+$/, '') || 'result'}-no-bg.png`;
        a.click();
        toast.success('Downloaded! Check your Downloads folder.');
    };

    const handleReset = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
        setResultBlob(null);
        setError(null);
        setProgress(0);
    };

    return (
        <div className="pb-20 overflow-x-hidden">
            <Helmet>
                <title>Background Remover – QuickTools</title>
                <meta name="description" content="Remove image backgrounds instantly and for free. Our AI-powered background remover works in your browser — no uploads to external servers." />
            </Helmet>
            <div className="container px-4 pt-8 sm:pt-12 text-center max-w-4xl mx-auto">
                <h1 className="text-3xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    Background Remover
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground mb-8 sm:mb-12">
                    Remove image backgrounds automatically using AI-powered processing. Works best with solid backgrounds.
                </p>

                <AdSpace className="mb-8 sm:mb-12 border-green-500/20" />

                {/* Upload Area */}
                {!file ? (
                    <div
                        className={`glass-card rounded-2xl sm:rounded-3xl p-8 sm:p-12 mb-8 border-2 border-dashed transition-all duration-200 cursor-pointer ${isDragging ? 'border-green-500 bg-green-500/5 scale-[1.01]' : 'border-border/50 hover:border-green-500/50'}`}
                        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => e.target.files?.[0] && loadFile(e.target.files[0])}
                        />
                        <div className="flex flex-col items-center gap-4 pointer-events-none">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${isDragging ? 'bg-green-500 text-white' : 'bg-muted text-green-400'}`}>
                                <Upload size={30} />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-2">{isDragging ? 'Drop it here!' : 'Drag & Drop your image'}</h3>
                                <p className="text-muted-foreground text-sm">or click to browse — JPG, PNG, WEBP supported</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-8 mb-8">
                        {/* Preview Area */}
                        <div className="w-full max-w-3xl mx-auto mb-8 relative rounded-xl sm:rounded-2xl overflow-hidden border border-border/50 bg-muted/20" style={{ minHeight: 400 }}>
                            {result ? (
                                <div className="relative w-full h-full flex items-center justify-center min-h-[400px]"
                                     style={{
                                         backgroundImage: 'repeating-conic-gradient(#888 0% 25%, transparent 0% 50%)',
                                         backgroundSize: '20px 20px',
                                         backgroundPosition: '0 0, 10px 10px',
                                     }}
                                >
                                    <img src={preview!} alt="Original" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
                                    
                                    <div className="absolute inset-0 w-full h-full" style={{ clipPath: `inset(0 0 0 ${sliderValue}%)` }}>
                                        <img src={result} alt="Removed Background" className="w-full h-full object-contain pointer-events-none" />
                                    </div>

                                    <input type="range" min="0" max="100" value={sliderValue} onChange={e => setSliderValue(Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10" />
                                    
                                    <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] z-0 pointer-events-none border-x border-black/10" style={{ left: `${sliderValue}%` }}>
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-xl border border-gray-200">
                                            <div className="flex gap-1">
                                                <div className="w-0.5 h-3.5 bg-gray-400 rounded-full" />
                                                <div className="w-0.5 h-3.5 bg-gray-400 rounded-full" />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <span className="absolute top-4 left-4 bg-black/60 text-white text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wide backdrop-blur-md">Original</span>
                                    <span className="absolute top-4 right-4 bg-green-500/80 text-white text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wide backdrop-blur-md">Removed</span>
                                    
                                    <button
                                        onClick={handleReset}
                                        className="absolute bottom-4 right-4 w-9 h-9 bg-red-600/90 hover:bg-red-500 rounded-full flex items-center justify-center shadow-lg transition-colors z-20 text-white"
                                        title="Remove file"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center min-h-[400px]">
                                    <img src={preview!} alt="Original" className="w-full h-full object-contain p-4" />
                                    <button
                                        onClick={handleReset}
                                        className="absolute top-4 right-4 w-9 h-9 bg-red-600/80 hover:bg-red-500 rounded-full flex items-center justify-center shadow-lg transition-colors z-20 text-white"
                                        title="Remove file"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}

                            {isProcessing && (
                                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center text-foreground z-30">
                                    <div className="bg-card p-6 rounded-2xl shadow-2xl border border-border/50 text-center max-w-[280px] w-full mx-4">
                                        <Loader2 size={36} className="animate-spin text-green-500 mx-auto mb-4" />
                                        <p className="text-sm font-bold mb-3">AI Processing... {progress}%</p>
                                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden mb-2">
                                            <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                                        </div>
                                        {progress < 20 && <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed tracking-wide opacity-80">(Booting AI ONNX model locally. This ensures your image NEVER leaves your browser!)</p>}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg mb-4 text-sm text-destructive">
                                <X size={14} className="shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Success */}
                        {result && (
                            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg mb-4 text-sm text-green-400">
                                <CheckCircle2 size={14} className="shrink-0" />
                                Background removed successfully! Download your transparent PNG below.
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            {!result ? (
                                <button
                                    onClick={handleRemove}
                                    disabled={isProcessing}
                                    className="flex-1 sm:flex-none px-8 py-3 rounded-full bg-green-600 hover:bg-green-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/20"
                                >
                                    {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Layers size={18} />}
                                    {isProcessing ? `Removing… ${progress}%` : 'Remove Background'}
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={handleDownload}
                                        className="flex-1 sm:flex-none px-8 py-3 rounded-full bg-green-600 hover:bg-green-500 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-lg"
                                    >
                                        <Download size={18} /> Download PNG
                                    </button>
                                    <button
                                        onClick={handleRemove}
                                        className="flex-1 sm:flex-none px-6 py-3 rounded-full bg-muted hover:bg-muted/80 text-foreground font-medium flex items-center justify-center gap-2 transition-all"
                                    >
                                        <RefreshCw size={16} /> Try Again
                                    </button>
                                    <button
                                        onClick={handleReset}
                                        className="flex-1 sm:flex-none px-6 py-3 rounded-full bg-muted hover:bg-muted/80 text-foreground font-medium flex items-center justify-center gap-2 transition-all"
                                    >
                                        <Trash2 size={16} /> New Image
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* How it works */}
                <div className="grid sm:grid-cols-2 gap-6 text-left">
                    <div>
                        <h3 className="text-lg font-bold mb-4">How it works</h3>
                        <div className="space-y-4">
                            {[
                                'Upload your image (JPG, PNG, or WEBP).',
                                'Our AI downloads a high-precision edge-detection model directly to your browser.',
                                'The AI perfectly masks the foreground and slices out the background locally.',
                                'Play with the interactive sliders to inspect the result, then download the transparent PNG.',
                            ].map((step, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-xs font-bold text-green-400 shrink-0">{i + 1}</div>
                                    <p className="text-muted-foreground text-sm pt-0.5">{step}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div
                        className="glass-card p-6 rounded-2xl flex items-center justify-center"
                        style={{
                            backgroundImage: 'repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%)',
                            backgroundSize: '16px 16px',
                        }}
                    >
                        <div className="text-center bg-background/80 rounded-xl p-4">
                            <Image size={40} className="mx-auto text-green-400 mb-2" />
                            <p className="text-muted-foreground text-sm font-medium">Transparent Preview</p>
                            <p className="text-xs text-muted-foreground mt-1">Checkerboard = transparent</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BgRemover;
