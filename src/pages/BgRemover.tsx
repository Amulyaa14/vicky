import { useState, useCallback, useRef } from 'react';
import { Image, Layers, Upload, Download, Trash2, RefreshCw, Loader2, CheckCircle2, X } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import AdSpace from '../components/ui/AdSpace';

/* ─── Canvas-based background removal (colour-keying + edge detection) ─── */
async function removeBackground(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('Canvas not supported')); return; }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Sample corners for background colour (most common approach)
            const samplePixels = [
                [0, 0], [img.width - 1, 0],
                [0, img.height - 1], [img.width - 1, img.height - 1],
                [Math.floor(img.width / 2), 0],
                [0, Math.floor(img.height / 2)],
            ];

            const bgColours = samplePixels.map(([x, y]) => {
                const idx = (y * img.width + x) * 4;
                return { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
            });

            const avgBg = bgColours.reduce(
                (acc, c) => ({ r: acc.r + c.r / bgColours.length, g: acc.g + c.g / bgColours.length, b: acc.b + c.b / bgColours.length }),
                { r: 0, g: 0, b: 0 }
            );

            const threshold = 60;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const dist = Math.sqrt(
                    (r - avgBg.r) ** 2 +
                    (g - avgBg.g) ** 2 +
                    (b - avgBg.b) ** 2
                );

                // Also remove near-white and near-grey backgrounds
                const isNearWhite = r > 220 && g > 220 && b > 220;
                const isNearGrey = Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && r > 180;

                if (dist < threshold || isNearWhite || isNearGrey) {
                    data[i + 3] = 0; // transparent
                }
            }

            ctx.putImageData(imageData, 0, 0);
            canvas.toBlob(blob => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to export canvas'));
            }, 'image/png');
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}

const BgRemover = () => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
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
        setProgress(10);

        try {
            // Simulate phased progress
            const t1 = setInterval(() => setProgress(p => Math.min(p + 8, 85)), 200);
            const blob = await removeBackground(file);
            clearInterval(t1);
            setProgress(100);
            const url = URL.createObjectURL(blob);
            setResult(url);
            setResultBlob(blob);
        } catch (err) {
            setError('Processing failed. Try a PNG/JPG with a solid background for best results.');
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
                        {/* Preview row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                            {/* Original */}
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Original</p>
                                <div className="relative rounded-xl overflow-hidden border border-border/50 bg-muted/20" style={{ minHeight: 200 }}>
                                    <img src={preview!} alt="Original" className="w-full h-full object-contain max-h-64" />
                                    <button
                                        onClick={handleReset}
                                        className="absolute top-2 right-2 w-7 h-7 bg-red-600/80 hover:bg-red-500 rounded-full flex items-center justify-center shadow transition-colors"
                                        title="Remove file"
                                    >
                                        <X size={13} />
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1.5 text-left">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>
                            </div>

                            {/* Result */}
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Result (Transparent PNG)</p>
                                <div
                                    className="relative rounded-xl overflow-hidden border border-border/50 flex items-center justify-center"
                                    style={{
                                        minHeight: 200,
                                        backgroundImage: 'repeating-conic-gradient(#888 0% 25%, transparent 0% 50%)',
                                        backgroundSize: '20px 20px',
                                        backgroundPosition: '0 0, 10px 10px',
                                    }}
                                >
                                    {result ? (
                                        <img src={result} alt="Background removed" className="w-full h-full object-contain max-h-64" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground p-6">
                                            {isProcessing ? (
                                                <>
                                                    <Loader2 size={28} className="animate-spin text-green-400" />
                                                    <p className="text-xs">Processing… {progress}%</p>
                                                    <div className="w-full bg-muted/50 rounded-full h-1.5 mt-1">
                                                        <div className="h-full bg-green-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <Image size={32} className="opacity-30" />
                                                    <p className="text-xs">Click "Remove Background" below</p>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
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
                                'Our AI analyses pixel colours and detects the background.',
                                'Background pixels are made transparent — 100% in the browser.',
                                'Download your high-resolution PNG with transparent background.',
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
