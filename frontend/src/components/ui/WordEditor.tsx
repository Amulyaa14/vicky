import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    X,
    Undo2,
    Redo2,
    Save,
    Type,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Search,
    ChevronDown,
    HelpCircle,
    Scissors,
    Copy,
    Clipboard,
    Pencil,
    Download,
    Eye,
    Minus,
    Plus,
    List,
    ListOrdered,
    Printer,
    FileText,
    Clock,
    MinusSquare,
    Palette,
    Columns,
    Ruler,
    PanelLeft,
    RotateCw,
    ZoomIn,
    ZoomOut,
    SplitSquareHorizontal,
    Hash,
    Replace,
    BarChart3,
    Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────
interface ExtractedTextItem {
    str: string; x: number; y: number; fontSize: number;
    fontName: string; width: number; isBold: boolean;
}
interface ExtractedLine {
    items: ExtractedTextItem[]; y: number; x: number; text: string;
    fontSize: number; isBold: boolean; isHeading: boolean; isBullet: boolean;
}
interface ExtractedPage {
    lines: ExtractedLine[]; width: number; height: number;
}
interface WordEditorProps {
    pages: ExtractedPage[];
    onClose: () => void;
    onUpdateLine: (pageIdx: number, lineIdx: number, newText: string) => void;
    initialMode?: 'edit' | 'preview';
    onDownload?: () => void;
    onUpdateLineStyle?: (pageIdx: number, lineIdx: number, styles: Partial<ExtractedLine>) => void;
}

// ── Local style map for per-line styling ────────────────────────────────
interface LineStyle {
    isItalic: boolean;
    isUnderline: boolean;
    isStrikethrough: boolean;
    alignment: 'left' | 'center' | 'right' | 'justify';
    fontFamily: string;
    fontSize: number;
}

const DEFAULT_STYLE: LineStyle = {
    isItalic: false, isUnderline: false, isStrikethrough: false,
    alignment: 'left', fontFamily: 'Calibri', fontSize: 11,
};

const FONT_FAMILIES = ['Calibri', 'Arial', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New', 'Trebuchet MS', 'Tahoma'];
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

// Ribbon button helper
const RibbonBtn = ({ active, onClick, children, title, disabled }: {
    active?: boolean; onClick?: () => void; children: React.ReactNode; title?: string; disabled?: boolean;
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={cn(
            "p-1.5 border border-transparent rounded transition-colors",
            active ? "bg-[#c7dff7] border-[#a3c8f0]" : "hover:bg-white hover:border-[#dadada]",
            disabled && "opacity-40 cursor-not-allowed"
        )}
    >
        {children}
    </button>
);

// Section divider
const Divider = () => <div className="h-16 w-px bg-[#dadada] mx-1 shrink-0" />;

// Section label
const SectionLabel = ({ children }: { children: string }) => (
    <span className="text-[10px] text-[#605e5c] mt-auto">{children}</span>
);

// ── Main Component ─────────────────────────────────────────────────────
const WordEditor: React.FC<WordEditorProps> = ({
    pages, onClose, onUpdateLine, initialMode = 'preview', onDownload, onUpdateLineStyle,
}) => {
    const [mode, setMode] = useState<'edit' | 'preview'>(initialMode);
    const [activeTab, setActiveTab] = useState('Home');
    const [scale, setScale] = useState(0.85);
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedPage, setSelectedPage] = useState(0);
    const [focusedLine, setFocusedLine] = useState<{ pageIdx: number; lineIdx: number } | null>(null);

    // Local style map: key = "pageIdx-lineIdx"
    const [styleMap, setStyleMap] = useState<Record<string, Partial<LineStyle>>>({});
    // Editor-level state
    const [pageColor, setPageColor] = useState('#ffffff');
    const [pagePadding, setPagePadding] = useState(72); // pts
    const [showRuler, setShowRuler] = useState(false);
    const [showNavPane, setShowNavPane] = useState(true);
    const [showFindReplace, setShowFindReplace] = useState(false);
    const [showWordCount, setShowWordCount] = useState(false);
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [showFontDropdown, setShowFontDropdown] = useState(false);
    const [showSizeDropdown, setShowSizeDropdown] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);

    const tabs = ['File', 'Home', 'Insert', 'Design', 'Layout', 'Review', 'View'];

    // ── Helpers ──
    const lineKey = (pi: number, li: number) => `${pi}-${li}`;
    const getStyle = useCallback((pi: number, li: number): LineStyle => {
        const s = styleMap[lineKey(pi, li)] || {};
        const line = pages[pi]?.lines[li];
        return {
            ...DEFAULT_STYLE,
            fontSize: line?.fontSize || DEFAULT_STYLE.fontSize,
            ...s,
        };
    }, [styleMap, pages]);

    const updateStyle = useCallback((pi: number, li: number, patch: Partial<LineStyle>) => {
        setStyleMap(prev => ({ ...prev, [lineKey(pi, li)]: { ...prev[lineKey(pi, li)], ...patch } }));
    }, []);

    const focusedStyle = focusedLine ? getStyle(focusedLine.pageIdx, focusedLine.lineIdx) : null;
    const focusedLineData = focusedLine ? pages[focusedLine.pageIdx]?.lines[focusedLine.lineIdx] : null;

    // Scroll → page indicator
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const handleScroll = () => {
            const scrollTop = container.scrollTop;
            const pageHeight = (pages[0]?.height || 842) * scale + 48;
            const currentPage = Math.floor(scrollTop / pageHeight);
            if (currentPage >= 0 && currentPage < pages.length) setSelectedPage(currentPage);
        };
        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [pages, scale]);

    // ── Clipboard helpers ──
    const execClipboard = (cmd: 'cut' | 'copy' | 'paste') => {
        document.execCommand(cmd);
    };

    // ── Font toggle helpers (operate on focused line) ──
    const toggleBold = () => {
        if (!focusedLine) return;
        const line = pages[focusedLine.pageIdx]?.lines[focusedLine.lineIdx];
        if (line) onUpdateLineStyle?.(focusedLine.pageIdx, focusedLine.lineIdx, { isBold: !line.isBold });
    };
    const toggleItalic = () => {
        if (!focusedLine) return;
        const s = getStyle(focusedLine.pageIdx, focusedLine.lineIdx);
        updateStyle(focusedLine.pageIdx, focusedLine.lineIdx, { isItalic: !s.isItalic });
    };
    const toggleUnderline = () => {
        if (!focusedLine) return;
        const s = getStyle(focusedLine.pageIdx, focusedLine.lineIdx);
        updateStyle(focusedLine.pageIdx, focusedLine.lineIdx, { isUnderline: !s.isUnderline });
    };
    const toggleStrikethrough = () => {
        if (!focusedLine) return;
        const s = getStyle(focusedLine.pageIdx, focusedLine.lineIdx);
        updateStyle(focusedLine.pageIdx, focusedLine.lineIdx, { isStrikethrough: !s.isStrikethrough });
    };
    const setAlignment = (alignment: LineStyle['alignment']) => {
        if (!focusedLine) return;
        updateStyle(focusedLine.pageIdx, focusedLine.lineIdx, { alignment });
    };
    const setFontFamily = (fontFamily: string) => {
        if (!focusedLine) return;
        updateStyle(focusedLine.pageIdx, focusedLine.lineIdx, { fontFamily });
        setShowFontDropdown(false);
    };
    const setFontSize = (fontSize: number) => {
        if (!focusedLine) return;
        updateStyle(focusedLine.pageIdx, focusedLine.lineIdx, { fontSize });
        setShowSizeDropdown(false);
    };
    const toggleBullet = () => {
        if (!focusedLine) return;
        const line = pages[focusedLine.pageIdx]?.lines[focusedLine.lineIdx];
        if (!line) return;
        if (line.isBullet) {
            // Remove bullet
            const clean = line.text.replace(/^[\u2022\u25CF\u25CB•\-\*]\s*/, '');
            onUpdateLine(focusedLine.pageIdx, focusedLine.lineIdx, clean);
            onUpdateLineStyle?.(focusedLine.pageIdx, focusedLine.lineIdx, { isBullet: false });
        } else {
            onUpdateLine(focusedLine.pageIdx, focusedLine.lineIdx, '• ' + line.text);
            onUpdateLineStyle?.(focusedLine.pageIdx, focusedLine.lineIdx, { isBullet: true });
        }
    };
    const toggleHeading = () => {
        if (!focusedLine) return;
        const line = pages[focusedLine.pageIdx]?.lines[focusedLine.lineIdx];
        if (!line) return;
        onUpdateLineStyle?.(focusedLine.pageIdx, focusedLine.lineIdx, {
            isHeading: !line.isHeading,
            isBold: !line.isHeading,
        });
        if (!line.isHeading) {
            updateStyle(focusedLine.pageIdx, focusedLine.lineIdx, { fontSize: 20 });
        } else {
            updateStyle(focusedLine.pageIdx, focusedLine.lineIdx, { fontSize: 11 });
        }
    };

    // ── Insert helpers ──
    const insertDateTime = () => {
        if (!focusedLine) return;
        const line = pages[focusedLine.pageIdx]?.lines[focusedLine.lineIdx];
        if (!line) return;
        const now = new Date().toLocaleString();
        onUpdateLine(focusedLine.pageIdx, focusedLine.lineIdx, line.text + ' ' + now);
    };
    const insertHorizontalRule = () => {
        if (!focusedLine) return;
        const line = pages[focusedLine.pageIdx]?.lines[focusedLine.lineIdx];
        if (!line) return;
        onUpdateLine(focusedLine.pageIdx, focusedLine.lineIdx, line.text + '\n————————————————————————————————');
    };

    // ── Find & Replace ──
    const handleFindReplace = () => {
        if (!findText) return;
        let count = 0;
        for (let pi = 0; pi < pages.length; pi++) {
            for (let li = 0; li < pages[pi].lines.length; li++) {
                const line = pages[pi].lines[li];
                if (line.text.includes(findText)) {
                    onUpdateLine(pi, li, line.text.replaceAll(findText, replaceText));
                    count++;
                }
            }
        }
        alert(`Replaced ${count} occurrence(s).`);
    };

    // ── Word count stats ──
    const getWordCountStats = () => {
        let words = 0, chars = 0, lines = 0;
        for (const page of pages) {
            for (const line of page.lines) {
                if (!line.text) continue;
                lines++;
                chars += line.text.length;
                words += line.text.split(/\s+/).filter(Boolean).length;
            }
        }
        return { words, chars, lines, pages: pages.length };
    };

    // ── Render ──
    return (
        <div className={cn(
            "fixed inset-0 z-[100] flex flex-col overflow-hidden selection:bg-blue-500/30",
            mode === 'preview' ? "bg-[#525659] text-white" : "bg-[#f3f2f1] text-[#323130]"
        )}>
            {/* ══════════════════ PREVIEW MODE TOOLBAR ══════════════════ */}
            {mode === 'preview' ? (
                <div className="h-12 bg-[#323639] flex items-center justify-between px-4 shrink-0 shadow-lg z-10 text-white border-b border-black/20">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-red-600 rounded"><Type size={18} className="text-white" /></div>
                            <span className="text-sm font-medium hidden md:inline-block">Document Preview</span>
                        </div>
                        <div className="h-6 w-px bg-white/10 mx-1" />
                        <button onClick={() => setMode('edit')} className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium text-white/80 hover:bg-white/10">
                            <Pencil size={14} /> Edit Document
                        </button>
                    </div>
                    <div className="flex items-center gap-6 bg-[#202124] px-4 py-1 rounded-md">
                        <div className="flex items-center gap-2 text-xs font-medium border-r border-white/10 pr-4">
                            <input type="text" value={selectedPage + 1} readOnly className="w-8 bg-[#323639] border-none text-center py-0.5 rounded focus:outline-none" />
                            <span className="text-white/60">/ {pages.length}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setScale(Math.max(0.3, scale - 0.1))} className="p-1 hover:bg-white/10 rounded-full"><Minus size={16} /></button>
                            <span className="text-xs font-medium min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
                            <button onClick={() => setScale(Math.min(3, scale + 0.1))} className="p-1 hover:bg-white/10 rounded-full"><Plus size={16} /></button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onDownload && <button onClick={onDownload} className="p-2 hover:bg-white/10 rounded-full" title="Download"><Download size={18} /></button>}
                        <button onClick={onClose} className="p-2 hover:bg-red-500 rounded-full ml-2" title="Close"><X size={20} /></button>
                    </div>
                </div>
            ) : (
                /* ══════════════════ EDIT MODE RIBBON ══════════════════ */
                <header className="shrink-0">
                    {/* Title Bar */}
                    <div className="h-10 bg-[#2b579a] flex items-center justify-between px-4 text-white shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="bg-white/10 p-1 rounded hover:bg-white/20 cursor-pointer" onClick={() => alert('Changes saved!')}><Save size={16} /></div>
                                <div className="bg-white/10 p-1 rounded hover:bg-white/20 cursor-pointer"><Undo2 size={16} /></div>
                                <div className="bg-white/10 p-1 rounded hover:bg-white/20 cursor-pointer opacity-50"><Redo2 size={16} /></div>
                            </div>
                            <div className="h-4 w-px bg-white/20" />
                            <span className="text-sm font-medium">Document1 - Word</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => alert('Changes saved!')} className="h-8 px-3 bg-[#4a88da] hover:bg-[#3b70b5] rounded text-xs font-medium flex items-center gap-1.5"><Save size={14} /> Save</button>
                            <button onClick={() => setMode('preview')} className="h-8 px-3 bg-white text-[#2b579a] hover:bg-white/90 rounded text-xs font-medium flex items-center gap-1.5"><Eye size={14} /> Preview</button>
                            {onDownload && <button onClick={onDownload} className="h-8 px-3 bg-[#107c10] hover:bg-[#0b5a0b] rounded text-xs font-medium flex items-center gap-1.5"><Download size={14} /> Download</button>}
                            <div className="w-2" />
                            <button onClick={onClose} className="h-10 px-4 hover:bg-red-600 transition-colors"><X size={18} /></button>
                        </div>
                    </div>

                    {/* Ribbon Tabs */}
                    <div className="bg-[#2b579a] flex items-end shrink-0 select-none">
                        {tabs.map((tab) => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={cn("px-4 py-1.5 text-xs font-semibold transition-colors rounded-t-sm mx-0.5",
                                    activeTab === tab ? "bg-[#f3f2f1] text-[#2b579a]" : "text-white hover:bg-white/10"
                                )}>{tab}</button>
                        ))}
                        <div className="flex-1" />
                        <div className="px-4 py-2 flex items-center gap-2 text-white/80 hover:text-white cursor-pointer">
                            <span className="text-xs">Tell me what you want to do</span>
                            <HelpCircle size={14} />
                        </div>
                    </div>

                    {/* ══════════════════ RIBBON CONTENT ══════════════════ */}
                    <div className="min-h-[90px] bg-[#f3f2f1] border-b border-[#dadada] flex items-start px-3 py-2 gap-1 overflow-x-auto shrink-0 select-none shadow-sm">

                        {/* ── FILE TAB ── */}
                        {activeTab === 'File' && (
                            <div className="flex items-center gap-3 py-2">
                                {onDownload && (
                                    <button onClick={onDownload} className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-white border border-transparent hover:border-[#dadada] rounded cursor-pointer">
                                        <Download size={22} className="text-[#2b579a]" />
                                        <span className="text-[10px] font-medium">Download</span>
                                    </button>
                                )}
                                <button onClick={() => window.print()} className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-white border border-transparent hover:border-[#dadada] rounded cursor-pointer">
                                    <Printer size={22} className="text-[#2b579a]" />
                                    <span className="text-[10px] font-medium">Print</span>
                                </button>
                                <button onClick={() => setMode('preview')} className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-white border border-transparent hover:border-[#dadada] rounded cursor-pointer">
                                    <Eye size={22} className="text-[#2b579a]" />
                                    <span className="text-[10px] font-medium">Preview</span>
                                </button>
                                <Divider />
                                <button onClick={onClose} className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-red-50 border border-transparent hover:border-red-200 rounded cursor-pointer">
                                    <X size={22} className="text-red-500" />
                                    <span className="text-[10px] font-medium text-red-500">Close</span>
                                </button>
                            </div>
                        )}

                        {/* ── HOME TAB ── */}
                        {activeTab === 'Home' && (
                            <>
                                {/* Clipboard */}
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => execClipboard('paste')} className="flex flex-col items-center border border-transparent hover:border-[#dadada] hover:bg-white p-1.5 rounded cursor-pointer">
                                            <Clipboard size={22} className="text-[#2b579a]" /><span className="text-[10px] mt-0.5">Paste</span>
                                        </button>
                                        <div className="flex flex-col gap-1">
                                            <button onClick={() => execClipboard('cut')} className="flex items-center gap-2 px-2 py-0.5 hover:bg-white border border-transparent hover:border-[#dadada] rounded cursor-pointer">
                                                <Scissors size={14} /><span className="text-[10px]">Cut</span>
                                            </button>
                                            <button onClick={() => execClipboard('copy')} className="flex items-center gap-2 px-2 py-0.5 hover:bg-white border border-transparent hover:border-[#dadada] rounded cursor-pointer">
                                                <Copy size={14} /><span className="text-[10px]">Copy</span>
                                            </button>
                                        </div>
                                    </div>
                                    <SectionLabel>Clipboard</SectionLabel>
                                </div>
                                <Divider />

                                {/* Font */}
                                <div className="flex flex-col items-center gap-1 shrink-0 text-[#323130]">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-1">
                                            {/* Font Family Dropdown */}
                                            <div className="relative">
                                                <button onClick={() => { setShowFontDropdown(!showFontDropdown); setShowSizeDropdown(false); }}
                                                    className="bg-white border border-[#dadada] rounded px-2 py-0.5 text-xs flex items-center justify-between w-32 cursor-pointer hover:border-[#2b579a]">
                                                    <span>{focusedStyle?.fontFamily || 'Calibri'}</span><ChevronDown size={12} />
                                                </button>
                                                {showFontDropdown && (
                                                    <div className="absolute top-full left-0 mt-1 bg-white border border-[#dadada] rounded shadow-lg z-50 w-44 max-h-48 overflow-y-auto">
                                                        {FONT_FAMILIES.map(f => (
                                                            <button key={f} onClick={() => setFontFamily(f)}
                                                                className={cn("w-full text-left px-3 py-1.5 text-xs hover:bg-[#e8f0fe]", focusedStyle?.fontFamily === f && "bg-[#c7dff7]")}
                                                                style={{ fontFamily: f }}>{f}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {/* Font Size Dropdown */}
                                            <div className="relative">
                                                <button onClick={() => { setShowSizeDropdown(!showSizeDropdown); setShowFontDropdown(false); }}
                                                    className="bg-white border border-[#dadada] rounded px-2 py-0.5 text-xs flex items-center justify-between w-14 cursor-pointer hover:border-[#2b579a]">
                                                    <span>{Math.round(focusedStyle?.fontSize || 11)}</span><ChevronDown size={12} />
                                                </button>
                                                {showSizeDropdown && (
                                                    <div className="absolute top-full left-0 mt-1 bg-white border border-[#dadada] rounded shadow-lg z-50 w-16 max-h-48 overflow-y-auto">
                                                        {FONT_SIZES.map(s => (
                                                            <button key={s} onClick={() => setFontSize(s)}
                                                                className={cn("w-full text-left px-3 py-1 text-xs hover:bg-[#e8f0fe]", Math.round(focusedStyle?.fontSize || 11) === s && "bg-[#c7dff7]")}>{s}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-0.5">
                                            <RibbonBtn active={focusedLineData?.isBold} onClick={toggleBold} title="Bold (Ctrl+B)"><Bold size={15} /></RibbonBtn>
                                            <RibbonBtn active={focusedStyle?.isItalic} onClick={toggleItalic} title="Italic (Ctrl+I)"><Italic size={15} /></RibbonBtn>
                                            <RibbonBtn active={focusedStyle?.isUnderline} onClick={toggleUnderline} title="Underline (Ctrl+U)"><Underline size={15} /></RibbonBtn>
                                            <RibbonBtn active={focusedStyle?.isStrikethrough} onClick={toggleStrikethrough} title="Strikethrough"><Strikethrough size={15} /></RibbonBtn>
                                            <div className="w-px h-5 bg-[#dadada] mx-0.5" />
                                            <RibbonBtn onClick={toggleHeading} active={focusedLineData?.isHeading} title="Toggle Heading"><Hash size={15} /></RibbonBtn>
                                        </div>
                                    </div>
                                    <SectionLabel>Font</SectionLabel>
                                </div>
                                <Divider />

                                {/* Paragraph */}
                                <div className="flex flex-col items-center gap-1 shrink-0 text-[#323130]">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-0.5">
                                            <RibbonBtn active={focusedStyle?.alignment === 'left'} onClick={() => setAlignment('left')} title="Align Left"><AlignLeft size={15} /></RibbonBtn>
                                            <RibbonBtn active={focusedStyle?.alignment === 'center'} onClick={() => setAlignment('center')} title="Center"><AlignCenter size={15} /></RibbonBtn>
                                            <RibbonBtn active={focusedStyle?.alignment === 'right'} onClick={() => setAlignment('right')} title="Align Right"><AlignRight size={15} /></RibbonBtn>
                                            <RibbonBtn active={focusedStyle?.alignment === 'justify'} onClick={() => setAlignment('justify')} title="Justify"><AlignJustify size={15} /></RibbonBtn>
                                        </div>
                                        <div className="flex items-center gap-0.5">
                                            <RibbonBtn active={focusedLineData?.isBullet} onClick={toggleBullet} title="Bullet List"><List size={15} /></RibbonBtn>
                                            <RibbonBtn title="Numbered List (visual only)"><ListOrdered size={15} /></RibbonBtn>
                                        </div>
                                    </div>
                                    <SectionLabel>Paragraph</SectionLabel>
                                </div>
                            </>
                        )}

                        {/* ── INSERT TAB ── */}
                        {activeTab === 'Insert' && (
                            <div className="flex items-center gap-3 py-2">
                                <button onClick={insertHorizontalRule} disabled={!focusedLine}
                                    className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-white border border-transparent hover:border-[#dadada] rounded cursor-pointer disabled:opacity-40">
                                    <MinusSquare size={22} className="text-[#2b579a]" /><span className="text-[10px] font-medium">Horizontal Line</span>
                                </button>
                                <button onClick={insertDateTime} disabled={!focusedLine}
                                    className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-white border border-transparent hover:border-[#dadada] rounded cursor-pointer disabled:opacity-40">
                                    <Clock size={22} className="text-[#2b579a]" /><span className="text-[10px] font-medium">Date & Time</span>
                                </button>
                                <Divider />
                                <button onClick={() => { if (!focusedLine) return; const l = pages[focusedLine.pageIdx]?.lines[focusedLine.lineIdx]; if (l) onUpdateLine(focusedLine.pageIdx, focusedLine.lineIdx, l.text + ' [PAGE BREAK]'); }} disabled={!focusedLine}
                                    className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-white border border-transparent hover:border-[#dadada] rounded cursor-pointer disabled:opacity-40">
                                    <SplitSquareHorizontal size={22} className="text-[#2b579a]" /><span className="text-[10px] font-medium">Page Break</span>
                                </button>
                                <button onClick={() => { if (!focusedLine) return; const l = pages[focusedLine.pageIdx]?.lines[focusedLine.lineIdx]; if (l) onUpdateLine(focusedLine.pageIdx, focusedLine.lineIdx, l.text + ' \u2605\u2605\u2605'); }} disabled={!focusedLine}
                                    className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-white border border-transparent hover:border-[#dadada] rounded cursor-pointer disabled:opacity-40">
                                    <FileText size={22} className="text-[#2b579a]" /><span className="text-[10px] font-medium">Symbol</span>
                                </button>
                                {!focusedLine && <p className="text-[10px] text-[#605e5c] italic ml-4 self-center">Click a line in the document first, then use these tools.</p>}
                            </div>
                        )}

                        {/* ── DESIGN TAB ── */}
                        {activeTab === 'Design' && (
                            <div className="flex items-center gap-3 py-2">
                                {/* Page Color */}
                                <div className="flex flex-col items-center gap-1">
                                    <div className="relative">
                                        <button onClick={() => setShowColorPicker(!showColorPicker)}
                                            className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-white border border-transparent hover:border-[#dadada] rounded cursor-pointer">
                                            <Palette size={22} className="text-[#2b579a]" />
                                            <span className="text-[10px] font-medium">Page Color</span>
                                        </button>
                                        {showColorPicker && (
                                            <div className="absolute top-full left-0 mt-1 bg-white border border-[#dadada] rounded shadow-lg z-50 p-3">
                                                <p className="text-[10px] text-[#605e5c] mb-2 font-medium">Choose page background:</p>
                                                <div className="grid grid-cols-5 gap-1.5">
                                                    {['#ffffff', '#f8f9fa', '#fff3cd', '#d1ecf1', '#d4edda', '#f5c6cb', '#e2e3e5', '#cce5ff', '#ffeaa7', '#fab1a0'].map(c => (
                                                        <button key={c} onClick={() => { setPageColor(c); setShowColorPicker(false); }}
                                                            className={cn("w-7 h-7 rounded border-2 transition-all hover:scale-110", pageColor === c ? "border-[#2b579a] ring-1 ring-[#2b579a]" : "border-[#dadada]")}
                                                            style={{ backgroundColor: c }} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Divider />
                                {/* Font Themes */}
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] text-[#605e5c] mb-1 font-medium">Font Themes</span>
                                    <div className="flex gap-2">
                                        {[
                                            { name: 'Classic', font: 'Times New Roman' },
                                            { name: 'Modern', font: 'Calibri' },
                                            { name: 'Clean', font: 'Arial' },
                                            { name: 'Elegant', font: 'Georgia' },
                                        ].map(theme => (
                                            <button key={theme.name} onClick={() => {
                                                // Apply font to all lines
                                                for (let pi = 0; pi < pages.length; pi++) {
                                                    for (let li = 0; li < pages[pi].lines.length; li++) {
                                                        updateStyle(pi, li, { fontFamily: theme.font });
                                                    }
                                                }
                                            }}
                                                className="px-3 py-1.5 text-xs border border-[#dadada] rounded hover:border-[#2b579a] hover:bg-[#e8f0fe] transition-colors"
                                                style={{ fontFamily: theme.font }}>
                                                {theme.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── LAYOUT TAB ── */}
                        {activeTab === 'Layout' && (
                            <div className="flex items-center gap-4 py-2">
                                {/* Margins */}
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] text-[#605e5c] mb-1 font-medium">Margins</span>
                                    <div className="flex gap-2">
                                        {[
                                            { name: 'Normal', value: 72 },
                                            { name: 'Narrow', value: 36 },
                                            { name: 'Wide', value: 120 },
                                        ].map(m => (
                                            <button key={m.name} onClick={() => setPagePadding(m.value)}
                                                className={cn("px-3 py-1.5 text-xs border rounded transition-colors",
                                                    pagePadding === m.value ? "border-[#2b579a] bg-[#c7dff7]" : "border-[#dadada] hover:border-[#2b579a] hover:bg-[#e8f0fe]")}>
                                                {m.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <Divider />
                                {/* Orientation */}
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] text-[#605e5c] mb-1 font-medium">Orientation</span>
                                    <div className="flex gap-2">
                                        <button className="flex flex-col items-center gap-1 px-3 py-1.5 border border-[#2b579a] bg-[#c7dff7] rounded text-xs">
                                            <FileText size={16} className="text-[#2b579a]" /> Portrait
                                        </button>
                                        <button className="flex flex-col items-center gap-1 px-3 py-1.5 border border-[#dadada] hover:border-[#2b579a] hover:bg-[#e8f0fe] rounded text-xs">
                                            <RotateCw size={16} className="text-[#2b579a]" /> Landscape
                                        </button>
                                    </div>
                                </div>
                                <Divider />
                                {/* Columns */}
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] text-[#605e5c] mb-1 font-medium">Columns</span>
                                    <div className="flex gap-2">
                                        <button className="px-3 py-1.5 text-xs border border-[#2b579a] bg-[#c7dff7] rounded">One</button>
                                        <button className="px-3 py-1.5 text-xs border border-[#dadada] hover:border-[#2b579a] hover:bg-[#e8f0fe] rounded flex items-center gap-1">
                                            <Columns size={14} /> Two
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── REVIEW TAB ── */}
                        {activeTab === 'Review' && (
                            <div className="flex items-center gap-3 py-2">
                                <button onClick={() => setShowWordCount(true)}
                                    className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-white border border-transparent hover:border-[#dadada] rounded cursor-pointer">
                                    <BarChart3 size={22} className="text-[#2b579a]" /><span className="text-[10px] font-medium">Word Count</span>
                                </button>
                                <button onClick={() => setShowFindReplace(true)}
                                    className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-white border border-transparent hover:border-[#dadada] rounded cursor-pointer">
                                    <Replace size={22} className="text-[#2b579a]" /><span className="text-[10px] font-medium">Find & Replace</span>
                                </button>
                            </div>
                        )}

                        {/* ── VIEW TAB ── */}
                        {activeTab === 'View' && (
                            <div className="flex items-center gap-3 py-2">
                                <RibbonBtn active={showRuler} onClick={() => setShowRuler(!showRuler)} title="Toggle Ruler"><Ruler size={18} /></RibbonBtn>
                                <RibbonBtn active={showNavPane} onClick={() => setShowNavPane(!showNavPane)} title="Toggle Navigation"><PanelLeft size={18} /></RibbonBtn>
                                <Divider />
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] text-[#605e5c] mb-1 font-medium">Zoom</span>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setScale(Math.max(0.3, scale - 0.1))} className="p-1.5 hover:bg-white border border-transparent hover:border-[#dadada] rounded"><ZoomOut size={16} /></button>
                                        <span className="text-xs font-medium w-10 text-center">{Math.round(scale * 100)}%</span>
                                        <button onClick={() => setScale(Math.min(3, scale + 0.1))} className="p-1.5 hover:bg-white border border-transparent hover:border-[#dadada] rounded"><ZoomIn size={16} /></button>
                                        <button onClick={() => setScale(1)} className="px-2 py-1 text-[10px] border border-[#dadada] rounded hover:bg-[#e8f0fe]">100%</button>
                                        <button onClick={() => setScale(0.75)} className="px-2 py-1 text-[10px] border border-[#dadada] rounded hover:bg-[#e8f0fe]">75%</button>
                                        <button onClick={() => setScale(0.5)} className="px-2 py-1 text-[10px] border border-[#dadada] rounded hover:bg-[#e8f0fe]">50%</button>
                                    </div>
                                </div>
                                <Divider />
                                <button onClick={() => { const el = containerRef.current; if (el) { el.requestFullscreen?.(); } }}
                                    className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-white border border-transparent hover:border-[#dadada] rounded cursor-pointer">
                                    <Maximize2 size={22} className="text-[#2b579a]" /><span className="text-[10px] font-medium">Full Screen</span>
                                </button>
                            </div>
                        )}
                    </div>
                </header>
            )}

            {/* ══════════════════ MAIN AREA ══════════════════ */}
            <div className="flex-1 flex overflow-hidden">
                {/* Navigation Sidebar */}
                {mode === 'edit' && showNavPane && (
                    <div className="w-[200px] border-r border-[#dadada] bg-white flex flex-col shrink-0">
                        <div className="p-3 border-b border-[#dadada]">
                            <h4 className="text-sm font-semibold text-[#2b579a]">Navigation</h4>
                            <div className="mt-2 relative">
                                <input type="text" placeholder="Search document" className="w-full text-xs bg-[#f3f2f1] border border-[#dadada] rounded px-7 py-1 focus:outline-none focus:border-[#2b579a]" />
                                <Search size={12} className="absolute left-2 top-1.5 text-[#605e5c]" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-3 space-y-1">
                                {pages.map((page, pi) => page.lines.filter(l => l.isHeading).map((heading, hi) => (
                                    <button key={`${pi}-${hi}`} onClick={() => {
                                        const lineIdx = page.lines.indexOf(heading);
                                        setFocusedLine({ pageIdx: pi, lineIdx });
                                    }} className="w-full flex gap-2 group cursor-pointer hover:bg-[#f3f2f1] p-1.5 rounded text-left">
                                        <div className="w-1.5 h-1.5 mt-1.5 bg-[#2b579a] rounded-sm shrink-0" />
                                        <span className="text-[11px] text-[#323130] truncate">{heading.text}</span>
                                    </button>
                                )))}
                                {!pages.some(p => p.lines.some(l => l.isHeading)) && (
                                    <div className="text-[10px] text-[#605e5c] italic p-2">No headings found. Use the Home tab to make a line a heading.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Content Surface */}
                <div ref={containerRef}
                    className={cn("flex-1 overflow-auto p-12 scroll-smooth flex flex-col items-center gap-12",
                        mode === 'preview' ? "bg-[#525659]" : "bg-[#e6e6e6]"
                    )}>
                    {/* Ruler */}
                    {mode === 'edit' && showRuler && (
                        <div className="w-full max-w-[816px] h-6 bg-white border border-[#dadada] rounded flex items-center px-2 shrink-0 sticky top-0 z-10">
                            {Array.from({ length: 17 }, (_, i) => (
                                <React.Fragment key={i}>
                                    <span className="text-[8px] text-[#605e5c] font-mono">{i}</span>
                                    {i < 16 && <div className="flex-1 border-r border-[#e0e0e0] h-3" />}
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {pages.map((page, pi) => (
                        <div key={pi}
                            className={cn("relative shrink-0 group transition-shadow",
                                mode === 'preview' ? "shadow-[0_4px_20px_rgba(0,0,0,0.3)]" : "shadow-[0_2px_10px_rgba(0,0,0,0.15)] ring-1 ring-black/5"
                            )}
                            style={{
                                width: `${page.width}px`, height: `${page.height}px`,
                                transform: `scale(${scale})`, transformOrigin: 'top center',
                                marginBottom: `${(page.height * scale) - page.height}px`,
                                backgroundColor: pageColor,
                                padding: `${pagePadding}px`,
                            }}>
                            {page.lines.map((line, li) => {
                                const s = getStyle(pi, li);
                                return (
                                    <div key={li}
                                        contentEditable={mode === 'edit'}
                                        suppressContentEditableWarning
                                        onFocus={() => mode === 'edit' && setFocusedLine({ pageIdx: pi, lineIdx: li })}
                                        onBlur={(e) => { if (mode === 'edit') onUpdateLine(pi, li, e.currentTarget.textContent || ''); }}
                                        className={cn(
                                            "absolute outline-none px-1 -mx-1 rounded transition-all text-black",
                                            mode === 'edit' && "hover:bg-blue-100/50 hover:ring-1 hover:ring-blue-300 focus:bg-blue-100 focus:ring-1 focus:ring-blue-400",
                                            focusedLine?.pageIdx === pi && focusedLine?.lineIdx === li && "ring-1 ring-blue-400 bg-blue-50/50"
                                        )}
                                        style={{
                                            left: `${line.x}px`, top: `${line.y}px`,
                                            fontSize: `${s.fontSize}px`,
                                            fontWeight: line.isBold || line.isHeading ? 700 : 400,
                                            fontStyle: s.isItalic ? 'italic' : 'normal',
                                            textDecoration: [s.isUnderline && 'underline', s.isStrikethrough && 'line-through'].filter(Boolean).join(' ') || 'none',
                                            fontFamily: `${s.fontFamily}, "Segoe UI", sans-serif`,
                                            textAlign: s.alignment,
                                            transform: 'translateY(-70%)',
                                            minWidth: '10px', minHeight: '1em',
                                            whiteSpace: 'pre-wrap',
                                        }}>
                                        {line.text}
                                    </div>
                                );
                            })}

                            {mode === 'edit' && (
                                <div className="absolute -bottom-6 left-0 right-0 text-center text-[10px] text-[#605e5c] select-none">
                                    Page {pi + 1} of {pages.length}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ══════════════════ STATUS BAR ══════════════════ */}
            {mode === 'edit' && (
                <div className="h-[22px] bg-[#2b579a] flex items-center justify-between px-3 text-white text-[10px] shrink-0 select-none">
                    <div className="flex items-center gap-4">
                        <span>Page {selectedPage + 1} of {pages.length}</span>
                        <span>{pages.reduce((acc, p) => acc + p.lines.reduce((lacc, l) => lacc + l.text.split(/\s+/).filter(Boolean).length, 0), 0)} words</span>
                        <span>{focusedLine ? `Line ${focusedLine.lineIdx + 1}` : 'Ready'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setScale(Math.max(0.2, scale - 0.05))} className="hover:bg-white/20 px-1 rounded">-</button>
                        <div className="w-24 h-1 bg-white/20 rounded-full overflow-hidden relative">
                            <div className="absolute top-0 bottom-0 left-0 bg-white rounded-full" style={{ width: `${Math.min(scale * 50, 100)}%` }} />
                        </div>
                        <button onClick={() => setScale(Math.min(2, scale + 0.05))} className="hover:bg-white/20 px-1 rounded">+</button>
                        <span className="w-8 text-right font-medium">{Math.round(scale * 100)}%</span>
                    </div>
                </div>
            )}

            {/* ══════════════════ MODALS ══════════════════ */}

            {/* Word Count Dialog */}
            {showWordCount && (() => {
                const stats = getWordCountStats();
                return (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={() => setShowWordCount(false)}>
                        <div className="bg-white rounded-lg shadow-2xl p-6 w-80 text-[#323130]" onClick={e => e.stopPropagation()}>
                            <h3 className="text-base font-bold mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-[#2b579a]" /> Word Count</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between py-1.5 border-b border-[#f0f0f0]"><span>Pages</span><span className="font-semibold">{stats.pages}</span></div>
                                <div className="flex justify-between py-1.5 border-b border-[#f0f0f0]"><span>Words</span><span className="font-semibold">{stats.words}</span></div>
                                <div className="flex justify-between py-1.5 border-b border-[#f0f0f0]"><span>Characters</span><span className="font-semibold">{stats.chars}</span></div>
                                <div className="flex justify-between py-1.5"><span>Lines</span><span className="font-semibold">{stats.lines}</span></div>
                            </div>
                            <button onClick={() => setShowWordCount(false)} className="mt-5 w-full py-2 bg-[#2b579a] text-white text-sm font-medium rounded hover:bg-[#1e3f73] transition-colors">Close</button>
                        </div>
                    </div>
                );
            })()}

            {/* Find & Replace Dialog */}
            {showFindReplace && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={() => setShowFindReplace(false)}>
                    <div className="bg-white rounded-lg shadow-2xl p-6 w-96 text-[#323130]" onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-bold mb-4 flex items-center gap-2"><Replace size={18} className="text-[#2b579a]" /> Find & Replace</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-[#605e5c] block mb-1">Find:</label>
                                <input type="text" value={findText} onChange={e => setFindText(e.target.value)}
                                    className="w-full border border-[#dadada] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#2b579a]"
                                    placeholder="Text to find..." />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-[#605e5c] block mb-1">Replace with:</label>
                                <input type="text" value={replaceText} onChange={e => setReplaceText(e.target.value)}
                                    className="w-full border border-[#dadada] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#2b579a]"
                                    placeholder="Replacement text..." />
                            </div>
                        </div>
                        <div className="mt-5 flex gap-2">
                            <button onClick={handleFindReplace} className="flex-1 py-2 bg-[#2b579a] text-white text-sm font-medium rounded hover:bg-[#1e3f73] transition-colors">Replace All</button>
                            <button onClick={() => setShowFindReplace(false)} className="flex-1 py-2 border border-[#dadada] text-sm font-medium rounded hover:bg-[#f3f2f1] transition-colors">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WordEditor;
