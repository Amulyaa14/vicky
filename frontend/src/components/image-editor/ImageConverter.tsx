import { useState, useCallback } from 'react';
import { ArrowRight, Download, Loader2, ImageIcon, CheckCircle2, RefreshCcw } from 'lucide-react';
import Button from '@/components/ui/Button';

type OutputFormat = 'image/png' | 'image/jpeg' | 'image/webp';

interface FileEntry {
    file: File;
    previewUrl: string;
    status: 'idle' | 'converting' | 'done' | 'error';
    outputUrl: string | null;
    outputSize: number | null;
    errorMsg: string | null;
}

const FORMAT_OPTIONS: { value: OutputFormat; label: string; ext: string }[] = [
    { value: 'image/png', label: 'PNG (.png)', ext: 'png' },
    { value: 'image/jpeg', label: 'JPEG (.jpg)', ext: 'jpg' },
    { value: 'image/webp', label: 'WEBP (.webp)', ext: 'webp' },
];

const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const ImageConverter = () => {
    const [entries, setEntries] = useState<FileEntry[]>([]);
    const [outputFormat, setOutputFormat] = useState<OutputFormat>('image/png');
    const [quality, setQuality] = useState<number>(92);
    const [isConverting, setIsConverting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const addFiles = useCallback((files: FileList | File[]) => {
        const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (!arr.length) return;
        const newEntries: FileEntry[] = arr.map(f => ({
            file: f,
            previewUrl: URL.createObjectURL(f),
            status: 'idle',
            outputUrl: null,
            outputSize: null,
            errorMsg: null,
        }));
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
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d')!;
                // White background for JPEG (doesn't support transparency)
                if (fmt === 'image/jpeg') {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(blob => {
                    if (!blob) return reject(new Error('Conversion failed'));
                    resolve({ url: URL.createObjectURL(blob), size: blob.size });
                }, fmt, q / 100);
            };
            img.onerror = () => reject(new Error('Could not load image'));
            img.src = entry.previewUrl;
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
                    <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                        Image Format Converter
                    </h2>
                    <p className="text-muted-foreground">
                        Convert PNG, JPG, WEBP — instantly in your browser. Batch-supported.
                    </p>
                </div>

                {/* Upload & Config */}
                <div className="glass-card rounded-3xl p-8 mb-8">

                    {/* Drop Zone */}
                    <div
                        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={onDrop}
                        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer mb-0 ${isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-muted/20'}`}
                        onClick={() => document.getElementById('img-conv-input')?.click()}
                    >
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <ImageIcon size={32} />
                            </div>
                            <div>
                                <p className="font-semibold text-base mb-1">Drop images here or click to browse</p>
                                <p className="text-muted-foreground text-sm">Supports PNG, JPG, JPEG, WEBP — batch upload supported</p>
                            </div>
                        </div>
                        <input
                            id="img-conv-input"
                            type="file"
                            multiple
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            className="hidden"
                            onChange={onFileInput}
                        />
                    </div>

                    {/* Format & Quality Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 text-left">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Convert to</label>
                            <select
                                value={outputFormat}
                                onChange={e => { setOutputFormat(e.target.value as OutputFormat); setEntries(prev => prev.map(en => ({ ...en, status: 'idle', outputUrl: null, outputSize: null }))); }}
                                className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                            >
                                {FORMAT_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <label className="font-medium text-muted-foreground">Quality</label>
                                <span className="text-primary font-bold">{quality}%</span>
                            </div>
                            <input
                                type="range"
                                min="10" max="100" step="1"
                                value={quality}
                                onChange={e => { setQuality(Number(e.target.value)); setEntries(prev => prev.map(en => ({ ...en, status: 'idle', outputUrl: null, outputSize: null }))); }}
                                className="w-full accent-primary"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Higher quality = larger file size. Applies to JPEG &amp; WEBP.</p>
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
                                    <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border border-border bg-muted">
                                        <img src={entry.previewUrl} alt={entry.file.name} className="w-full h-full object-cover" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0 w-full">
                                        <p className="font-medium text-sm truncate" title={entry.file.name}>{entry.file.name}</p>
                                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                                            <span>Original: {formatBytes(entry.file.size)}</span>
                                            {entry.status === 'done' && entry.outputSize !== null && (
                                                <span className="text-green-500 font-medium">
                                                    → {fmt.ext.toUpperCase()}: {formatBytes(entry.outputSize)}
                                                    <span className="ml-1 text-green-500/80">
                                                        ({Math.round((1 - entry.outputSize / entry.file.size) * 100) > 0
                                                            ? `-${Math.round((1 - entry.outputSize / entry.file.size) * 100)}%`
                                                            : `+${Math.round((entry.outputSize / entry.file.size - 1) * 100)}%`})
                                                    </span>
                                                </span>
                                            )}
                                            {entry.status === 'error' && <span className="text-destructive">{entry.errorMsg}</span>}
                                        </div>
                                        {entry.status === 'converting' && (
                                            <div className="flex items-center gap-2 mt-1.5 text-xs text-primary">
                                                <Loader2 size={12} className="animate-spin" /> Converting…
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
