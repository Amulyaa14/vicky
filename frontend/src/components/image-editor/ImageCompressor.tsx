import { useState, useRef } from 'react';
import { Download, Upload, FileImage, Settings2, Trash2, Zap } from 'lucide-react';
import Button from '@/components/ui/Button';


interface CompressedImage {
    originalFile: File;
    originalUrl: string;
    compressedUrl: string | null;
    originalSize: number;
    compressedSize: number | null;
    isCompressing: boolean;
}

const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const ImageCompressor = () => {
    const [images, setImages] = useState<CompressedImage[]>([]);
    const [quality, setQuality] = useState<number>(80);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newImages = files.map(file => ({
            originalFile: file,
            originalUrl: URL.createObjectURL(file),
            compressedUrl: null,
            originalSize: file.size,
            compressedSize: null,
            isCompressing: false
        }));

        setImages(prev => [...prev, ...newImages]);
    };

    const compressImage = async (imageInput: CompressedImage, idx: number, targetQuality: number) => {
        setImages(prev => prev.map((img, i) => i === idx ? { ...img, isCompressing: true } : img));

        const canvas = document.createElement('canvas');
        const img = new Image();
        img.src = imageInput.originalUrl;

        await new Promise((resolve) => {
            img.onload = () => resolve(true);
        });

        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);

        // Compress
        canvas.toBlob((blob) => {
            if (blob) {
                const compressedUrl = URL.createObjectURL(blob);
                setImages(prev => prev.map((item, i) => {
                    if (i === idx) {
                        return {
                            ...item,
                            compressedUrl,
                            compressedSize: blob.size,
                            isCompressing: false
                        };
                    }
                    return item;
                }));
            }
        }, 'image/jpeg', targetQuality / 100);
    };

    const handleCompressAll = () => {
        images.forEach((img, idx) => {
            compressImage(img, idx, quality);
        });
    };

    const handleDownload = (img: CompressedImage) => {
        if (!img.compressedUrl) return;
        const link = document.createElement('a');
        link.href = img.compressedUrl;

        const fileNameWithoutExt = img.originalFile.name.substring(0, img.originalFile.name.lastIndexOf('.')) || img.originalFile.name;
        link.download = `${fileNameWithoutExt} -min.jpg`;
        link.click();
    };

    const removeImage = (idx: number) => {
        setImages(prev => prev.filter((_, i) => i !== idx));
    };

    return (
        <div className="flex flex-col lg:flex-row h-full w-full bg-background relative rounded-lg overflow-hidden border border-border">
            {/* Sidebar Controls */}
            <div className="w-full lg:w-80 bg-muted/20 border-r border-border flex flex-col p-6 hidden lg:flex space-y-8">
                <div>
                    <h2 className="font-semibold flex items-center gap-2 mb-6"><Settings2 size={18} /> Compression Settings</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium">Quality Select</span>
                            <span className="text-primary font-bold">{quality}%</span>
                        </div>
                        <input
                            type="range"
                            min="10"
                            max="100"
                            step="5"
                            value={quality}
                            onChange={(e) => setQuality(Number(e.target.value))}
                            className="w-full accent-primary"
                        />
                        <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                            Lower quality results in a smaller file size but may reduce image clarity. 80% is recommended for web use.
                        </p>
                    </div>
                </div>

                <div className="pt-6 border-t border-border">
                    <Button
                        onClick={handleCompressAll}
                        disabled={images.length === 0}
                        className="w-full flex items-center justify-center gap-2"
                    >
                        <Zap size={16} /> Compress All
                    </Button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 overflow-auto p-6 bg-muted/5">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header Action */}
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-semibold">Workspace files</h3>
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
                            <Upload size={16} /> Add Images
                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            multiple
                            accept="image/*"
                            onChange={handleUpload}
                        />
                    </div>

                    {images.length === 0 ? (
                        <div className="w-full bg-background rounded-xl p-12 border-2 border-dashed border-border flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                                <FileImage size={32} />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No Images Selected</h3>
                            <p className="text-muted-foreground text-sm mb-6 max-w-sm">
                                Upload one or more images from to start compressing and see the magic happen.
                            </p>
                            <Button onClick={() => fileInputRef.current?.click()}>
                                Select Images
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {images.map((img, idx) => (
                                <div key={idx} className="bg-background border border-border rounded-lg p-4 flex flex-col sm:flex-row items-center gap-4 transition-all hover:border-primary/50 shadow-sm">
                                    <div className="w-24 h-24 rounded bg-muted/30 flex-shrink-0 flex items-center justify-center overflow-hidden border border-border relative">
                                        <img src={img.originalUrl} alt="original" className="max-w-full max-h-full object-contain" />
                                        {img.isCompressing && (
                                            <div className="absolute inset-0 bg-background/80 flex items-center justify-center backdrop-blur-sm">
                                                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 w-full min-w-0">
                                        <p className="font-medium truncate mb-1" title={img.originalFile.name}>
                                            {img.originalFile.name}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded">
                                                <span>Original:</span>
                                                <span className="font-semibold text-foreground">{formatBytes(img.originalSize)}</span>
                                            </div>
                                            {img.compressedSize && (
                                                <div className="flex items-center gap-1.5 bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-1 rounded">
                                                    <span>Compressed:</span>
                                                    <span className="font-semibold">{formatBytes(img.compressedSize)}</span>
                                                    <span className="text-xs ml-1 bg-green-500/20 px-1.5 rounded-full inline-block">
                                                        - {Math.round((1 - img.compressedSize / img.originalSize) * 100)}%
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 w-full sm:w-auto mt-4 sm:mt-0 justify-end">
                                        {img.compressedSize ? (
                                            <Button size="sm" onClick={() => handleDownload(img)} className="w-full sm:w-auto shrink-0">
                                                <Download size={16} className="mr-2" /> Download
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="secondary" onClick={() => compressImage(img, idx, quality)} disabled={img.isCompressing} className="w-full sm:w-auto shrink-0">
                                                <Zap size={16} className="mr-2" /> Compress
                                            </Button>
                                        )}
                                        <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10 shrink-0" onClick={() => removeImage(idx)}>
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageCompressor;
