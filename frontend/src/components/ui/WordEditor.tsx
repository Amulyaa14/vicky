import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    X, Undo2, Redo2, Save, Type, Bold, Italic, Underline, Strikethrough,
    AlignLeft, AlignCenter, AlignRight, AlignJustify, Search, ChevronDown,
    HelpCircle, Scissors, Copy, Clipboard, Pencil, Download, Eye, Minus, Plus,
    List, ListOrdered, Printer, FileText, Clock, MinusSquare, Palette, Columns,
    Ruler, PanelLeft, RotateCw, ZoomIn, ZoomOut, SplitSquareHorizontal, Hash,
    Replace, Maximize2, PenTool, Eraser, Highlighter, Superscript, Subscript,
    Baseline, Table as TableIcon, Image as ImageIcon, Shapes, Link as LinkIcon,
    Bookmark, WholeWord, CaseSensitive, Omega, Layers, Smile, Table2,
    Footprints, MessageSquare, CheckSquare, Navigation, BookOpen, Mail, Quote,
    Indent, Outdent, Trash2, Edit2, BarChart3, Ruler as RulerIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '../../context/ThemeContext';

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
    isSubscript: boolean;
    isSuperscript: boolean;
    alignment: 'left' | 'center' | 'right' | 'justify';
    fontFamily: string;
    fontSize: number;
    textColor: string;
    highlightColor: string;
    lineHeight: number;
    paragraphSpacing: number;
}

const DEFAULT_STYLE: LineStyle = {
    isItalic: false, isUnderline: false, isStrikethrough: false,
    isSubscript: false, isSuperscript: false,
    alignment: 'left', fontFamily: 'Calibri', fontSize: 11,
    textColor: 'auto', highlightColor: 'transparent',
    lineHeight: 1.15, paragraphSpacing: 10,
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
            active ? "bg-primary/20 border-primary/30" : "hover:bg-muted hover:border-border",
            disabled && "opacity-40 cursor-not-allowed"
        )}
    >
        {children}
    </button>
);

// Section divider
const Divider = () => <div className="h-16 w-px bg-border/40 mx-1 shrink-0" />;

// Section label
const SectionLabel = ({ children }: { children: string }) => (
    <span className="text-[9px] text-muted-foreground mt-1 uppercase tracking-tight">{children}</span>
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
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
    const [showRuler, setShowRuler] = useState(false);
    const [showNavPane, setShowNavPane] = useState(true);
    const [showFindReplace, setShowFindReplace] = useState(false);
    const [showWordCount, setShowWordCount] = useState(false);
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [showFontDropdown, setShowFontDropdown] = useState(false);
    const [showSizeDropdown, setShowSizeDropdown] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showSymbolPicker, setShowSymbolPicker] = useState(false);
    const [drawMode, setDrawMode] = useState<'none' | 'pen' | 'highlighter' | 'eraser'>('none');
    const [drawColor, setDrawColor] = useState('#ff0000');
    const [drawings, setDrawings] = useState<any[]>([]); // Simple array to store paths
    const [comments, setComments] = useState<Record<string, string[]>>({}); // pageIdx-lineIdx -> comments
    const [showCommentInput, setShowCommentInput] = useState<{ pi: number, li: number } | null>(null);
    const [newComment, setNewComment] = useState('');

    const { theme } = useTheme();
    const tabs = ['File', 'Home', 'Insert', 'Draw', 'Design', 'Layout', 'References', 'Mailings', 'Review', 'View', 'Help'];

    // Update page color when theme changes
    useEffect(() => {
        setPageColor(theme === 'dark' ? '#1e1e1e' : '#ffffff');
    }, [theme]);

    // ── Helpers ──
    const lineKey = (pi: number, li: number) => `${pi}-${li}`;
    const getStyle = useCallback((pi: number, li: number): LineStyle => {
        const s = styleMap[lineKey(pi, li)] || {};
        const line = pages[pi]?.lines[li];
        const baseStyle = { ...DEFAULT_STYLE, ...s };
        
        // Handle "auto" text color based on theme and page color
        if (baseStyle.textColor === 'auto') {
            const isDarkBg = theme === 'dark' || (pageColor !== '#ffffff' && pageColor !== '#f8f9fa');
            baseStyle.textColor = isDarkBg ? '#ffffff' : '#323130';
        }

        return {
            ...baseStyle,
            fontSize: line?.fontSize || baseStyle.fontSize,
        };
    }, [styleMap, pages, theme, pageColor]);

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
    const toggleSubscript = () => {
        if (!focusedLine) return;
        const s = getStyle(focusedLine.pageIdx, focusedLine.lineIdx);
        updateStyle(focusedLine.pageIdx, focusedLine.lineIdx, { isSubscript: !s.isSubscript, isSuperscript: false });
    };
    const toggleSuperscript = () => {
        if (!focusedLine) return;
        const s = getStyle(focusedLine.pageIdx, focusedLine.lineIdx);
        updateStyle(focusedLine.pageIdx, focusedLine.lineIdx, { isSuperscript: !s.isSuperscript, isSubscript: false });
    };
    const setAlignment = (alignment: LineStyle['alignment']) => {
        if (!focusedLine) return;
        updateStyle(focusedLine.pageIdx, focusedLine.lineIdx, { alignment });
    };
    const setTextColor = (textColor: string) => {
        if (!focusedLine) return;
        updateStyle(focusedLine.pageIdx, focusedLine.lineIdx, { textColor });
    };
    const setHighlightColor = (highlightColor: string) => {
        if (!focusedLine) return;
        updateStyle(focusedLine.pageIdx, focusedLine.lineIdx, { highlightColor });
    };
    const clearFormatting = () => {
        if (!focusedLine) return;
        setStyleMap(prev => ({ ...prev, [lineKey(focusedLine.pageIdx, focusedLine.lineIdx)]: DEFAULT_STYLE }));
        onUpdateLineStyle?.(focusedLine.pageIdx, focusedLine.lineIdx, { isHeading: false, isBold: false });
    };
    const setIndent = (delta: number) => {
        if (!focusedLine) return;
        const line = pages[focusedLine.pageIdx]?.lines[focusedLine.lineIdx];
        if (!line) return;
        // Approximation of indent by updating x
        const newX = Math.max(0, line.x + delta);
        onUpdateLineStyle?.(focusedLine.pageIdx, focusedLine.lineIdx, { x: newX });
    };
    const applyHeadingStyle = (level: number) => {
        if (!focusedLine) return;
        const sizes: Record<number, number> = { 1: 32, 2: 24, 3: 18 };
        onUpdateLineStyle?.(focusedLine.pageIdx, focusedLine.lineIdx, { isHeading: true, isBold: true });
        updateStyle(focusedLine.pageIdx, focusedLine.lineIdx, { fontSize: sizes[level] || 11, paragraphSpacing: 20 });
    };
    const applyQuoteStyle = () => {
        if (!focusedLine) return;
        updateStyle(focusedLine.pageIdx, focusedLine.lineIdx, { isItalic: true, textColor: '#666', fontSize: 13, alignment: 'center' });
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

    const insertSymbol = (sym: string) => {
        if (!focusedLine) return;
        const line = pages[focusedLine.pageIdx]?.lines[focusedLine.lineIdx];
        if (!line) return;
        onUpdateLine(focusedLine.pageIdx, focusedLine.lineIdx, line.text + sym);
        setShowSymbolPicker(false);
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

    // ── Comments ──
    const addComment = (pi: number, li: number) => {
        if (!newComment.trim()) return;
        setComments(prev => {
            const key = lineKey(pi, li);
            return {
                ...prev,
                [key]: [...(prev[key] || []), newComment.trim()]
            };
        });
        setNewComment('');
        setShowCommentInput(null);
    };

    // ── Image Upload ──
    const handleImageUpload = (pi: number, li: number) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (loadEvt) => {
                    const dataUrl = loadEvt.target?.result as string;
                    // For now, we'll append a placeholder image tag to the line text
                    // A more advanced editor would handle delta insertions
                    const line = pages[pi].lines[li];
                    onUpdateLine(pi, li, line.text + ` [IMAGE:${file.name}] `);
                    alert("Image reference added. In a real editor, this would embed/float the image.");
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
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
            "fixed inset-0 z-[100] flex flex-col overflow-hidden selection:bg-primary/30",
            mode === 'preview' ? "bg-zinc-800 text-white" : "bg-background text-foreground"
        )}>
            {/* ══════════════════ PREVIEW MODE TOOLBAR ══════════════════ */}
            {mode === 'preview' ? (
                <div className="h-12 bg-zinc-900 flex items-center justify-between px-4 shrink-0 shadow-lg z-10 text-white border-b border-black/20">
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
                    <div className="flex items-center gap-6 bg-black/40 px-4 py-1 rounded-md border border-white/5">
                        <div className="flex items-center gap-2 text-xs font-medium border-r border-white/10 pr-4">
                            <input type="text" value={selectedPage + 1} readOnly className="w-8 bg-black/20 border-none text-center py-0.5 rounded focus:outline-none" />
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
                    {/* Title Bar - MS Word Style */}
                    <div className="h-[42px] bg-[#2b579a] dark:bg-[#1a3a6b] flex items-center justify-between px-4 text-white shrink-0 border-b border-black/10">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                                <button className="p-1.5 hover:bg-white/10 rounded" title="Save"><Save size={16} /></button>
                                <button className="p-1.5 hover:bg-white/10 rounded" title="Undo"><Undo2 size={16} /></button>
                                <button className="p-1.5 hover:bg-white/10 rounded opacity-50"><Redo2 size={16} /></button>
                            </div>
                            <div className="h-5 w-px bg-white/20 mx-1" />
                            <span className="text-sm font-medium tracking-wide">Document1 - Word</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => alert('Changes saved!')} className="h-7 px-4 bg-white/10 hover:bg-white/20 rounded text-[11px] font-medium transition-colors shadow-sm">Save</button>
                            <button onClick={() => setMode('preview')} className="h-7 px-4 bg-white/10 hover:bg-white/20 rounded text-[11px] font-medium transition-colors border border-white/20 flex items-center gap-1.5">
                                <Eye size={13} /> Preview
                            </button>
                            {onDownload && (
                                <button onClick={onDownload} className="h-7 px-4 bg-[#107c10] hover:bg-[#0b5a0b] rounded text-[11px] font-medium transition-colors shadow-sm flex items-center gap-1.5">
                                    <Download size={13} /> Download
                                </button>
                            )}
                            <button onClick={onClose} className="p-2 hover:bg-red-600 transition-colors rounded-sm ml-2" title="Close"><X size={18} /></button>
                        </div>
                    </div>

                    {/* Ribbon Tabs - MS Word Style */}
                    <div className="bg-[#2b579a] dark:bg-[#1a3a6b] flex items-end shrink-0 select-none px-2 h-9">
                        {tabs.map((tab) => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={cn("px-5 py-2 text-[11px] font-medium transition-colors rounded-t-[4px] relative top-[1px]",
                                    activeTab === tab ? "bg-muted text-foreground dark:bg-muted dark:text-primary shadow-[0_-2px_4px_rgba(0,0,0,0.1)]" : "text-white/90 hover:bg-white/10"
                                )}>{tab}</button>
                        ))}
                        <div className="flex-1" />
                        <div className="px-4 py-2 flex items-center gap-2 text-white/70 hover:text-white cursor-pointer transition-colors group">
                            <span className="text-[10px]">Tell me what you want to do</span>
                            <HelpCircle size={14} className="group-hover:scale-110 transition-transform" />
                        </div>
                    </div>

                    {/* ══════════════════ RIBBON CONTENT ══════════════════ */}
                    <div className="min-h-[90px] bg-muted/50 dark:bg-muted/20 border-b border-border flex items-start px-3 py-2 gap-1 overflow-x-auto shrink-0 select-none shadow-sm">

                        {/* ── FILE TAB ── */}
                        {activeTab === 'File' && (
                            <div className="flex items-center gap-3 py-2">
                                {onDownload && (
                                    <button onClick={onDownload} className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-background border border-transparent hover:border-border rounded cursor-pointer">
                                        <Download size={22} className="text-primary" />
                                        <span className="text-[10px] font-medium">Download</span>
                                    </button>
                                )}
                                <button onClick={() => window.print()} className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-background border border-transparent hover:border-border rounded cursor-pointer">
                                    <Printer size={22} className="text-primary" />
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
                                    <div className="flex items-center gap-1.5 h-14">
                                        <button onClick={() => execClipboard('paste')} className="flex flex-col items-center justify-center border border-transparent hover:border-border hover:bg-background px-2.5 py-1 rounded transition-colors group cursor-pointer">
                                            <Clipboard size={22} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5">Paste</span>
                                        </button>
                                        <div className="flex flex-col gap-0.5">
                                            <button onClick={() => execClipboard('cut')} className="flex items-center gap-2 px-2 py-1 hover:bg-background border border-transparent hover:border-border rounded transition-colors cursor-pointer">
                                                <Scissors size={14} className="text-muted-foreground" /><span className="text-[10px]">Cut</span>
                                            </button>
                                            <button onClick={() => execClipboard('copy')} className="flex items-center gap-2 px-2 py-1 hover:bg-background border border-transparent hover:border-border rounded transition-colors cursor-pointer">
                                                <Copy size={14} className="text-muted-foreground" /><span className="text-[10px]">Copy</span>
                                            </button>
                                        </div>
                                    </div>
                                    <SectionLabel>Clipboard</SectionLabel>
                                </div>
                                <Divider />

                                {/* Font */}
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-1">
                                            {/* Font Family */}
                                            <div className="relative">
                                                <button onClick={() => { setShowFontDropdown(!showFontDropdown); setShowSizeDropdown(false); }}
                                                    className="bg-background border border-border rounded px-2 py-0.5 text-xs flex items-center justify-between w-28 cursor-pointer hover:border-primary transition-colors">
                                                    <span className="truncate">{focusedStyle?.fontFamily || 'Calibri'}</span><ChevronDown size={12} className="shrink-0" />
                                                </button>
                                                {showFontDropdown && (
                                                    <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded shadow-xl z-50 w-44 max-h-60 overflow-y-auto p-1">
                                                        {FONT_FAMILIES.map(f => (
                                                            <button key={f} onClick={() => setFontFamily(f)}
                                                                className={cn("w-full text-left px-3 py-1.5 text-xs hover:bg-accent rounded transition-colors", focusedStyle?.fontFamily === f && "bg-primary/20 font-semibold")}
                                                                style={{ fontFamily: f }}>{f}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {/* Font Size */}
                                            <div className="relative">
                                                <button onClick={() => { setShowSizeDropdown(!showSizeDropdown); setShowFontDropdown(false); }}
                                                    className="bg-background border border-border rounded px-2 py-0.5 text-xs flex items-center justify-between w-14 cursor-pointer hover:border-primary transition-colors">
                                                    <span>{Math.round(focusedStyle?.fontSize || 11)}</span><ChevronDown size={12} />
                                                </button>
                                                {showSizeDropdown && (
                                                    <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded shadow-xl z-50 w-16 max-h-60 overflow-y-auto p-1">
                                                        {FONT_SIZES.map(s => (
                                                            <button key={s} onClick={() => setFontSize(s)}
                                                                className={cn("w-full text-left px-3 py-1 text-xs hover:bg-accent rounded transition-colors", Math.round(focusedStyle?.fontSize || 11) === s && "bg-primary/20 font-semibold")}>{s}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="w-px h-4 bg-border/40 mx-0.5" />
                                            <RibbonBtn onClick={clearFormatting} title="Clear All Formatting"><Baseline size={15} className="text-red-500" /></RibbonBtn>
                                        </div>
                                        <div className="flex items-center gap-0.5">
                                            <RibbonBtn active={focusedLineData?.isBold} onClick={toggleBold} title="Bold"><Bold size={15} /></RibbonBtn>
                                            <RibbonBtn active={focusedStyle?.isItalic} onClick={toggleItalic} title="Italic"><Italic size={15} /></RibbonBtn>
                                            <RibbonBtn active={focusedStyle?.isUnderline} onClick={toggleUnderline} title="Underline"><Underline size={15} /></RibbonBtn>
                                            <RibbonBtn active={focusedStyle?.isStrikethrough} onClick={toggleStrikethrough} title="Strikethrough"><Strikethrough size={15} /></RibbonBtn>
                                            <div className="w-px h-5 bg-border/40 mx-0.5" />
                                            <RibbonBtn active={focusedStyle?.isSubscript} onClick={toggleSubscript} title="Subscript"><Subscript size={15} /></RibbonBtn>
                                            <RibbonBtn active={focusedStyle?.isSuperscript} onClick={toggleSuperscript} title="Superscript"><Superscript size={15} /></RibbonBtn>
                                            <div className="w-px h-5 bg-border/40 mx-0.5" />
                                            
                                            {/* Highlight Picker */}
                                            <div className="relative group/color">
                                                <button className="p-1.5 hover:bg-background rounded flex flex-col items-center">
                                                    <Highlighter size={15} style={{ color: focusedStyle?.highlightColor !== 'transparent' ? focusedStyle?.highlightColor : undefined }} />
                                                    <div className="h-0.5 w-4 mt-0.5" style={{ backgroundColor: focusedStyle?.highlightColor === 'transparent' ? '#ccc' : focusedStyle?.highlightColor }} />
                                                </button>
                                                <div className="absolute top-full left-0 mt-1 hidden group-hover/color:grid grid-cols-5 gap-1 p-2 bg-popover border border-border shadow-xl rounded-md z-50">
                                                    {['transparent', '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff0000', '#0000ff', '#000080', '#008080', '#008000'].map(c => (
                                                        <button key={c} onClick={() => setHighlightColor(c)} className="w-5 h-5 border border-border rounded-sm hover:scale-110 transition-transform" style={{ backgroundColor: c === 'transparent' ? '#fff' : c }}>
                                                            {c === 'transparent' && <X size={10} className="text-red-500" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Text Color */}
                                            <div className="relative group/color">
                                                <button className="p-1.5 hover:bg-background rounded flex flex-col items-center">
                                                    <Type size={15} />
                                                    <div className="h-0.5 w-4 mt-0.5" style={{ backgroundColor: focusedStyle?.textColor || '#000' }} />
                                                </button>
                                                <div className="absolute top-full left-0 mt-1 hidden group-hover/color:grid grid-cols-5 gap-1 p-2 bg-popover border border-border shadow-xl rounded-md z-50">
                                                    {['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#808080', '#800000'].map(c => (
                                                        <button key={c} onClick={() => setTextColor(c)} className="w-5 h-5 border border-border rounded-sm hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <SectionLabel>Font</SectionLabel>
                                </div>
                                <Divider />

                                {/* Paragraph */}
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-0.5">
                                            <RibbonBtn active={focusedStyle?.alignment === 'left'} onClick={() => setAlignment('left')} title="Align Left"><AlignLeft size={15} /></RibbonBtn>
                                            <RibbonBtn active={focusedStyle?.alignment === 'center'} onClick={() => setAlignment('center')} title="Center"><AlignCenter size={15} /></RibbonBtn>
                                            <RibbonBtn active={focusedStyle?.alignment === 'right'} onClick={() => setAlignment('right')} title="Align Right"><AlignRight size={15} /></RibbonBtn>
                                            <RibbonBtn active={focusedStyle?.alignment === 'justify'} onClick={() => setAlignment('justify')} title="Justify"><AlignJustify size={15} /></RibbonBtn>
                                            <div className="w-px h-5 bg-border/40 mx-1" />
                                            <RibbonBtn onClick={() => setIndent(-20)} title="Decrease Indent"><Outdent size={15} /></RibbonBtn>
                                            <RibbonBtn onClick={() => setIndent(20)} title="Increase Indent"><Indent size={15} /></RibbonBtn>
                                        </div>
                                        <div className="flex items-center gap-0.5">
                                            <RibbonBtn active={focusedLineData?.isBullet} onClick={toggleBullet} title="Bullets"><List size={15} /></RibbonBtn>
                                            <RibbonBtn title="Numbering"><ListOrdered size={15} /></RibbonBtn>
                                            <div className="w-px h-5 bg-border/40 mx-1" />
                                            <div className="relative group/spacing">
                                                <RibbonBtn title="Line and Paragraph Spacing"><Baseline size={15} /></RibbonBtn>
                                                <div className="absolute top-full left-0 mt-1 hidden group-hover/spacing:flex flex-col p-1.5 bg-popover border border-border shadow-xl rounded-md z-50 w-28">
                                                    {[1, 1.15, 1.5, 2, 2.5, 3].map(v => (
                                                        <button key={v} onClick={() => { if (focusedLine) updateStyle(focusedLine.pageIdx, focusedLine.lineIdx, { lineHeight: v }); }} className="text-left px-2 py-1 hover:bg-accent rounded text-[10px]">{v}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <SectionLabel>Paragraph</SectionLabel>
                                </div>
                                <Divider />

                                {/* Styles */}
                                <div className="flex flex-col items-center gap-1 shrink-0 h-full">
                                    <div className="flex items-center gap-1.5 h-14 overflow-x-auto max-w-[300px] scrollbar-thin pb-1">
                                        <button onClick={clearFormatting} className="flex flex-col items-start border border-border hover:border-primary bg-background px-3 py-1.5 rounded min-w-[70px] h-full transition-colors cursor-pointer">
                                            <span className="text-[11px] font-medium leading-none mb-1">Normal</span>
                                            <span className="text-[8px] text-muted-foreground">AaBbCc</span>
                                        </button>
                                        <button onClick={() => applyHeadingStyle(1)} className="flex flex-col items-start border border-border hover:border-primary bg-background px-3 py-1.5 rounded min-w-[70px] h-full transition-colors cursor-pointer">
                                            <span className="text-[11px] font-bold leading-none mb-1 text-primary">Heading 1</span>
                                            <span className="text-[8px] text-muted-foreground font-bold">AaBbCc</span>
                                        </button>
                                        <button onClick={() => applyHeadingStyle(2)} className="flex flex-col items-start border border-border hover:border-primary bg-background px-3 py-1.5 rounded min-w-[70px] h-full transition-colors cursor-pointer">
                                            <span className="text-[11px] font-bold leading-none mb-1 text-primary">Heading 2</span>
                                            <span className="text-[8px] text-muted-foreground font-bold">AaBbCc</span>
                                        </button>
                                        <button onClick={applyQuoteStyle} className="flex flex-col items-start border border-border hover:border-primary bg-background px-3 py-1.5 rounded min-w-[70px] h-full transition-colors cursor-pointer italic">
                                            <span className="text-[11px] font-medium leading-none mb-1">Quote</span>
                                            <span className="text-[8px] text-muted-foreground">Quote text sample</span>
                                        </button>
                                    </div>
                                    <SectionLabel>Styles</SectionLabel>
                                </div>
                            </>
                        )}

                        {/* ── INSERT TAB ── */}
                        {activeTab === 'Insert' && (
                            <div className="flex items-center gap-1 h-full">
                                {/* Pages Group */}
                                <div className="px-3 flex flex-col items-center gap-1 h-full border-r border-border">
                                    <div className="flex items-center gap-1 pb-1">
                                        <button className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group">
                                            <FileText size={22} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5">Blank Page</span>
                                        </button>
                                        <button onClick={() => { if (!focusedLine) return; const l = pages[focusedLine.pageIdx]?.lines[focusedLine.lineIdx]; if (l) onUpdateLine(focusedLine.pageIdx, focusedLine.lineIdx, l.text + ' [PAGE BREAK]'); }}
                                            className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group">
                                            <SplitSquareHorizontal size={22} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5 text-center leading-tight">Page<br/>Break</span>
                                        </button>
                                    </div>
                                    <SectionLabel>Pages</SectionLabel>
                                </div>

                                {/* Tables */}
                                <div className="px-3 flex flex-col items-center gap-1 h-full border-r border-border">
                                    <button className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group">
                                        <TableIcon size={22} className="text-primary group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] mt-0.5">Table</span>
                                    </button>
                                    <SectionLabel>Tables</SectionLabel>
                                </div>

                                {/* Illustrations */}
                                <div className="px-3 flex flex-col items-center gap-1 h-full border-r border-border">
                                    <div className="flex items-center gap-1 pb-1">
                                        <button 
                                            onClick={() => focusedLine && handleImageUpload(focusedLine.pageIdx, focusedLine.lineIdx)}
                                            className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group">
                                            <ImageIcon size={20} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5">Pictures</span>
                                        </button>
                                        <button className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group">
                                            <Shapes size={20} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5">Shapes</span>
                                        </button>
                                        <button className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group">
                                            <Smile size={20} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5">Icons</span>
                                        </button>
                                    </div>
                                    <SectionLabel>Illustrations</SectionLabel>
                                </div>

                                {/* Links & Text */}
                                <div className="px-3 flex flex-col items-center gap-1 h-full border-r border-border">
                                    <div className="flex items-center gap-1 pb-1">
                                        <button className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group">
                                            <LinkIcon size={20} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5">Link</span>
                                        </button>
                                        <button className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group">
                                            <Bookmark size={20} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5">Bookmark</span>
                                        </button>
                                    </div>
                                    <SectionLabel>Links</SectionLabel>
                                </div>

                                {/* Symbols */}
                                <div className="px-3 flex flex-col items-center gap-1 h-full">
                                    <div className="flex items-center gap-1 pb-1">
                                        <button onClick={() => setShowSymbolPicker(true)} className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group">
                                            <Omega size={22} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5">Symbol</span>
                                        </button>
                                        <button onClick={insertDateTime} className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group">
                                            <Clock size={22} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5">Date</span>
                                        </button>
                                    </div>
                                    <SectionLabel>Symbols</SectionLabel>
                                </div>
                            </div>
                        )}

                        {/* ── DRAW TAB ── */}
                        {activeTab === 'Draw' && (
                            <div className="flex items-center gap-1 h-full">
                                {/* Tools */}
                                <div className="px-3 flex flex-col items-center gap-1 h-full border-r border-border">
                                    <div className="flex items-center gap-1 pb-1">
                                        <button onClick={() => setDrawMode('none')} className={cn("flex flex-col items-center justify-center w-14 h-14 border rounded transition-colors cursor-pointer group", drawMode === 'none' ? "bg-primary/20 border-primary" : "border-transparent hover:border-border hover:bg-background")}>
                                            <Navigation size={22} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5">Select</span>
                                        </button>
                                        <button onClick={() => setDrawMode('pen')} className={cn("flex flex-col items-center justify-center w-14 h-14 border rounded transition-colors cursor-pointer group", drawMode === 'pen' ? "bg-primary/20 border-primary" : "border-transparent hover:border-border hover:bg-background")}>
                                            <PenTool size={22} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5">Draw</span>
                                        </button>
                                        <button onClick={() => setDrawMode('highlighter')} className={cn("flex flex-col items-center justify-center w-14 h-14 border rounded transition-colors cursor-pointer group", drawMode === 'highlighter' ? "bg-primary/20 border-primary" : "border-transparent hover:border-border hover:bg-background")}>
                                            <Highlighter size={22} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5">Highlight</span>
                                        </button>
                                        <button onClick={() => setDrawMode('eraser')} className={cn("flex flex-col items-center justify-center w-14 h-14 border rounded transition-colors cursor-pointer group", drawMode === 'eraser' ? "bg-primary/20 border-primary" : "border-transparent hover:border-border hover:bg-background")}>
                                            <Eraser size={22} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5">Eraser</span>
                                        </button>
                                    </div>
                                    <SectionLabel>Drawing Tools</SectionLabel>
                                </div>

                                {/* Pens Color */}
                                <div className="px-3 flex flex-col items-center gap-1 h-full">
                                    <div className="flex items-center gap-1.5 pb-1 h-14">
                                        {['#000000', '#ff0000', '#0000ff', '#008000', '#ffff00'].map(c => (
                                            <button key={c} onClick={() => setDrawColor(c)} 
                                                className={cn("w-6 h-6 rounded-full border-2 transition-all hover:scale-110", drawColor === c ? "border-primary ring-1 ring-primary" : "border-border shadow-sm")}
                                                style={{ backgroundColor: c }} />
                                        ))}
                                    </div>
                                    <SectionLabel>Pens</SectionLabel>
                                </div>
                            </div>
                        )}

                        {/* ── DESIGN TAB ── */}
                        {activeTab === 'Design' && (
                            <div className="flex items-center gap-3 py-2">
                                {/* Page Color */}
                                <div className="flex flex-col items-center gap-1">
                                    <div className="relative">
                                        <button onClick={() => setShowColorPicker(!showColorPicker)}
                                            className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-background border border-transparent hover:border-border rounded cursor-pointer">
                                            <Palette size={22} className="text-primary" />
                                            <span className="text-[10px] font-medium">Page Color</span>
                                        </button>
                                        {showColorPicker && (
                                            <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded shadow-lg z-50 p-3">
                                                <p className="text-[10px] text-muted-foreground mb-2 font-medium">Choose page background:</p>
                                                <div className="grid grid-cols-5 gap-1.5">
                                                    {['#ffffff', '#f8f9fa', '#fff3cd', '#d1ecf1', '#d4edda', '#f5c6cb', '#e2e3e5', '#cce5ff', '#ffeaa7', '#fab1a0'].map(c => (
                                                        <button key={c} onClick={() => { setPageColor(c); setShowColorPicker(false); }}
                                                            className={cn("w-7 h-7 rounded border-2 transition-all hover:scale-110", pageColor === c ? "border-primary ring-1 ring-primary" : "border-border")}
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
                                                className="px-3 py-1.5 text-xs border border-border rounded hover:border-primary hover:bg-accent transition-colors transition-all"
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
                            <div className="flex items-center gap-1 h-full">
                                {/* Page Setup Group */}
                                <div className="px-3 flex flex-col items-center gap-1 h-full border-r border-border">
                                    <div className="flex items-center gap-1 pb-1">
                                        <div className="relative group/margins">
                                            <button className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group">
                                                <Maximize2 size={20} className="text-primary group-hover:scale-110 transition-transform" />
                                                <span className="text-[10px] mt-0.5">Margins</span>
                                            </button>
                                            <div className="absolute top-full left-0 mt-1 hidden group-hover/margins:flex flex-col p-1.5 bg-popover border border-border shadow-xl rounded-md z-50 w-32 translate-y-[-10px] opacity-0 group-hover/margins:translate-y-0 group-hover/margins:opacity-100 transition-all">
                                                {[{ n: 'Normal', v: 72 }, { n: 'Narrow', v: 36 }, { n: 'Wide', v: 120 }].map(m => (
                                                    <button key={m.n} onClick={() => setPagePadding(m.v)} className="text-left px-3 py-1.5 hover:bg-accent rounded text-[10px] transition-colors">{m.n}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="relative group/orient">
                                            <button className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group">
                                                <RotateCw size={20} className="text-primary group-hover:scale-110 transition-transform" />
                                                <span className="text-[10px] mt-0.5">Orientation</span>
                                            </button>
                                            <div className="absolute top-full left-0 mt-1 hidden group-hover/orient:flex flex-col p-1.5 bg-popover border border-border shadow-xl rounded-md z-50 w-32 translate-y-[-10px] opacity-0 group-hover/orient:translate-y-0 group-hover/orient:opacity-100 transition-all">
                                                <button onClick={() => setOrientation('portrait')} className="text-left px-3 py-1.5 hover:bg-accent rounded text-[10px] transition-colors">Portrait</button>
                                                <button onClick={() => setOrientation('landscape')} className="text-left px-3 py-1.5 hover:bg-accent rounded text-[10px] transition-colors">Landscape</button>
                                            </div>
                                        </div>
                                        <button className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group">
                                            <Columns size={20} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5">Columns</span>
                                        </button>
                                    </div>
                                    <SectionLabel>Page Setup</SectionLabel>
                                </div>
                                <div className="px-3 flex flex-col items-center gap-1 h-full">
                                    <div className="flex items-center gap-1 pb-1">
                                        <button onClick={() => setIndent(-20)} className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group">
                                            <Outdent size={20} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5">Outdent</span>
                                        </button>
                                        <button onClick={() => setIndent(20)} className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group">
                                            <Indent size={20} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5">Indent</span>
                                        </button>
                                    </div>
                                    <SectionLabel>Paragraph</SectionLabel>
                                </div>
                            </div>
                        )}

                        {/* ── REFERENCES TAB ── */}
                        {activeTab === 'References' && (
                            <div className="flex items-center gap-1 h-full">
                                <div className="px-3 flex flex-col items-center gap-1 h-full border-r border-border">
                                    <button className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group">
                                        <List size={22} className="text-primary group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] mt-0.5 text-center leading-tight">Table of<br/>Contents</span>
                                    </button>
                                    <SectionLabel>Table of Contents</SectionLabel>
                                </div>
                                <div className="px-3 flex flex-col items-center gap-1 h-full border-r border-border">
                                    <button className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group">
                                        <Footprints size={20} className="text-primary group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] mt-0.5 text-center leading-tight">Footnote</span>
                                    </button>
                                    <SectionLabel>Footnotes</SectionLabel>
                                </div>
                            </div>
                        )}

                        {/* ── MAILINGS TAB ── */}
                        {activeTab === 'Mailings' && (
                            <div className="flex items-center gap-1 h-full">
                                <div className="px-3 flex flex-col items-center gap-1 h-full border-r border-border">
                                    <div className="flex items-center gap-1 pb-1">
                                        <button className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group">
                                            <Mail size={22} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5">Envelopes</span>
                                        </button>
                                        <button className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group">
                                            <Hash size={22} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5">Labels</span>
                                        </button>
                                    </div>
                                    <SectionLabel>Create</SectionLabel>
                                </div>
                            </div>
                        )}

                        {/* ── REVIEW TAB ── */}
                        {activeTab === 'Review' && (
                            <div className="flex items-center gap-1 h-full">
                                <div className="px-3 flex flex-col items-center gap-1 h-full border-r border-border">
                                    <div className="flex items-center gap-1 pb-1">
                                        <button className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group">
                                            <CheckSquare size={22} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5 text-center leading-tight">Spelling &<br/>Grammar</span>
                                        </button>
                                        <button onClick={() => setShowWordCount(true)} className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group">
                                            <BarChart3 size={22} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5 text-center leading-tight">Word<br/>Count</span>
                                        </button>
                                    </div>
                                    <SectionLabel>Proofing</SectionLabel>
                                </div>
                                <div className="px-3 flex flex-col items-center gap-1 h-full border-r border-border">
                                    <div className="flex items-center gap-1 pb-1">
                                        <button 
                                            onClick={() => focusedLine && setShowCommentInput({ pi: focusedLine.pageIdx, li: focusedLine.lineIdx })}
                                            className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group"
                                        >
                                            <MessageSquare size={22} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5">New Comment</span>
                                        </button>
                                        <button className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group opacity-50">
                                            <Trash2 size={20} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5">Delete</span>
                                        </button>
                                    </div>
                                    <SectionLabel>Comments</SectionLabel>
                                </div>
                                <div className="px-3 flex flex-col items-center gap-1 h-full">
                                    <button onClick={() => setShowFindReplace(true)} className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group">
                                        <Replace size={22} className="text-primary group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] mt-0.5 text-center leading-tight">Find &<br/>Replace</span>
                                    </button>
                                    <SectionLabel>Editing</SectionLabel>
                                </div>
                            </div>
                        )}

                        {/* ── VIEW TAB ── */}
                        {activeTab === 'View' && (
                            <div className="flex items-center gap-1 h-full">
                                <div className="px-3 flex flex-col items-center gap-1 h-full border-r border-border">
                                    <div className="flex flex-col gap-1 py-1">
                                        <label className="flex items-center gap-2 cursor-pointer hover:bg-background p-1 rounded transition-colors group">
                                            <input type="checkbox" checked={showRuler} onChange={() => setShowRuler(!showRuler)} className="rounded text-primary focus:ring-primary h-3.5 w-3.5" />
                                            <span className="text-[10px] group-hover:text-primary transition-colors">Ruler</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer hover:bg-background p-1 rounded transition-colors group">
                                            <input type="checkbox" checked={showNavPane} onChange={() => setShowNavPane(!showNavPane)} className="rounded text-primary focus:ring-primary h-3.5 w-3.5" />
                                            <span className="text-[10px] group-hover:text-primary transition-colors">Nav Pane</span>
                                        </label>
                                    </div>
                                    <SectionLabel>Show</SectionLabel>
                                </div>
                                <div className="px-3 flex flex-col items-center gap-1 h-full">
                                    <div className="flex items-center gap-1 pb-1">
                                        <button onClick={() => setScale(Math.max(0.3, scale - 0.1))} className="p-1.5 hover:bg-background rounded transition-colors"><ZoomOut size={16} /></button>
                                        <span className="text-xs font-mono w-10 text-center">{Math.round(scale * 100)}%</span>
                                        <button onClick={() => setScale(Math.min(3, scale + 0.1))} className="p-1.5 hover:bg-background rounded transition-colors"><ZoomIn size={16} /></button>
                                    </div>
                                    <SectionLabel>Zoom</SectionLabel>
                                </div>
                            </div>
                        )}

                        {/* ── HELP TAB ── */}
                        {activeTab === 'Help' && (
                            <div className="px-3 flex flex-col items-center gap-1 h-full">
                                <button className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group">
                                    <HelpCircle size={22} className="text-primary group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] mt-0.5 font-medium">Help</span>
                                </button>
                                <SectionLabel>Help</SectionLabel>
                            </div>
                        )}
                    </div>
                </header>
            )}

            {/* ══════════════════ MAIN AREA ══════════════════ */}
            <div className="flex-1 flex overflow-hidden">
                {/* Navigation Sidebar - MS Word Style */}
                {mode === 'edit' && showNavPane && (
                    <div className="w-[220px] border-r border-border bg-card flex flex-col shrink-0">
                        <div className="px-3 py-3">
                            <h4 className="text-[13px] font-semibold text-primary mb-2 px-1">Navigation</h4>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search document"
                                    className="w-full text-xs bg-background border border-border rounded px-8 py-1.5 focus:outline-none focus:border-primary placeholder:text-muted-foreground/60 shadow-inner"
                                />
                                <Search size={14} className="absolute left-2.5 top-2 text-muted-foreground" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-1">
                            {pages.some(p => p.lines.some(l => l.isHeading)) ? (
                                <div className="space-y-0.5">
                                    {pages.map((page, pi) => page.lines.filter(l => l.isHeading).map((heading, hi) => (
                                        <button key={`${pi}-${hi}`} onClick={() => {
                                            const lineIdx = page.lines.indexOf(heading);
                                            setFocusedLine({ pageIdx: pi, lineIdx });
                                        }} className="w-full flex gap-2 group cursor-pointer hover:bg-muted px-3 py-2 rounded text-left transition-colors">
                                            <div className="w-1.5 h-1.5 mt-1.5 bg-primary rounded-sm shrink-0" />
                                            <span className="text-[11px] text-foreground line-clamp-1">{heading.text}</span>
                                        </button>
                                    )))}
                                </div>
                            ) : (
                                <div className="px-4 py-6 text-center">
                                    <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                                        No headings found. Use the Home tab to make a line a heading.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Content Surface */}
                <div ref={containerRef}
                    className={cn("flex-1 overflow-auto p-12 scroll-smooth flex flex-col items-center gap-12",
                        mode === 'preview' ? "bg-zinc-800" : "bg-neutral-200 dark:bg-black/40"
                    )}>
                    {/* Ruler */}
                    {mode === 'edit' && showRuler && (
                        <div className="w-full max-w-[816px] h-6 bg-background border border-border rounded flex items-center px-2 shrink-0 sticky top-0 z-10">
                            {Array.from({ length: 17 }, (_, i) => (
                                <React.Fragment key={i}>
                                    <span className="text-[8px] text-muted-foreground font-mono">{i}</span>
                                    {i < 16 && <div className="flex-1 border-r border-border h-3" />}
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
                                width: `${orientation === 'portrait' ? page.width : page.height}px`,
                                height: `${orientation === 'portrait' ? page.height : page.width}px`,
                                transform: `scale(${scale})`, transformOrigin: 'top center',
                                marginBottom: `${((orientation === 'portrait' ? page.height : page.width) * scale) - (orientation === 'portrait' ? page.height : page.width)}px`,
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
                                            "absolute outline-none px-1 -mx-1 rounded transition-all",
                                            mode === 'edit' && "hover:bg-blue-100/50 dark:hover:bg-blue-900/30 hover:ring-1 hover:ring-blue-300 focus:bg-blue-100 dark:focus:bg-blue-800/40 focus:ring-1 focus:ring-blue-400",
                                            focusedLine?.pageIdx === pi && focusedLine?.lineIdx === li && "ring-1 ring-blue-400 bg-blue-50/50 dark:bg-blue-900/20"
                                        )}
                                        style={{
                                            left: `${line.x}px`, top: `${line.y}px`,
                                            fontSize: `${s.fontSize}px`,
                                            color: s.textColor,
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
                                        
                                        {/* Comment Indicator */}
                                        {comments[lineKey(pi, li)]?.length > 0 && (
                                            <div className="absolute -right-6 top-0" 
                                                title={comments[lineKey(pi, li)].join('\n')}>
                                                <div className="bg-yellow-100 dark:bg-yellow-900/40 p-1 rounded-full shadow-sm border border-yellow-200 dark:border-yellow-700">
                                                    <MessageSquare size={10} className="text-yellow-600 dark:text-yellow-400" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {mode === 'edit' && (
                                <div className="absolute -bottom-6 left-0 right-0 text-center text-[10px] text-muted-foreground select-none">
                                    Page {pi + 1} of {pages.length}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ══════════════════ STATUS BAR ══════════════════ */}
            {mode === 'edit' && (
                <div className="h-[22px] bg-[#2b579a] dark:bg-[#1a3a6b] flex items-center justify-between px-3 text-white text-[10px] shrink-0 select-none">
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
                        <div className="bg-popover rounded-lg shadow-2xl p-6 w-80 text-foreground" onClick={e => e.stopPropagation()}>
                            <h3 className="text-base font-bold mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-primary" /> Word Count</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between py-1.5 border-b border-border"><span>Pages</span><span className="font-semibold">{stats.pages}</span></div>
                                <div className="flex justify-between py-1.5 border-b border-border"><span>Words</span><span className="font-semibold">{stats.words}</span></div>
                                <div className="flex justify-between py-1.5 border-b border-border"><span>Characters</span><span className="font-semibold">{stats.chars}</span></div>
                                <div className="flex justify-between py-1.5"><span>Lines</span><span className="font-semibold">{stats.lines}</span></div>
                            </div>
                            <button onClick={() => setShowWordCount(false)} className="mt-5 w-full py-2 bg-primary text-primary-foreground text-sm font-medium rounded hover:bg-primary/90 transition-colors">Close</button>
                        </div>
                    </div>
                );
            })()}

            {/* Find & Replace Dialog */}
            {showFindReplace && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={() => setShowFindReplace(false)}>
                    <div className="bg-popover rounded-lg shadow-2xl p-6 w-96 text-foreground" onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-bold mb-4 flex items-center gap-2"><Replace size={18} className="text-primary" /> Find & Replace</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground block mb-1">Find:</label>
                                <input type="text" value={findText} onChange={e => setFindText(e.target.value)}
                                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
                                    placeholder="Text to find..." />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground block mb-1">Replace with:</label>
                                <input type="text" value={replaceText} onChange={e => setReplaceText(e.target.value)}
                                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
                                    placeholder="Replacement text..." />
                            </div>
                        </div>
                        <div className="mt-5 flex gap-2">
                            <button onClick={handleFindReplace} className="flex-1 py-2 bg-primary text-primary-foreground text-sm font-medium rounded hover:bg-primary/90 transition-colors">Replace All</button>
                            <button onClick={() => setShowFindReplace(false)} className="flex-1 py-2 border border-border text-sm font-medium rounded hover:bg-muted transition-colors">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Symbol Picker Dialog */}
            {showSymbolPicker && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={() => setShowSymbolPicker(false)}>
                    <div className="bg-popover rounded-lg shadow-2xl p-6 w-[450px] text-foreground" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
                            <h3 className="text-base font-bold flex items-center gap-2"><Omega size={18} className="text-primary" /> Symbols</h3>
                            <button onClick={() => setShowSymbolPicker(false)} className="hover:bg-muted p-1 rounded-full transition-colors"><X size={18} /></button>
                        </div>
                        <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto p-2 border border-border rounded bg-background scrollbar-thin">
                            {['©', '®', '™', '§', '¶', '†', '‡', '•', '–', '—', '…', '‰', '′', '″', '‹', '›', '«', '»', '¬', '±', '×', '÷', '−', '∞', '≈', '≠', '≤', '≥', '∝', '∂', '∆', '∑', '∏', '√', '∫', 'ƒ', 'λ', 'π', 'Ω', 'α', 'β', 'γ', 'δ', 'ε', 'θ', 'μ', 'φ', 'ω', '€', '£', '¥', '¢', '¤', '☀', '☁', '☂', '☃', '★', '☆', '☎', '☏', '☐', '☑', '☒', '☚', '☛', '☜', '☝', '☞', '☟', '☠', '☡', '☢', '☣', '☤', '☥', '☦', '☧', '☨', '☩', '☪', '☫', '☬', '☭', '☮', '☯', '☸', '☹', '☺', '☻', '☼', '☽', '☾', '☿', '♀', '♁', '♂', '♃', '♄', '♅', '♆', '♇', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '♔', '♕', '♖', '♗', '♘', '♙', '♚', '♛', '♜', '♝', '♞', '♟', '♠', '♡', '♢', '♣', '♤', '♥', '♦', '♧', '♩', '♪', '♫', '♬', '♭', '♮', '♯'].map(s => (
                                <button key={s} onClick={() => insertSymbol(s)} 
                                    className="w-10 h-10 flex items-center justify-center border border-border rounded hover:bg-primary/20 hover:border-primary transition-all text-lg">{s}</button>
                            ))}
                        </div>
                        <p className="mt-4 text-[10px] text-muted-foreground italic text-right">Tip: Recently used symbols appear first.</p>
                        <div className="mt-4 flex justify-end">
                            <button onClick={() => setShowSymbolPicker(false)} className="px-5 py-2 border border-border text-sm font-medium rounded hover:bg-muted transition-colors">Close</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Word Count Modal */}
            {showWordCount && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40" onClick={() => setShowWordCount(false)}>
                    <div className="bg-popover border border-border rounded-lg shadow-2xl p-6 w-80" onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-semibold mb-4 border-b border-border pb-2">Word Count</h3>
                        <div className="space-y-2">
                            {Object.entries(getWordCountStats()).map(([k, v]) => (
                                <div key={k} className="flex justify-between text-sm">
                                    <span className="capitalize text-muted-foreground">{k}:</span>
                                    <span className="font-mono font-medium">{v}</span>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setShowWordCount(false)} className="w-full mt-6 py-2 bg-primary text-primary-foreground font-medium rounded hover:opacity-90 transition-opacity">Close</button>
                    </div>
                </div>
            )}

            {/* Drawing Mode Overlay */}
            {drawMode !== 'none' && (
                <div className="fixed inset-0 z-[120] pointer-events-none">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#2b579a] text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-4 pointer-events-auto border border-white/20">
                        <div className="flex items-center gap-1.5 border-r border-white/20 pr-4">
                            <PenTool size={16} className={cn(drawMode === 'pen' && "text-yellow-400")} />
                            <span className="text-xs font-bold uppercase tracking-wider">Drawing Mode</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] opacity-80 uppercase font-medium">Color:</span>
                            <div className="w-4 h-4 rounded-full border border-white/40 shadow-inner" style={{ backgroundColor: drawColor }} />
                            <button onClick={() => setDrawMode('none')} className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors">Exit & Save</button>
                        </div>
                    </div>
                    {/* Visual hint for drawing area */}
                    <div className="absolute inset-x-0 bottom-0 py-2 bg-yellow-500/10 text-yellow-800 dark:text-yellow-200 text-center text-[10px] font-bold uppercase tracking-[0.2em] border-t border-yellow-500/20 backdrop-blur-sm">
                        Click and drag on the document to draw
                    </div>
                </div>
            )}
            {/* Comment Input Modal */}
            {showCommentInput && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40" onClick={() => setShowCommentInput(null)}>
                    <div className="bg-popover border border-border rounded-lg shadow-2xl p-6 w-96 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-foreground">
                            <MessageSquare size={18} className="text-primary" /> New Comment
                        </h3>
                        <p className="text-[11px] text-muted-foreground mb-4">Add a note to the selected text.</p>
                        <textarea
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            placeholder="Type your comment here..."
                            className="w-full h-32 bg-background border border-border rounded-md p-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all resize-none shadow-inner"
                            autoFocus
                        />
                        <div className="flex justify-end gap-3 mt-4 pt-2 border-t border-border">
                            <button onClick={() => setShowCommentInput(null)} className="px-4 py-2 border border-border text-sm font-medium rounded hover:bg-muted transition-colors">Cancel</button>
                            <button onClick={() => addComment(showCommentInput.pi, showCommentInput.li)} className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded hover:bg-primary/90 transition-shadow shadow-md shadow-primary/20">Post</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WordEditor;
