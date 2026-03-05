import { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Upload, RotateCcw, RotateCw, FlipHorizontal, FlipVertical, ZoomIn, ZoomOut, Maximize, Trash2, SlidersHorizontal } from 'lucide-react';

import Button from '@/components/ui/Button';

export interface EditorState {
    brightness: number;
    contrast: number;
    saturation: number;
    sharpness: number;
    rotation: number;
    flipH: boolean;
    flipV: boolean;
    filter: string;
}

const DEFAULT_STATE: EditorState = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sharpness: 0,
    rotation: 0,
    flipH: false,
    flipV: false,
    filter: 'none'
};

const FILTERS = [
    { name: 'None', value: 'none' },
    { name: 'Grayscale', value: 'grayscale(100%)' },
    { name: 'Sepia', value: 'sepia(100%)' },
    { name: 'Invert', value: 'invert(100%)' },
    { name: 'Vintage', value: 'sepia(50%) contrast(120%)' },
    { name: 'Cool', value: 'hue-rotate(180deg)' },
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const ImageEditorWorkspace = () => {
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [editorState, setEditorState] = useState<EditorState>(DEFAULT_STATE);
    const [zoom, setZoom] = useState(1);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                setImage(img);
                setEditorState(DEFAULT_STATE);
                setZoom(1);
            };
            if (typeof event.target?.result === 'string') {
                img.src = event.target.result;
            }
        };
        reader.readAsDataURL(file);
    };

    const applyChangesToCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !image) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // We draw slightly larger if rotated by 90/270 to fit bounds
        const radians = (editorState.rotation * Math.PI) / 180;

        // Calculate bounding box size after rotation to ensure it fits the canvas
        const w = image.width;
        const h = image.height;

        // For 90/270 deg, canvas dimensions are swapped
        if (editorState.rotation % 180 !== 0) {
            canvas.width = h;
            canvas.height = w;
        } else {
            canvas.width = w;
            canvas.height = h;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();

        // Move to center
        ctx.translate(canvas.width / 2, canvas.height / 2);

        // Rotate
        ctx.rotate(radians);

        // Flip
        ctx.scale(editorState.flipH ? -1 : 1, editorState.flipV ? -1 : 1);

        // Apply Filters and Adjustments
        const filterString = `${editorState.filter !== 'none' ? editorState.filter : ''} brightness(${editorState.brightness}%) contrast(${editorState.contrast}%) saturate(${editorState.saturation}%)`.trim();
        ctx.filter = filterString;

        // Draw the image centered
        ctx.drawImage(image, -w / 2, -h / 2, w, h);

        // Sharpness is applied via a simple convolution matrix on pixel data if needed, but for browser performance we use a simplified approach or leave it out of standard ctx.filter
        // Real sharpness requires pixel manipulation (omitted for speed unless strictly needed)

        ctx.restore();

    }, [image, editorState]);

    useEffect(() => {
        applyChangesToCanvas();
    }, [applyChangesToCanvas]);

    const handleDownload = () => {
        if (!canvasRef.current) return;
        const link = document.createElement('a');
        link.download = 'edited_image.png';
        link.href = canvasRef.current.toDataURL('image/png');
        link.click();
    };

    const updateState = (key: keyof EditorState, value: any) => {
        setEditorState(prev => ({ ...prev, [key]: value }));
    };

    const handleReset = () => {
        setImage(null);
        setEditorState(DEFAULT_STATE);
        setZoom(1);
    };

    return (
        <div className="flex flex-col lg:flex-row h-full w-full bg-background relative rounded-lg overflow-hidden border border-border">

            {/* Sidebar Controls */}
            <div className="w-full lg:w-80 bg-muted/20 border-r border-border flex flex-col pt-4 overflow-y-auto hidden lg:flex">
                <div className="px-4 pb-4 border-b border-border">
                    <h2 className="font-semibold flex items-center gap-2"><SlidersHorizontal size={18} /> Adjustments</h2>
                </div>

                {image ? (
                    <div className="p-4 space-y-6 flex-1 overflow-y-auto">
                        {/* Brightness */}
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span>Brightness</span>
                                <span className="text-muted-foreground">{editorState.brightness}%</span>
                            </div>
                            <input
                                type="range" min="0" max="200" value={editorState.brightness}
                                onChange={(e) => updateState('brightness', Number(e.target.value))}
                                className="w-full accent-primary"
                            />
                        </div>
                        {/* Contrast */}
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span>Contrast</span>
                                <span className="text-muted-foreground">{editorState.contrast}%</span>
                            </div>
                            <input
                                type="range" min="0" max="200" value={editorState.contrast}
                                onChange={(e) => updateState('contrast', Number(e.target.value))}
                                className="w-full accent-primary"
                            />
                        </div>
                        {/* Saturation */}
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span>Saturation</span>
                                <span className="text-muted-foreground">{editorState.saturation}%</span>
                            </div>
                            <input
                                type="range" min="0" max="200" value={editorState.saturation}
                                onChange={(e) => updateState('saturation', Number(e.target.value))}
                                className="w-full accent-primary"
                            />
                        </div>

                        {/* Transforms */}
                        <div className="pt-4 border-t border-border">
                            <h3 className="text-sm font-medium mb-3">Transforms</h3>
                            <div className="grid grid-cols-4 gap-2">
                                <Button variant="outline" size="sm" onClick={() => updateState('rotation', (editorState.rotation - 90) % 360)} title="Rotate Left">
                                    <RotateCcw size={16} />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => updateState('rotation', (editorState.rotation + 90) % 360)} title="Rotate Right">
                                    <RotateCw size={16} />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => updateState('flipH', !editorState.flipH)} title="Flip Horizontal">
                                    <FlipHorizontal size={16} />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => updateState('flipV', !editorState.flipV)} title="Flip Vertical">
                                    <FlipVertical size={16} />
                                </Button>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="pt-4 border-t border-border">
                            <h3 className="text-sm font-medium mb-3">Filters</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {FILTERS.map(f => (
                                    <Button
                                        key={f.name}
                                        variant={editorState.filter === f.value ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => updateState('filter', f.value)}
                                        className="text-xs"
                                    >
                                        {f.name}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 text-center text-muted-foreground text-sm flex-1 flex flex-col justify-center">
                        Upload an image to start editing.
                    </div>
                )}
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 bg-neutral-900 overflow-hidden relative flex flex-col">
                {/* Editor Toolbar (Top) */}
                {image && (
                    <div className="h-14 bg-background/80 backdrop-blur border-b border-border flex items-center justify-between px-4 absolute top-0 left-0 right-0 z-10">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => setZoom(z => clamp(z - 0.1, 0.1, 3))}><ZoomOut size={16} /></Button>
                            <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
                            <Button variant="outline" size="icon" onClick={() => setZoom(z => clamp(z + 0.1, 0.1, 3))}><ZoomIn size={16} /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setZoom(1)} title="Fit"><Maximize size={16} /></Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleReset}>
                                <Trash2 size={16} className="mr-2" /> Discard
                            </Button>
                            <Button onClick={handleDownload}>
                                <Download size={16} className="mr-2" /> Download
                            </Button>
                        </div>
                    </div>
                )}

                {/* Canvas / Upload Area */}
                <div className="flex-1 flex items-center justify-center p-4 lg:p-12 overflow-auto" style={{
                    backgroundImage: image ? 'radial-gradient(#333 1px, transparent 1px)' : 'none',
                    backgroundSize: '20px 20px'
                }}>
                    {!image ? (
                        <div className="w-full max-w-md bg-background rounded-xl p-8 border-2 border-dashed border-border flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary transition-colors hover:bg-muted/10 group" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                                <Upload size={32} />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Upload Image</h3>
                            <p className="text-muted-foreground text-sm mb-6">Drag and drop or click to browse</p>
                            <p className="text-xs text-muted-foreground">Supports PNG, JPG, JPEG, WEBP</p>
                        </div>
                    ) : (
                        <div className="relative shadow-2xl transition-transform ease-out duration-100" style={{ transform: `scale(${zoom})` }}>
                            <canvas ref={canvasRef} className="max-w-full max-h-full object-contain pointer-events-none rounded" />
                        </div>
                    )}
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={handleImageUpload}
                    />
                </div>
            </div>
        </div>
    );
};

export default ImageEditorWorkspace;
