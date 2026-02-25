import React, { useState, useRef, useEffect } from 'react';
import {
    X,
    Undo2,
    Redo2,
    Save,
    Type,
    Bold,
    Italic,
    Underline,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Search,
    ChevronDown,
    Menu,
    Settings,
    HelpCircle,
    Info,
    Layout,
    Scissors,
    Copy,
    Clipboard,
    MousePointer2,
    Pencil,
    Download,
    Eye,
    Minus,
    Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExtractedTextItem {
    str: string;
    x: number;
    y: number;
    fontSize: number;
    fontName: string;
    width: number;
    isBold: boolean;
}

interface ExtractedLine {
    items: ExtractedTextItem[];
    y: number;
    x: number;
    text: string;
    fontSize: number;
    isBold: boolean;
    isHeading: boolean;
    isBullet: boolean;
}

interface ExtractedPage {
    lines: ExtractedLine[];
    width: number;
    height: number;
}

interface WordEditorProps {
    pages: ExtractedPage[];
    onClose: () => void;
    onUpdateLine: (pageIdx: number, lineIdx: number, newText: string) => void;
    initialMode?: 'edit' | 'preview';
    onDownload?: () => void;
    onUpdateLineStyle?: (pageIdx: number, lineIdx: number, styles: Partial<ExtractedLine>) => void;
}

const WordEditor: React.FC<WordEditorProps> = ({
    pages,
    onClose,
    onUpdateLine,
    initialMode = 'preview',
    onDownload,
    onUpdateLineStyle
}) => {
    const [mode, setMode] = useState<'edit' | 'preview'>(initialMode);
    const [activeTab, setActiveTab] = useState('Home');
    const [scale, setScale] = useState(0.85);
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedPage, setSelectedPage] = useState(0);
    const [focusedLine, setFocusedLine] = useState<{ pageIdx: number, lineIdx: number } | null>(null);

    const tabs = ['File', 'Home', 'Insert', 'Design', 'Layout', 'References', 'Mailings', 'Review', 'View'];

    // Scroll listener to update page indicator
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const scrollTop = container.scrollTop;
            const pageHeight = (pages[0]?.height || 842) * scale + 48; // height + gap
            const currentPage = Math.floor(scrollTop / pageHeight);
            if (currentPage >= 0 && currentPage < pages.length) {
                setSelectedPage(currentPage);
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [pages, scale]);

    return (
        <div className={cn(
            "fixed inset-0 z-[100] flex flex-col overflow-hidden selection:bg-blue-500/30",
            mode === 'preview' ? "bg-[#525659] text-white" : "bg-[#f3f2f1] text-[#323130]"
        )}>
            {/* Conditional Header/Toolbar */}
            {mode === 'preview' ? (
                /* Professional PDF Toolbar */
                <div className="h-12 bg-[#323639] flex items-center justify-between px-4 shrink-0 shadow-lg z-10 text-white border-b border-black/20">
                    {/* Left: Branding & Edit Toggle */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-red-600 rounded">
                                <Type size={18} className="text-white" />
                            </div>
                            <span className="text-sm font-medium hidden md:inline-block">Document Preview</span>
                        </div>
                        <div className="h-6 w-px bg-white/10 mx-1" />
                        <button
                            onClick={() => setMode('edit')}
                            className="flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-xs font-medium text-white/80 hover:bg-white/10"
                        >
                            <Pencil size={14} />
                            Edit Document
                        </button>
                    </div>

                    {/* Center: Page & Zoom Controls */}
                    <div className="flex items-center gap-6 bg-[#202124] px-4 py-1 rounded-md">
                        <div className="flex items-center gap-2 text-xs font-medium border-r border-white/10 pr-4">
                            <input
                                type="text"
                                value={selectedPage + 1}
                                readOnly
                                className="w-8 bg-[#323639] border-none text-center py-0.5 rounded focus:outline-none"
                            />
                            <span className="text-white/60">/ {pages.length}</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setScale(Math.max(0.3, scale - 0.1))}
                                className="p-1 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <Minus size={16} />
                            </button>
                            <span className="text-xs font-medium min-w-[3rem] text-center">
                                {Math.round(scale * 100)}%
                            </span>
                            <button
                                onClick={() => setScale(Math.min(3, scale + 0.1))}
                                className="p-1 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        {onDownload && (
                            <button
                                onClick={onDownload}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                title="Download PDF"
                            >
                                <Download size={18} />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-red-500 rounded-full transition-colors ml-2"
                            title="Close"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            ) : (
                /* Microsoft Word Style Header */
                <header className="shrink-0">
                    {/* Title Bar */}
                    <div className="h-10 bg-[#2b579a] flex items-center justify-between px-4 text-white shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="bg-white/10 p-1 rounded hover:bg-white/20 cursor-pointer" onClick={() => alert('Changes saved!')}>
                                    <Save size={16} />
                                </div>
                                <div className="bg-white/10 p-1 rounded hover:bg-white/20 cursor-pointer">
                                    <Undo2 size={16} />
                                </div>
                                <div className="bg-white/10 p-1 rounded hover:bg-white/20 cursor-pointer opacity-50">
                                    <Redo2 size={16} />
                                </div>
                            </div>
                            <div className="h-4 w-px bg-white/20" />
                            <span className="text-sm font-medium">Document1 - Word</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    alert('Changes saved successfully!');
                                }}
                                className="h-8 px-3 bg-[#4a88da] hover:bg-[#3b70b5] rounded text-xs font-medium transition-colors flex items-center gap-1.5"
                            >
                                <Save size={14} />
                                Save
                            </button>
                            <button
                                onClick={() => setMode('preview')}
                                className="h-8 px-3 bg-white text-[#2b579a] hover:bg-white/90 rounded text-xs font-medium transition-colors flex items-center gap-1.5"
                            >
                                <Eye size={14} />
                                Preview
                            </button>
                            {onDownload && (
                                <button
                                    onClick={onDownload}
                                    className="h-8 px-3 bg-[#107c10] hover:bg-[#0b5a0b] rounded text-xs font-medium transition-colors flex items-center gap-1.5"
                                >
                                    <Download size={14} />
                                    Download PDF
                                </button>
                            )}
                            <div className="w-2" />
                            <button onClick={onClose} className="h-10 px-4 hover:bg-red-600 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Ribbon Tabs */}
                    <div className="bg-[#2b579a] flex items-end shrink-0 select-none">
                        {tabs.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "px-4 py-1.5 text-xs font-semibold transition-colors rounded-t-sm mx-0.5",
                                    activeTab === tab
                                        ? "bg-[#f3f2f1] text-[#2b579a]"
                                        : "text-white hover:bg-white/10"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                        <div className="flex-1" />
                        <div className="px-4 py-2 flex items-center gap-2 text-white/80 hover:text-white cursor-pointer group">
                            <span className="text-xs">Tell me what you want to do</span>
                            <HelpCircle size={14} />
                        </div>
                    </div>

                    {/* Ribbon Content */}
                    <div className="h-[100px] bg-[#f3f2f1] border-b border-[#dadada] flex items-center px-4 gap-6 overflow-x-auto shrink-0 select-none shadow-sm">
                        {activeTab === 'Home' && (
                            <>
                                {/* Clipboard Section */}
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <div className="flex flex-col items-center border border-transparent hover:border-[#dadada] hover:bg-white p-1 rounded cursor-pointer">
                                            <Clipboard size={24} className="text-[#2b579a]" />
                                            <span className="text-[10px] mt-1">Paste</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 px-2 py-0.5 hover:bg-white border border-transparent hover:border-[#dadada] rounded cursor-pointer">
                                                <Scissors size={14} />
                                                <span className="text-[10px]">Cut</span>
                                            </div>
                                            <div className="flex items-center gap-2 px-2 py-0.5 hover:bg-white border border-transparent hover:border-[#dadada] rounded cursor-pointer">
                                                <Copy size={14} />
                                                <span className="text-[10px]">Copy</span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-[#605e5c]">Clipboard</span>
                                </div>

                                <div className="h-16 w-px bg-[#dadada]" />

                                {/* Font Section */}
                                <div className="flex flex-col items-center gap-1 shrink-0 text-[#323130]">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-1">
                                            <div className="bg-white border border-[#dadada] rounded px-2 py-0.5 text-xs flex items-center justify-between w-32 cursor-default">
                                                <span>Calibri (Body)</span>
                                                <ChevronDown size={12} />
                                            </div>
                                            <div className="bg-white border border-[#dadada] rounded px-2 py-0.5 text-xs flex items-center justify-between w-12 cursor-default">
                                                <span>11</span>
                                                <ChevronDown size={12} />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-0.5">
                                            <button
                                                className={cn(
                                                    "p-1 hover:bg-white border border-transparent hover:border-[#dadada] rounded transition-colors",
                                                    focusedLine && pages[focusedLine.pageIdx]?.lines[focusedLine.lineIdx]?.isBold && "bg-white border-[#dadada]"
                                                )}
                                                onClick={() => focusedLine && onUpdateLineStyle?.(focusedLine.pageIdx, focusedLine.lineIdx, { isBold: !pages[focusedLine.pageIdx]?.lines[focusedLine.lineIdx]?.isBold })}
                                            >
                                                <Bold size={16} />
                                            </button>
                                            <button className="p-1 hover:bg-white border border-transparent hover:border-[#dadada] rounded transition-colors"><Italic size={16} /></button>
                                            <button className="p-1 hover:bg-white border border-transparent hover:border-[#dadada] rounded transition-colors"><Underline size={16} /></button>
                                            <div className="w-px h-6 bg-[#dadada] mx-1" />
                                            <button className="p-1 hover:bg-white border border-transparent hover:border-[#dadada] rounded transition-colors opacity-50"><Type size={16} className="text-red-600" /></button>
                                            <button className="p-1 hover:bg-white border border-transparent hover:border-[#dadada] rounded transition-colors opacity-50"><Settings size={16} /></button>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-[#605e5c]">Font</span>
                                </div>

                                <div className="h-16 w-px bg-[#dadada]" />

                                {/* Paragraph Section */}
                                <div className="flex flex-col items-center gap-1 shrink-0 text-[#323130]">
                                    <div className="grid grid-cols-4 gap-1">
                                        <button className="p-1 hover:bg-white border border-transparent hover:border-[#dadada] rounded transition-colors bg-white border-[#dadada]"><AlignLeft size={16} /></button>
                                        <button className="p-1 hover:bg-white border border-transparent hover:border-[#dadada] rounded transition-colors"><AlignCenter size={16} /></button>
                                        <button className="p-1 hover:bg-white border border-transparent hover:border-[#dadada] rounded transition-colors"><AlignRight size={16} /></button>
                                        <button className="p-1 hover:bg-white border border-transparent hover:border-[#dadada] rounded transition-colors"><AlignJustify size={16} /></button>
                                        <div className="col-span-4 h-px bg-transparent" />
                                        <button className="p-1 hover:bg-white border border-transparent hover:border-[#dadada] rounded transition-colors"><Menu size={16} /></button>
                                        <button className="p-1 hover:bg-white border border-transparent hover:border-[#dadada] rounded transition-colors"><Info size={16} /></button>
                                        <button className="p-1 hover:bg-white border border-transparent hover:border-[#dadada] rounded transition-colors"><Layout size={16} /></button>
                                        <button className="p-1 hover:bg-white border border-transparent hover:border-[#dadada] rounded transition-colors"><MousePointer2 size={16} /></button>
                                    </div>
                                    <span className="text-[10px] text-[#605e5c]">Paragraph</span>
                                </div>
                            </>
                        )}
                        {activeTab !== 'Home' && (
                            <div className="flex-1 flex items-center justify-center text-[#605e5c] text-sm italic">
                                Toolbar controls for {activeTab} coming soon...
                            </div>
                        )}
                    </div>
                </header>
            )}

            {/* Main Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Navigation Sidebar (Only in Word Mode) */}
                {mode === 'edit' && (
                    <div className="w-[200px] border-r border-[#dadada] bg-white flex flex-col shrink-0">
                        <div className="p-3 border-b border-[#dadada]">
                            <h4 className="text-sm font-semibold text-[#2b579a]">Navigation</h4>
                            <div className="mt-2 relative">
                                <input
                                    type="text"
                                    placeholder="Search document"
                                    className="w-full text-xs bg-[#f3f2f1] border border-[#dadada] rounded px-7 py-1 focus:outline-none focus:border-[#2b579a]"
                                />
                                <Search size={12} className="absolute left-2 top-1.5 text-[#605e5c]" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-4 space-y-2">
                                {pages[0]?.lines.filter(l => l.isHeading).slice(0, 10).map((heading, idx) => (
                                    <div key={idx} className="flex gap-2 group cursor-pointer hover:bg-[#f3f2f1] p-1 rounded">
                                        <div className="w-1.5 h-1.5 mt-1 bg-[#2b579a] rounded-sm shrink-0" />
                                        <span className="text-[11px] text-[#323130] truncate">{heading.text}</span>
                                    </div>
                                ))}
                                {(!pages[0]?.lines.some(l => l.isHeading)) && (
                                    <div className="text-[10px] text-[#605e5c] italic">No headings found.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Content Surface */}
                <div
                    ref={containerRef}
                    className={cn(
                        "flex-1 overflow-auto p-12 scroll-smooth flex flex-col items-center gap-12",
                        mode === 'preview' ? "bg-[#525659]" : "bg-[#e6e6e6]"
                    )}
                >
                    {pages.map((page, pi) => (
                        <div
                            key={pi}
                            className={cn(
                                "relative bg-white shrink-0 group transition-shadow",
                                mode === 'preview' ? "shadow-[0_4px_20px_rgba(0,0,0,0.3)]" : "shadow-[0_2px_10px_rgba(0,0,0,0.15)] ring-1 ring-black/5"
                            )}
                            style={{
                                width: `${page.width}px`,
                                height: `${page.height}px`,
                                transform: `scale(${scale})`,
                                transformOrigin: 'top center',
                                marginBottom: `${(page.height * scale) - page.height}px`,
                            }}
                        >
                            {page.lines.map((line, li) => (
                                <div
                                    key={li}
                                    contentEditable={mode === 'edit'}
                                    suppressContentEditableWarning
                                    onFocus={() => mode === 'edit' && setFocusedLine({ pageIdx: pi, lineIdx: li })}
                                    onBlur={(e) => {
                                        if (mode === 'edit') {
                                            onUpdateLine(pi, li, e.currentTarget.textContent || '');
                                        }
                                    }}
                                    className={cn(
                                        "absolute whitespace-nowrap outline-none px-1 -mx-1 rounded transition-all text-black",
                                        mode === 'edit' && "hover:bg-blue-100/50 hover:ring-1 hover:ring-blue-300 focus:bg-blue-100 focus:ring-1 focus:ring-blue-400",
                                        focusedLine?.pageIdx === pi && focusedLine?.lineIdx === li && "ring-1 ring-blue-400 bg-blue-50/50"
                                    )}
                                    style={{
                                        left: `${line.x}px`,
                                        top: `${line.y}px`,
                                        fontSize: `${line.fontSize}px`,
                                        fontWeight: line.isBold || line.isHeading ? 700 : 400,
                                        fontFamily: mode === 'preview' ? 'Inter, system-ui, sans-serif' : 'Calibri, "Segoe UI", sans-serif',
                                        transform: 'translateY(-70%)',
                                        minWidth: '10px',
                                        minHeight: '1em'
                                    }}
                                >
                                    {line.text}
                                </div>
                            ))}

                            {/* Page Indicator (Only in Edit mode) */}
                            {mode === 'edit' && (
                                <div className="absolute -bottom-6 left-0 right-0 text-center text-[10px] text-[#605e5c] select-none">
                                    Page {pi + 1} of {pages.length}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Word Status Bar (Only in Edit Mode) */}
            {mode === 'edit' && (
                <div className="h-[22px] bg-[#2b579a] flex items-center justify-between px-3 text-white text-[10px] shrink-0 select-none">
                    <div className="flex items-center gap-4">
                        <span>Page {selectedPage + 1} of {pages.length}</span>
                        <span>{pages.reduce((acc, p) => acc + p.lines.reduce((lacc, l) => lacc + l.text.split(/\s+/).length, 0), 0)} words</span>
                        <div className="flex items-center gap-1 opacity-80">
                            <Info size={10} />
                            <span>English (United States)</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setScale(Math.max(0.2, scale - 0.05))} className="hover:bg-white/20 px-1 rounded">-</button>
                            <div className="w-24 h-1 bg-white/20 rounded-full overflow-hidden relative">
                                <div className="absolute top-0 bottom-0 left-0 bg-white" style={{ width: `${scale * 100}%` }} />
                            </div>
                            <button onClick={() => setScale(Math.min(2, scale + 0.05))} className="hover:bg-white/20 px-1 rounded">+</button>
                            <span className="w-8 text-right font-medium">{Math.round(scale * 100)}%</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WordEditor;
