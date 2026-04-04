import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    X, Type, Bold, Italic, Underline,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Clipboard, Pencil, Download, Eye, Minus, Plus, FileText,
    SplitSquareHorizontal, Table as TableIcon, Indent, Outdent
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
    onUpdatePages: (pages: ExtractedPage[]) => void;
    initialMode?: 'edit' | 'preview';
    onDownload?: () => void;
}

// Ribbon button helper
const RibbonBtn = ({ onClick, children, title, disabled }: {
    onClick?: () => void; children: React.ReactNode; title?: string; disabled?: boolean;
}) => (
    <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onClick?.(); }}
        disabled={disabled}
        title={title}
        className={cn(
            "p-1.5 border border-transparent rounded transition-colors",
            "hover:bg-muted hover:border-border",
            disabled && "opacity-40 cursor-not-allowed"
        )}
    >
        {children}
    </button>
);

const Divider = () => <div className="h-16 w-px bg-border/40 mx-1 shrink-0" />;
const SectionLabel = ({ children }: { children: string }) => (
    <span className="text-[9px] text-muted-foreground mt-1 uppercase tracking-tight">{children}</span>
);

const WordEditor: React.FC<WordEditorProps> = ({
    pages, onClose, onUpdatePages, initialMode = 'preview', onDownload
}) => {
    const [mode, setMode] = useState<'edit' | 'preview'>(initialMode);
    const [activeTab, setActiveTab] = useState('Home');
    const [scale, setScale] = useState(0.85);

    const [pageColor, setPageColor] = useState('#ffffff');
    const { theme } = useTheme();
    const tabs = ['Home', 'Insert'];
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        setPageColor(theme === 'dark' ? '#1e1e1e' : '#ffffff');
    }, [theme]);

    // Internal state: map ExtractedPages to HTML string array
    const [pageHtmls, setPageHtmls] = useState<string[]>(() => {
        return pages.map(page => {
            return page.lines.map(line => {
                let txt = line.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                if (!txt.trim()) return '<br>';
                if (line.isHeading) return `<h2><b>${txt}</b></h2>`;
                if (line.isBold) return `<div><b>${txt}</b></div>`;
                return `<div>${txt}</div>`;
            }).join('');
        });
    });

    const syncToPages = useCallback(() => {
        const newPages = pageHtmls.map((_html, pi) => {
            const el = pageRefs.current[pi];
            // Start with base width/height of the original page, or generic A4
            const basePage = pages[pi] || { width: 595, height: 842, lines: [] };
            if (!el) return basePage;

            const lines: ExtractedLine[] = [];
            let currentY = 50;

            const traverseNodes = (node: ChildNode) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    const txt = node.textContent?.trim();
                    if (txt) {
                        let isBold = false;
                        let isHeading = false;
                        let p = node.parentElement;
                        while (p && p !== el) {
                            if (p.nodeName === 'B' || p.nodeName === 'STRONG' || p.style.fontWeight === 'bold') isBold = true;
                            if (p.nodeName === 'H1' || p.nodeName === 'H2' || p.nodeName === 'H3') isHeading = true;
                            p = p.parentElement;
                        }
                        lines.push({
                            items: [],
                            x: 50,
                            y: currentY,
                            text: txt,
                            fontSize: isHeading ? 18 : 11,
                            isBold,
                            isHeading,
                            isBullet: txt.startsWith('•') || txt.startsWith('-')
                        });
                        currentY += 20;
                    }
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    const elNode = node as HTMLElement;
                    if (elNode.nodeName === 'BR' || elNode.classList.contains('page-break')) {
                        currentY += 20;
                    } else {
                        node.childNodes.forEach(traverseNodes);
                    }
                }
            };

            el.childNodes.forEach(traverseNodes);
            // Fallback for completely empty page
            if (lines.length === 0) {
                lines.push({ items: [], x: 50, y: 50, text: '', fontSize: 11, isBold: false, isHeading: false, isBullet: false });
            }

            return { ...basePage, lines };
        });

        onUpdatePages(newPages);
    }, [pageHtmls, pages, onUpdatePages]);

    // Format Commands using execCommand to operate purely on standard selection
    const exec = (cmd: string, val?: string) => {
        document.execCommand(cmd, false, val);
        pageRefs.current.forEach(el => el?.focus());
    };

    const handleClose = () => {
        if (mode === 'preview' && initialMode === 'edit') {
            setMode('edit');
        } else {
            syncToPages();
            onClose();
        }
    };

    const handleDownload = () => {
        syncToPages();
        if (onDownload) onDownload();
    };

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
                            <Pencil size={14} /> Back to Editor
                        </button>
                    </div>
                    <div className="flex items-center gap-6 bg-black/40 px-4 py-1 rounded-md border border-white/5">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setScale(Math.max(0.3, scale - 0.1))} className="p-1 hover:bg-white/10 rounded-full"><Minus size={16} /></button>
                            <span className="text-xs font-medium min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
                            <button onClick={() => setScale(Math.min(3, scale + 0.1))} className="p-1 hover:bg-white/10 rounded-full"><Plus size={16} /></button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onDownload && <button onClick={handleDownload} className="p-2 hover:bg-white/10 rounded-full" title="Download"><Download size={18} /></button>}
                        <button onClick={handleClose} className="p-2 hover:bg-red-500 rounded-full ml-2" title="Close"><X size={20} /></button>
                    </div>
                </div>
            ) : (
                /* ══════════════════ EDIT MODE RIBBON ══════════════════ */
                <header className="shrink-0">
                    <div className="h-[42px] bg-[#2b579a] dark:bg-[#1a3a6b] flex items-center justify-between px-4 text-white shrink-0 border-b border-black/10">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium tracking-wide">Document Generator</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onMouseDown={(e) => { e.preventDefault(); syncToPages(); alert('Changes saved!'); }}
                                className="h-7 px-4 bg-white/10 hover:bg-white/20 rounded text-[11px] font-medium transition-colors shadow-sm"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => { syncToPages(); setMode('preview'); }}
                                className="h-7 px-4 bg-white/10 hover:bg-white/20 rounded text-[11px] font-medium transition-colors border border-white/20 flex items-center gap-1.5"
                            >
                                <Eye size={13} /> Preview
                            </button>
                            {onDownload && (
                                <button
                                    onClick={handleDownload}
                                    className="h-7 px-4 bg-[#107c10] hover:bg-[#0b5a0b] rounded text-[11px] font-medium transition-colors shadow-sm flex items-center gap-1.5"
                                >
                                    <Download size={13} /> Download
                                </button>
                            )}
                            <button onClick={handleClose} className="p-2 hover:bg-red-600 transition-colors rounded-sm ml-2" title="Close"><X size={18} /></button>
                        </div>
                    </div>

                    <div className="bg-[#2b579a] dark:bg-[#1a3a6b] flex items-end shrink-0 select-none px-2 h-9">
                        {tabs.map((tab) => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={cn("px-5 py-2 text-[11px] font-medium transition-colors rounded-t-[4px] relative top-[1px]",
                                    activeTab === tab ? "bg-muted text-foreground dark:bg-muted dark:text-primary shadow-[0_-2px_4px_rgba(0,0,0,0.1)]" : "text-white/90 hover:bg-white/10"
                                )}>{tab}</button>
                        ))}
                    </div>

                    <div className="min-h-[90px] bg-muted/50 dark:bg-muted/20 border-b border-border flex items-start px-3 py-2 gap-1 overflow-x-auto shrink-0 select-none shadow-sm scrollbar-hide">
                        {/* ── HOME TAB ── */}
                        {activeTab === 'Home' && (
                            <>
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                    <div className="flex items-center gap-1.5 h-14">
                                        <button onMouseDown={e => { e.preventDefault(); exec('paste'); }} className="flex flex-col items-center justify-center border border-transparent hover:border-border hover:bg-background px-2.5 py-1 rounded transition-colors cursor-pointer">
                                            <Clipboard size={22} className="text-primary" />
                                            <span className="text-[10px] mt-0.5">Paste</span>
                                        </button>
                                    </div>
                                    <SectionLabel>Clipboard</SectionLabel>
                                </div>
                                <Divider />
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-0.5">
                                            <RibbonBtn onClick={() => exec('bold')} title="Bold"><Bold size={15} /></RibbonBtn>
                                            <RibbonBtn onClick={() => exec('italic')} title="Italic"><Italic size={15} /></RibbonBtn>
                                            <RibbonBtn onClick={() => exec('underline')} title="Underline"><Underline size={15} /></RibbonBtn>
                                            <div className="w-px h-5 bg-border/40 mx-0.5" />
                                        </div>
                                        <div className="flex items-center gap-0.5">
                                            <select
                                                onChange={(e) => { exec('fontSize', e.target.value); }}
                                                className="bg-background border border-border rounded px-1 py-0.5 text-xs select-none min-w-[60px]"
                                                defaultValue=""
                                            >
                                                <option value="" disabled>Size</option>
                                                <option value="1">1 (8pt)</option>
                                                <option value="2">2 (10pt)</option>
                                                <option value="3">3 (12pt)</option>
                                                <option value="4">4 (14pt)</option>
                                                <option value="5">5 (18pt)</option>
                                                <option value="6">6 (24pt)</option>
                                                <option value="7">7 (36pt)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <SectionLabel>Font</SectionLabel>
                                </div>
                                <Divider />
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-0.5">
                                            <RibbonBtn onClick={() => exec('justifyLeft')} title="Align Left"><AlignLeft size={15} /></RibbonBtn>
                                            <RibbonBtn onClick={() => exec('justifyCenter')} title="Center"><AlignCenter size={15} /></RibbonBtn>
                                            <RibbonBtn onClick={() => exec('justifyRight')} title="Align Right"><AlignRight size={15} /></RibbonBtn>
                                            <RibbonBtn onClick={() => exec('justifyFull')} title="Justify"><AlignJustify size={15} /></RibbonBtn>
                                        </div>
                                        <div className="flex items-center gap-0.5">
                                            <RibbonBtn onClick={() => exec('indent')} title="Increase Indent"><Indent size={15} /></RibbonBtn>
                                            <RibbonBtn onClick={() => exec('outdent')} title="Decrease Indent"><Outdent size={15} /></RibbonBtn>
                                        </div>
                                    </div>
                                    <SectionLabel>Paragraph</SectionLabel>
                                </div>
                                <Divider />
                                <div className="flex flex-col items-center gap-1 shrink-0 h-full">
                                    <div className="flex items-center gap-1.5 h-14 overflow-x-auto">
                                        <button onMouseDown={(e) => { e.preventDefault(); exec('formatBlock', 'DIV'); }} className="flex flex-col items-start border border-border hover:border-primary bg-background px-3 py-1.5 rounded min-w-[70px] transition-colors cursor-pointer">
                                            <span className="text-[11px] font-medium leading-none mb-1">Normal</span>
                                            <span className="text-[8px] text-muted-foreground">AaBbCc</span>
                                        </button>
                                        <button onMouseDown={(e) => { e.preventDefault(); exec('formatBlock', 'H1'); }} className="flex flex-col items-start border border-border hover:border-primary bg-background px-3 py-1.5 rounded min-w-[70px] transition-colors cursor-pointer">
                                            <span className="text-[11px] font-bold leading-none mb-1 text-primary">Heading 1</span>
                                            <span className="text-[8px] text-muted-foreground font-bold">AaBbCc</span>
                                        </button>
                                    </div>
                                    <SectionLabel>Styles</SectionLabel>
                                </div>
                            </>
                        )}
                        {/* ── INSERT TAB ── */}
                        {activeTab === 'Insert' && (
                            <div className="flex items-center gap-1 h-full">
                                <div className="px-3 flex flex-col items-center gap-1 h-full border-r border-border">
                                    <div className="flex items-center gap-1 pb-1">
                                        <button
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setPageHtmls(prev => [...prev, '<div><br></div>']);
                                            }}
                                            className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group"
                                        >
                                            <FileText size={22} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5">Blank Page</span>
                                        </button>
                                        <button
                                            onMouseDown={(e) => { e.preventDefault(); exec('insertHTML', '<hr class="page-break" style="page-break-after: always; border: 1px dashed #ccc; margin: 20px 0;" /><p><br></p>'); }}
                                            className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group"
                                        >
                                            <SplitSquareHorizontal size={22} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5 text-center leading-tight">Page<br />Break</span>
                                        </button>
                                        <button
                                            onMouseDown={(e) => { e.preventDefault(); exec('insertHTML', '<br><table border="1" style="width:100%; border-collapse: collapse; margin-top: 10px;"><tr><td style="padding: 8px;">Cell 1</td><td style="padding: 8px;">Cell 2</td></tr></table><br>'); }}
                                            className="flex flex-col items-center justify-center w-14 h-14 border border-transparent hover:border-border hover:bg-background rounded transition-colors cursor-pointer group"
                                        >
                                            <TableIcon size={22} className="text-primary group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] mt-0.5">Table</span>
                                        </button>
                                    </div>
                                    <SectionLabel>Pages & Tables</SectionLabel>
                                </div>
                            </div>
                        )}
                    </div>
                </header>
            )}

            {/* ══════════════════ MAIN AREA ══════════════════ */}
            <div className="flex-1 flex overflow-hidden scrollbar-hide">
                <div className={cn("flex-1 overflow-y-auto p-12 scroll-smooth flex flex-col items-center gap-12 scrollbar-hide", mode === 'preview' ? "bg-zinc-800" : "bg-neutral-200 dark:bg-black/40")}>
                    {/* Render Pages */}
                    {pageHtmls.map((html, pi) => {
                        return (
                            <div key={pi}
                                className={cn("relative shrink-0 group transition-shadow flex flex-col items-stretch",
                                    mode === 'preview' ? "shadow-[0_4px_20px_rgba(0,0,0,0.3)]" : "shadow-[0_2px_10px_rgba(0,0,0,0.15)] ring-1 ring-black/5"
                                )}
                                style={{
                                    // Let CSS handle sizing, but give a base A4 width ratio
                                    width: `840px`,
                                    minHeight: `1188px`,
                                    transform: `scale(${scale})`, transformOrigin: 'top center',
                                    marginBottom: `${(1188 * scale) - 1188 + 48}px`,
                                    backgroundColor: pageColor,
                                }}>
                                <div
                                    ref={el => { pageRefs.current[pi] = el; }}
                                    contentEditable={mode === 'edit'}
                                    suppressContentEditableWarning
                                    className="w-full h-full min-h-[1188px] outline-none text-[15px] p-[72px]"
                                    style={{
                                        fontFamily: '"Calibri", "Segoe UI", sans-serif'
                                    }}
                                    dangerouslySetInnerHTML={{ __html: html }}
                                    onBlur={() => {
                                        // Save back to html map to keep state fresh on blur mapping
                                        if (pageRefs.current[pi]) {
                                            const newHtmls = [...pageHtmls];
                                            newHtmls[pi] = pageRefs.current[pi]!.innerHTML;
                                            setPageHtmls(newHtmls);
                                        }
                                        syncToPages();
                                    }}
                                />
                                {mode === 'edit' && (
                                    <div className="absolute -bottom-6 left-0 right-0 text-center text-[10px] text-muted-foreground select-none">
                                        Page {pi + 1} of {pageHtmls.length}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ══════════════════ STATUS BAR ══════════════════ */}
            {mode === 'edit' && (
                <div className="h-[22px] bg-[#2b579a] dark:bg-[#1a3a6b] flex items-center justify-between px-3 text-white text-[10px] shrink-0 select-none">
                    <div className="flex items-center gap-4">
                        <span>Page {1} of {pageHtmls.length}</span>
                        <span>{pages.reduce((acc, p) => acc + p.lines.reduce((lacc, l) => lacc + l.text.split(/\s+/).filter(Boolean).length, 0), 0)} words</span>
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
        </div>
    );
};

export default WordEditor;
