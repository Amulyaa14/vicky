import { useState, useCallback } from 'react';
import { ArrowRight, Download, Loader2, ImageIcon, CheckCircle2, RefreshCcw, ChevronDown, Maximize2, X } from 'lucide-react';
import Button from '@/components/ui/Button';

type OutputFormat = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif' | 'image/bmp' | 'image/tiff' | 'image/svg+xml';

interface FormatOption {
    value: OutputFormat;
    label: string;
    ext: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
    { value: 'image/png', label: 'PNG (.png)', ext: 'png' },
    { value: 'image/jpeg', label: 'JPEG (.jpg)', ext: 'jpg' },
    { value: 'image/webp', label: 'WEBP (.webp)', ext: 'webp' },
    { value: 'image/gif', label: 'GIF (.gif)', ext: 'gif' },
    { value: 'image/bmp', label: 'BMP (.bmp)', ext: 'bmp' },
    { value: 'image/tiff', label: 'TIFF (.tiff)', ext: 'tiff' },
    { value: 'image/svg+xml', label: 'SVG (.svg)', ext: 'svg' },
];

const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

interface FileEntry {
    file: File;
    previewUrl: string;
    status: 'idle' | 'converting' | 'done' | 'error';
    outputUrl: string | null;
    outputSize: number | null;
    errorMsg: string | null;
    dimensions: { width: number; height: number } | null;
}

const ImageConverter = () => {
    const [entries, setEntries] = useState<FileEntry[]>([]);
    const [outputFormat, setOutputFormat] = useState<OutputFormat>('image/png');
    const [quality, setQuality] = useState<number>(90);
    const [isConverting, setIsConverting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    
    // New Advanced Options
    const [resizeWidth, setResizeWidth] = useState<number | ''>('');
    const [resizeHeight, setResizeHeight] = useState<number | ''>('');
    const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
    const [bgColor, setBgColor] = useState('#ffffff');
    const [resolution, setResolution] = useState(72);

    const addFiles = useCallback((files: FileList | File[]) => {
        const arr = Array.from(files).filter(f => 
            f.type.startsWith('image/') || 
            f.name.toLowerCase().endsWith('.heic') || 
            f.name.toLowerCase().endsWith('.heif') ||
            f.name.toLowerCase().endsWith('.tiff') ||
            f.name.toLowerCase().endsWith('.bmp') ||
            f.name.toLowerCase().endsWith('.svg')
        );
        if (!arr.length) return;
        
        const newEntries: FileEntry[] = arr.map(f => {
            const previewUrl = URL.createObjectURL(f);
            const entry: FileEntry = {
                file: f,
                previewUrl,
                status: 'idle',
                outputUrl: null,
                outputSize: null,
                errorMsg: null,
                dimensions: null,
            };
            
            // Get dimensions
            const img = new Image();
            img.onload = () => {
                setEntries(prev => prev.map(e => e.file === f ? { ...e, dimensions: { width: img.width, height: img.height } } : e));
            };
            img.src = previewUrl;
            
            return entry;
        });
        setEntries(prev => [...prev, ...newEntries]);
    }, []);

    const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) addFiles(e.target.files);
        e.target.value = '';
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
    };

    const removeEntry = (idx: number) => {
        setEntries(prev => {
            const next = [...prev];
            URL.revokeObjectURL(next[idx].previewUrl);
            if (next[idx].outputUrl) URL.revokeObjectURL(next[idx].outputUrl!);
            next.splice(idx, 1);
            return next;
        });
    };

    const convertSingle = async (entry: FileEntry, fmt: OutputFormat, q: number): Promise<{ url: string; size: number }> => {
        return new Promise(async (resolve, reject) => {
            let finalFile = entry.file;

            // Handle HEIC/HEIF (If library available)
            if (entry.file.name.toLowerCase().match(/\.heic$|\.heif$/)) {
                try {
                    // Try to use heic2any if it's in scope (simplified check)
                    const heic2any = (window as any).heic2any;
                    if (heic2any) {
                        const blob = await heic2any({ blob: entry.file, toType: "image/jpeg" });
                        finalFile = new File([blob as Blob], "temp.jpg", { type: "image/jpeg" });
                    }
                } catch (e) {
                    console.warn("HEIC conversion failed:", e);
                }
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Special case: Raster to SVG approximation
                    if (fmt === 'image/svg+xml') {
                        const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${resizeWidth || img.width}" height="${resizeHeight || img.height}">
                            <image href="${e.target?.result}" width="100%" height="100%" />
                        </svg>`;
                        const blob = new Blob([svgString], { type: 'image/svg+xml' });
                        return resolve({ url: URL.createObjectURL(blob), size: blob.size });
                    }

                    const canvas = document.createElement('canvas');
                    const w = Number(resizeWidth) || img.width;
                    const h = Number(resizeHeight) || img.height;
                    canvas.width = w;
                    canvas.height = h;
                    
                    const ctx = canvas.getContext('2d')!;
                    
                    // Fill background if needed (Transparency handling)
                    if (fmt === 'image/jpeg' || (bgColor && bgColor !== 'transparent')) {
                        ctx.fillStyle = bgColor || '#ffffff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                    
                    ctx.drawImage(img, 0, 0, w, h);
                    
                    canvas.toBlob(blob => {
                        if (!blob) return reject(new Error('Conversion failed'));
                        resolve({ url: URL.createObjectURL(blob), size: blob.size });
                    }, fmt, q / 100);
                };
                img.onerror = () => reject(new Error('Could not load image'));
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(finalFile);
        });
    };

    const handleConvertAll = async () => {
        const idleEntries = entries.filter(e => e.status === 'idle' || e.status === 'error');
        if (!idleEntries.length) return;
        setIsConverting(true);
        setProgress(0);

        const total = entries.length;
        let done = 0;

        const nextEntries = [...entries];
        for (let i = 0; i < nextEntries.length; i++) {
            if (nextEntries[i].status === 'done') { done++; setProgress(Math.round((done / total) * 100)); continue; }
            nextEntries[i] = { ...nextEntries[i], status: 'converting' };
            setEntries([...nextEntries]);

            try {
                const { url, size } = await convertSingle(nextEntries[i], outputFormat, quality);
                nextEntries[i] = { ...nextEntries[i], status: 'done', outputUrl: url, outputSize: size, errorMsg: null };
            } catch (err: any) {
                nextEntries[i] = { ...nextEntries[i], status: 'error', errorMsg: err.message };
            }
            done++;
            setProgress(Math.round((done / total) * 100));
            setEntries([...nextEntries]);
        }

        setIsConverting(false);
    };

    const handleDownloadSingle = (entry: FileEntry) => {
        if (!entry.outputUrl) return;
        const fmt = FORMAT_OPTIONS.find(f => f.value === outputFormat)!;
        const baseName = entry.file.name.replace(/\.[^.]+$/, '');
        const a = document.createElement('a');
        a.href = entry.outputUrl;
        a.download = `${baseName}.${fmt.ext}`;
        a.click();
    };

    const handleDownloadAll = () => {
        entries.filter(e => e.status === 'done').forEach((e, i) => {
            setTimeout(() => handleDownloadSingle(e), i * 100);
        });
    };

    const handleReset = () => {
        entries.forEach(e => {
            URL.revokeObjectURL(e.previewUrl);
            if (e.outputUrl) URL.revokeObjectURL(e.outputUrl);
        });
        setEntries([]);
        setProgress(0);
    };

    const doneCount = entries.filter(e => e.status === 'done').length;
    const allDone = doneCount > 0 && doneCount === entries.length;

    return (
        <div className="flex-1 flex flex-col">
            <div className="container px-4 pt-10 pb-20 max-w-4xl mx-auto w-full">

                {/* Header */}
                <div className="text-center mb-10">
                    <h2 className="text-4xl font-black mb-3 tracking-tighter bg-gradient-to-br from-indigo-400 via-fuchsia-400 to-amber-400 bg-clip-text text-transparent">
                        Professional Image Converter
                    </h2>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        High-performance conversion for Raster & Vector formats. 
                        Resize, adjust quality, and batch process instantly.
                    </p>
                </div>

                {/* Upload & Config */}
                <div className="glass-card rounded-3xl p-8 mb-8">

                    {/* Drop Zone */}
                    <div
                        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={onDrop}
                        className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer group ${isDragging ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-border/60 hover:border-primary/50 hover:bg-muted/30'}`}
                        onClick={() => document.getElementById('img-conv-input')?.click()}
                    >
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                                <ImageIcon size={40} />
                            </div>
                            <div className="space-y-1">
                                <p className="font-bold text-xl">Drag images here or browse</p>
                                <p className="text-muted-foreground text-sm font-medium">
                                    HEIC, TIFF, BMP, SVG, PNG, JPG, WEBP — No file limits
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 bg-muted rounded-full text-[10px] uppercase font-bold tracking-widest text-muted-foreground border border-border">Raster</span>
                                <span className="px-3 py-1 bg-primary/10 rounded-full text-[10px] uppercase font-bold tracking-widest text-primary border border-primary/20">Vector</span>
                            </div>
                        </div>
                        <input
                            id="img-conv-input"
                            type="file"
                            multiple
                            accept="image/*,.heic,.heif,.tiff,.bmp,.svg"
                            className="hidden"
                            onChange={onFileInput}
                        />
                    </div>

                    {/* Extended Configuration */}
                    <div className="mt-10 space-y-8">
                        {/* Format & Quality */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                                    <RefreshCcw size={14} className="text-primary" /> Target Format
                                </label>
                                <div className="relative">
                                    <select
                                        value={outputFormat}
                                        onChange={e => { setOutputFormat(e.target.value as OutputFormat); setEntries(prev => prev.map(en => ({ ...en, status: 'idle', outputUrl: null, outputSize: null }))); }}
                                        className="w-full bg-muted/50 border border-border/50 rounded-xl px-5 py-4 text-foreground font-semibold focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer hover:bg-muted"
                                    >
                                        {FORMAT_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <label className="font-bold text-foreground">Output Quality</label>
                                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg font-bold">{quality}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="1" max="100" step="1"
                                    value={quality}
                                    onChange={e => { setQuality(Number(e.target.value)); setEntries(prev => prev.map(en => ({ ...en, status: 'idle', outputUrl: null, outputSize: null }))); }}
                                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Affects JPEG, WebP, and TIFF compression</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left p-6 bg-muted/20 rounded-2xl border border-border/40">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Width (px)</label>
                                <input 
                                    type="number" 
                                    placeholder="Original"
                                    value={resizeWidth}
                                    onChange={e => {
                                        const w = e.target.value ? Number(e.target.value) : '';
                                        setResizeWidth(w);
                                        if (maintainAspectRatio && w && entries[0]?.dimensions) {
                                            const ratio = entries[0].dimensions.height / entries[0].dimensions.width;
                                            setResizeHeight(Math.round(Number(w) * ratio));
                                        }
                                    }}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Height (px)</label>
                                <input 
                                    type="number" 
                                    placeholder="Original"
                                    value={resizeHeight}
                                    onChange={e => {
                                        const h = e.target.value ? Number(e.target.value) : '';
                                        setResizeHeight(h);
                                        if (maintainAspectRatio && h && entries[0]?.dimensions) {
                                            const ratio = entries[0].dimensions.width / entries[0].dimensions.height;
                                            setResizeWidth(Math.round(Number(h) * ratio));
                                        }
                                    }}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
                                />
                            </div>
                            <div className="flex items-center gap-3 md:pt-6">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={maintainAspectRatio} onChange={() => setMaintainAspectRatio(!maintainAspectRatio)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    <span className="ml-3 text-xs font-bold text-muted-foreground">Lock Aspect Ratio</span>
                                </label>
                            </div>
                        </div>

                        {/* Background & Colors */}
                        <div className="flex flex-wrap items-center gap-6 text-left">
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-bold text-foreground">Background Color:</label>
                                <div className="flex gap-2">
                                    {['#ffffff', '#000000', 'transparent'].map(c => (
                                        <button 
                                            key={c} 
                                            onClick={() => setBgColor(c)}
                                            className={`w-8 h-8 rounded-lg border-2 transition-all ${bgColor === c ? 'border-primary ring-2 ring-primary/20 scale-110' : 'border-border hover:border-primary/50'}`}
                                            style={{ backgroundColor: c === 'transparent' ? '#fff' : c, backgroundImage: c === 'transparent' ? 'linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%, #eee), linear-gradient(45deg, #eee 25%, #fff 25%, #fff 75%, #eee 75%, #eee)' : 'none', backgroundSize: '10px 10px', backgroundPosition: '0 0, 5px 5px' }}
                                            title={c === 'transparent' ? 'Transparent' : c}
                                        />
                                    ))}
                                    <input type="color" value={bgColor === 'transparent' ? '#ffffff' : bgColor} onChange={e => setBgColor(e.target.value)} className="w-8 h-8 p-0 border-0 bg-transparent cursor-pointer" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-8 pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            {isConverting && (
                                <div className="flex items-center gap-3 text-sm text-primary">
                                    <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                                    </div>
                                    <span>{progress}%</span>
                                </div>
                            )}
                            {allDone && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-sm font-medium border border-green-500/20">
                                    <CheckCircle2 size={14} />
                                    All {doneCount} {doneCount === 1 ? 'image' : 'images'} converted!
                                </span>
                            )}
                        </div>

                        <div className="flex gap-3 flex-wrap justify-end">
                            {entries.length > 0 && (
                                <button
                                    onClick={handleReset}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-muted text-muted-foreground text-sm font-medium border border-border hover:bg-muted/80 transition-all"
                                >
                                    <RefreshCcw size={15} /> Reset
                                </button>
                            )}
                            {allDone && (
                                <button
                                    onClick={handleDownloadAll}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-all shadow-lg shadow-green-500/25"
                                >
                                    <Download size={16} /> Download All
                                </button>
                            )}
                            <button
                                onClick={handleConvertAll}
                                disabled={!entries.length || isConverting}
                                className={`px-8 py-2.5 rounded-full font-semibold flex items-center gap-2 transition-all ${!entries.length || isConverting ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40'}`}
                            >
                                {isConverting ? <Loader2 className="animate-spin" size={18} /> : <><Download size={16} /> Convert & Download</>}
                                {!isConverting && <ArrowRight size={16} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* File List */}
                {entries.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground px-1">
                            Queued Files ({entries.length})
                        </h3>
                        {entries.map((entry, idx) => {
                            const fmt = FORMAT_OPTIONS.find(f => f.value === outputFormat)!;
                            return (
                                <div
                                    key={idx}
                                    className={`flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border transition-all ${entry.status === 'done' ? 'border-green-500/30 bg-green-500/5' : entry.status === 'error' ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-card'}`}
                                >
                                    {/* Thumbnail */}
                                    <div className="w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 border-border/50 bg-muted/30 group">
                                        <img src={entry.previewUrl} alt={entry.file.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    </div>
 
                                    {/* Info */}
                                    <div className="flex-1 min-w-0 w-full text-left">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-bold text-sm truncate" title={entry.file.name}>{entry.file.name}</p>
                                            <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold uppercase text-muted-foreground border border-border">
                                                {entry.file.name.split('.').pop()?.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground font-medium">
                                            <span className="flex items-center gap-1"><ArrowRight size={10} /> Original: {formatBytes(entry.file.size)}</span>
                                            {entry.dimensions && (
                                                <span className="flex items-center gap-1">
                                                    <Maximize2 size={10} /> {entry.dimensions.width}×{entry.dimensions.height}
                                                </span>
                                            )}
                                            {entry.status === 'done' && entry.outputSize !== null && (
                                                <div className="flex items-center gap-2 text-green-500 font-bold">
                                                    <span className="flex items-center gap-1">
                                                        <CheckCircle2 size={12} /> {fmt.ext.toUpperCase()}: {formatBytes(entry.outputSize)}
                                                    </span>
                                                    <span className="text-[10px] bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                                                        {Math.round((1 - entry.outputSize / entry.file.size) * 100) > 0
                                                            ? `Save ${Math.round((1 - entry.outputSize / entry.file.size) * 100)}%`
                                                            : `+${Math.round((entry.outputSize / entry.file.size - 1) * 100)}%`}
                                                    </span>
                                                </div>
                                            )}
                                            {entry.status === 'error' && <span className="text-destructive bg-destructive/10 px-2 rounded flex items-center gap-1 mt-1"><X size={12}/> {entry.errorMsg}</span>}
                                        </div>
                                        {entry.status === 'converting' && (
                                            <div className="flex items-center gap-2 mt-2 text-primary font-bold">
                                                <Loader2 size={14} className="animate-spin text-primary" /> 
                                                <span className="text-[11px] uppercase tracking-widest">Optimizing &amp; Converting…</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                                        {entry.status === 'done' && (
                                            <Button size="sm" onClick={() => handleDownloadSingle(entry)}>
                                                <Download size={14} className="mr-1" /> Download
                                            </Button>
                                        )}
                                        <button
                                            onClick={() => removeEntry(idx)}
                                            className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded hover:bg-destructive/10"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Feature Cards */}
                {entries.length === 0 && (
                    <div className="grid md:grid-cols-3 gap-6 text-left">
                        {[
                            { title: 'Client-Side Only', desc: 'All conversion happens in your browser. Your images never leave your device.' },
                            { title: 'Batch Convert', desc: 'Upload multiple images at once and convert them all with a single click.' },
                            { title: 'Multiple Formats', desc: 'Convert between PNG, JPEG, and WEBP with custom quality settings.' },
                        ].map(item => (
                            <div key={item.title} className="p-6 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors">
                                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                                <p className="text-sm text-muted-foreground">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageConverter;
