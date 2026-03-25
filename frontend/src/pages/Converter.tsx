import { ArrowRight, CheckCircle2, Loader2, Eye, Download, Pencil, FileText } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import FileUpload from '../components/ui/FileUpload';
import AdSpace from '../components/ui/AdSpace';
import WordEditor from '../components/ui/WordEditor';
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'https://my-cloudflare-api.rpadmajaa-14.workers.dev';
import * as pdfjsLib from 'pdfjs-dist';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
// @ts-ignore - Vite special import
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set worker source - use local Vite-bundled worker with CDN fallbacks
try {
    // 1. Try local bundled worker (most reliable for Vite)
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
    console.log('PDF: Using local worker:', pdfWorker);
} catch (e) {
    console.warn('PDF: Local worker failed, trying CDNs:', e);
    // 2. Fallback CDNs - Match version from package.json (5.4.530)
    const version = '5.4.530';
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
}

// ── Types ──────────────────────────────────────────────────────────────
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
    x: number; // Leftmost item x
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

type OutputFormat = 'docx' | 'pdf' | 'txt' | 'md';

// ── Smart text extraction ──────────────────────────────────────────────
async function extractPagesWithLayout(file: File): Promise<ExtractedPage[]> {
    console.log('PDF: Starting extraction for:', file.name);
    try {
        const arrayBuffer = await file.arrayBuffer();
        console.log('PDF: ArrayBuffer size:', arrayBuffer.byteLength);

        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            useWorkerFetch: true
        });

        const pdf = await loadingTask.promise;
        console.log('PDF: Document loaded, pages:', pdf.numPages);

        const pages: ExtractedPage[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            console.log(`PDF: Extracting page ${i}...`);
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1 });
            const textContent = await page.getTextContent();

            // Map text items to our format
            const items: ExtractedTextItem[] = textContent.items
                .filter((item: any) => item.str && item.str.trim().length > 0)
                .map((item: any) => {
                    const tx = item.transform;
                    const fontSize = Math.abs(tx[0]) || Math.abs(tx[3]) || 12;
                    const fontName: string = (item.fontName || '').toLowerCase();
                    const isBold = fontName.includes('bold') || fontName.includes('black');
                    return {
                        str: item.str,
                        x: tx[4],
                        y: viewport.height - tx[5],
                        fontSize,
                        fontName,
                        width: item.width ?? 0,
                        isBold,
                    };
                });

            // Sort top-to-bottom, then left-to-right
            items.sort((a, b) => (Math.abs(a.y - b.y) < 2 ? a.x - b.x : a.y - b.y));

            const lines: ExtractedLine[] = [];
            const LINE_TOLERANCE = 4;

            for (const item of items) {
                const existing = lines.find(l => Math.abs(l.y - item.y) < LINE_TOLERANCE);
                if (existing) {
                    existing.items.push(item);
                    existing.x = Math.min(existing.x, item.x);
                } else {
                    lines.push({ items: [item], y: item.y, x: item.x, text: '', fontSize: 0, isBold: false, isHeading: false, isBullet: false });
                }
            }

            for (const line of lines) {
                line.items.sort((a, b) => a.x - b.x);
                let text = '';
                for (let j = 0; j < line.items.length; j++) {
                    const curr = line.items[j];
                    if (j > 0) {
                        const prev = line.items[j - 1];
                        const gap = curr.x - (prev.x + prev.width);
                        if (gap > curr.fontSize * 0.3) text += '  ';
                        else if (gap > 1) text += ' ';
                    }
                    text += curr.str;
                }
                line.text = text.trim();
                line.fontSize = Math.max(...line.items.map(it => it.fontSize));
                line.isBold = line.items.some(it => it.isBold);
                line.isHeading = line.fontSize >= 14 || (line.isBold && line.text.length < 60);
                line.isBullet = /^[\u2022\u25CF\u25CB•\-\*]\s/.test(line.text);
            }

            pages.push({ lines, width: viewport.width, height: viewport.height });
        }

        console.log('PDF: Extraction complete, total pages:', pages.length);
        return pages;
    } catch (error) {
        console.error('PDF: Error in extractPagesWithLayout:', error);
        throw error;
    }
}

// ── Convert to Word ────────────────────────────────────────────────────
function buildDocxFromPages(pages: ExtractedPage[]): Document {
    const children: Paragraph[] = [];

    for (let pi = 0; pi < pages.length; pi++) {
        const page = pages[pi];
        for (const line of page.lines) {
            if (!line.text) continue;

            // Use the raw text as-is (already contains bullet chars like • or -)
            const runs: TextRun[] = [
                new TextRun({
                    text: line.text,
                    bold: line.isBold || line.isHeading,
                    size: Math.round(line.fontSize * 2), // docx uses half-points
                    font: 'Calibri',
                }),
            ];

            const para = new Paragraph({
                children: runs,
                heading: line.isHeading ? HeadingLevel.HEADING_2 : undefined,
                spacing: { after: line.isHeading ? 120 : 60, before: line.isHeading ? 240 : 0 },
                alignment: AlignmentType.LEFT,
            });

            children.push(para);
        }

        // page break between pages
        if (pi < pages.length - 1) {
            children.push(new Paragraph({ children: [], pageBreakBefore: true }));
        }
    }

    return new Document({ sections: [{ properties: {}, children }] });
}

// ── Convert to Plain Text ──────────────────────────────────────────────
function buildTextFromPages(pages: ExtractedPage[]): string {
    const parts: string[] = [];
    for (const page of pages) {
        const pageText = page.lines
            .filter(l => l.text)
            .map(l => l.text)
            .join('\n');
        parts.push(pageText);
    }
    return parts.join('\n\n--- Page Break ---\n\n');
}

// ── Convert to Markdown ────────────────────────────────────────────────
function buildMarkdownFromPages(pages: ExtractedPage[]): string {
    const parts: string[] = [];
    for (const page of pages) {
        const lines: string[] = [];
        for (const line of page.lines) {
            if (!line.text) continue;
            if (line.isHeading) {
                lines.push(`## ${line.text}`);
            } else if (line.isBullet) {
                // Normalize bullet to markdown list item
                const clean = line.text.replace(/^[\u2022\u25CF\u25CB•\-\*]\s*/, '');
                lines.push(`- ${clean}`);
            } else if (line.isBold) {
                lines.push(`**${line.text}**`);
            } else {
                lines.push(line.text);
            }
        }
        parts.push(lines.join('\n'));
    }
    return parts.join('\n\n---\n\n');
}

// ── Convert to PDF ─────────────────────────────────────────────────────
function buildPdfFromPages(pages: ExtractedPage[]): jsPDF {
    const firstPage = pages[0] || { width: 595, height: 842 };

    // Determine orientation: 'p' for portrait, 'l' for landscape
    const orientation = firstPage.width > firstPage.height ? 'l' : 'p';

    const doc = new jsPDF({
        orientation,
        unit: 'pt',
        format: [firstPage.width, firstPage.height],
        putOnlyUsedFonts: true,
        compress: true
    });

    for (let pi = 0; pi < pages.length; pi++) {
        const page = pages[pi];
        if (pi > 0) {
            // In jsPDF, addPage(format, orientation)
            doc.addPage([page.width, page.height], page.width > page.height ? 'l' : 'p');
        }

        for (const line of page.lines) {
            if (!line.text) continue;

            // Ensure fontSize is a valid number
            const fSize = Math.max(line.fontSize || 10, 1);

            try {
                if (line.isBold || line.isHeading) {
                    doc.setFont('helvetica', 'bold');
                } else {
                    doc.setFont('helvetica', 'normal');
                }
                doc.setFontSize(fSize);

                // Use the original coordinates. 
                doc.text(line.text, line.x, line.y);
            } catch (err) {
                console.warn('Failed to render line in PDF:', line.text, err);
            }
        }
    }

    return doc;
}

// ── Preview Component (inline) ─────────────────────────────────────────

// ── Main Converter Page ────────────────────────────────────────────────
const Converter = () => {
    const { token } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [isConverting, setIsConverting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [outputFormat, setOutputFormat] = useState<OutputFormat>('docx');
    const [extractedPages, setExtractedPages] = useState<ExtractedPage[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('preview');
    const [isExtracting, setIsExtracting] = useState(false);

    // Update specific line in the state
    const handleUpdateLine = useCallback((pageIdx: number, lineIdx: number, newText: string) => {
        setExtractedPages(prev => {
            const next = [...prev];
            const page = { ...next[pageIdx] };
            const lines = [...page.lines];
            lines[lineIdx] = { ...lines[lineIdx], text: newText };
            page.lines = lines;
            next[pageIdx] = page;
            return next;
        });
    }, []);

    const handleUpdateLineStyle = useCallback((pageIdx: number, lineIdx: number, styles: Partial<ExtractedLine>) => {
        setExtractedPages(prev => {
            const next = [...prev];
            const page = { ...next[pageIdx] };
            const lines = [...page.lines];
            lines[lineIdx] = { ...lines[lineIdx], ...styles };
            page.lines = lines;
            next[pageIdx] = page;
            return next;
        });
    }, []);

    // Auto-extract on file select for preview
    const handleFileSelect = useCallback(async (selectedFile: File) => {
        console.log('UI: File selected', selectedFile.name, 'Size:', selectedFile.size);
        
        // Validation: Only PDF allowed
        if (selectedFile.type !== 'application/pdf' && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
            setError('Only PDF files are allowed. Please upload a valid PDF document.');
            return;
        }

        // Validation: Max size 25MB
        if (selectedFile.size > 25 * 1024 * 1024) {
            setError('File is too large. Maximum supported size is 25MB.');
            return;
        }

        setFile(selectedFile);
        setError(null);
        setProgress(0);
        setExtractedPages([]);
        setShowPreview(false);
        setEditorMode('preview');

        try {
            setIsExtracting(true);
            console.log('UI: Starting extraction...');
            const pages = await extractPagesWithLayout(selectedFile);
            console.log('UI: Extraction finished. Pages found:', pages.length);

            if (pages.length > 0) {
                setExtractedPages(pages);
                console.log('UI: State updated with pages');
            } else {
                console.warn('UI: No pages returned from extraction');
                setError('No text content found. This might be an image-only PDF.');
            }
        } catch (err: any) {
            console.error('UI: Extraction error caught in handler:', err);
            setError('Could not extract text. The PDF might be corrupted or password-protected.');
        } finally {
            // Simulate processing finish
            setTimeout(() => {
                setIsExtracting(false);
                console.log('UI: Extraction state reset (isExtracting=false)');
            }, 1000);
        }
    }, [extractPagesWithLayout]);

    const handleRemoveFile = useCallback(() => {
        setFile(null);
        setExtractedPages([]);
        setShowPreview(false);
        setError(null);
        setProgress(0);
    }, []);

    // Escape key to close preview
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowPreview(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const convertDocument = async () => {
        if (!file) return;

        if (extractedPages.length === 0) {
            setError('Cannot convert: No text content was extracted. Please upload a valid PDF.');
            return;
        }

        try {
            console.log('Starting conversion to', outputFormat);
            setIsConverting(true);
            setProgress(20);
            setError(null);

            const baseName = file.name.replace(/\.[^/.]+$/, '');

            if (outputFormat === 'docx') {
                console.log('Building DOCX...');
                setProgress(40);
                const doc = buildDocxFromPages(extractedPages);
                setProgress(60);
                const blob = await Packer.toBlob(doc);
                setProgress(80);
                saveAs(blob, `${baseName}.docx`);
                console.log('DOCX download triggered');
            } else if (outputFormat === 'pdf') {
                console.log('Building PDF...');
                setProgress(40);
                const pdf = buildPdfFromPages(extractedPages);
                setProgress(70);
                pdf.save(`${baseName}_converted.pdf`);
                console.log('PDF download triggered');
            } else if (outputFormat === 'txt') {
                console.log('Building TXT...');
                setProgress(50);
                const text = buildTextFromPages(extractedPages);
                setProgress(80);
                const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                saveAs(blob, `${baseName}.txt`);
                console.log('TXT download triggered');
            } else if (outputFormat === 'md') {
                console.log('Building Markdown...');
                setProgress(50);
                const md = buildMarkdownFromPages(extractedPages);
                setProgress(80);
                const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
                saveAs(blob, `${baseName}.md`);
                console.log('Markdown download triggered');
            }

            // Save History
            if (token && file) {
                try {
                    await fetch(`${API_URL}/api/history/document`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                            originalFormat: file.name.split('.').pop() || 'unknown',
                            targetFormat: outputFormat,
                            fileName: file.name
                        })
                    });
                } catch (e) { console.error("History saving failed", e); }
            }

            setProgress(100);
            setTimeout(() => {
                setIsConverting(false);
                setProgress(0);
            }, 1500);
        } catch (err: any) {
            console.error('Conversion process failed:', err);
            setError('Failed to convert document: ' + (err.message || 'Unknown error'));
            setIsConverting(false);
            setProgress(0);
        }
    };

    const formatOptions = [
        { value: 'docx', label: 'Word Document (.docx)' },
        { value: 'pdf', label: 'PDF Document (.pdf)' },
        { value: 'txt', label: 'Plain Text (.txt)' },
        { value: 'md', label: 'Markdown (.md)' },
    ];

    return (
        <div className="pb-20 overflow-x-hidden">
            <Helmet>
                <title>Universal Document Converter – QuickTools</title>
                <meta name="description" content="Convert PDF to Word, Excel, PowerPoint, and more. Free online document converter — fast, secure, and no registration required." />
            </Helmet>
            <div className="container px-4 pt-8 sm:pt-12 text-center max-w-4xl mx-auto">
                <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                    Universal Document Converter
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground mb-8 sm:mb-12">
                    Convert your files to any format instantly. Secure, fast, and free.
                </p>

                {/* Ad Space */}
                <AdSpace className="mb-8 sm:mb-12 border-blue-500/20" />

                {/* Main Interface */}
                <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-8 mb-8 sm:mb-12">
                    <FileUpload 
                        onFileSelect={handleFileSelect} 
                        currentFile={file} 
                        onRemoveFile={handleRemoveFile}
                        accept="application/pdf"
                        supportedFormats="PDF Documents (*.pdf)"
                    />

                    {/* Extraction indicator */}
                    {isExtracting && (
                        <div className="mt-6 flex flex-col items-center justify-center gap-4 py-8">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <FileText className="absolute inset-0 m-auto text-primary" size={24} />
                            </div>
                            <div className="text-center">
                                <p className="text-base font-semibold text-foreground">Processing PDF Content</p>
                                <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">Analyzing layout & extracting text…</p>
                            </div>
                        </div>
                    )}

                    {/* Preview/Edit buttons - shown immediately after extraction */}
                    {extractedPages.length > 0 && !isExtracting && (
                        <div className="mt-6 sm:mt-8 flex flex-col items-center gap-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-sm font-medium border border-green-500/20">
                                <CheckCircle2 size={14} />
                                {extractedPages.reduce((acc, p) => acc + p.lines.length, 0)} lines extracted from {extractedPages.length} page{extractedPages.length > 1 ? 's' : ''}
                            </span>

                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                <button
                                    onClick={() => {
                                        setEditorMode('preview');
                                        setShowPreview(true);
                                    }}
                                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20 hover:bg-primary/20 transition-all shadow-sm"
                                >
                                    <Eye size={16} />
                                    Preview
                                </button>
                                <button
                                    onClick={() => {
                                        setEditorMode('edit');
                                        setShowPreview(true);
                                    }}
                                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                                >
                                    <Pencil size={16} />
                                    Edit Document
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10 text-left">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Convert to</label>
                            <select
                                value={outputFormat}
                                onChange={e => setOutputFormat(e.target.value as OutputFormat)}
                                className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                            >
                                {formatOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Options</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                                    <div className="w-5 h-5 rounded border border-border flex items-center justify-center bg-muted">
                                        <CheckCircle2 size={14} className="opacity-0" />
                                    </div>
                                    OCR (Text Recognition)
                                </label>
                                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                                    <div className="w-5 h-5 rounded border border-border flex items-center justify-center bg-muted">
                                        <CheckCircle2 size={14} className="opacity-0" />
                                    </div>
                                    Compress Output
                                </label>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-8 p-4 bg-destructive/10 border border-destructive/50 rounded-xl text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    {/* Action bar */}
                    <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-4">
                        {/* Progress */}
                        {isConverting && (
                            <div className="flex items-center justify-center gap-3 text-sm text-primary">
                                <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary rounded-full transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                {progress}%
                            </div>
                        )}

                        {/* Convert button — full width on mobile */}
                        <button
                            onClick={convertDocument}
                            disabled={!file || isConverting}
                            className={`w-full sm:w-auto px-8 py-3 rounded-full font-semibold flex items-center justify-center gap-2 transition-all ${!file || isConverting
                                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40'
                                }`}
                        >
                            {isConverting ? (
                                <Loader2 className="animate-spin" size={18} />
                            ) : (
                                <>
                                    <Download size={18} />
                                    Convert &amp; Download
                                </>
                            )}
                            {!isConverting && <ArrowRight size={18} />}
                        </button>
                    </div>
                </div>

                {/* Features List — 1-col mobile, 3-col md */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-left">
                    {[
                        { title: 'Smart Layout', desc: 'Preserves your original line positions, headings, and bullet points.' },
                        { title: 'Live Preview', desc: 'See exactly how your document will look before downloading.' },
                        { title: 'Multiple Formats', desc: 'Export to Word (.docx) or clean PDF with proper formatting.' },
                    ].map((item) => (
                        <div key={item.title} className="p-5 sm:p-6 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors">
                            <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                            <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Word Editor modal */}
            {showPreview && extractedPages.length > 0 && (
                <WordEditor
                    pages={extractedPages}
                    onClose={() => setShowPreview(false)}
                    onUpdateLine={handleUpdateLine}
                    onUpdateLineStyle={handleUpdateLineStyle}
                    initialMode={editorMode}
                    onDownload={convertDocument}
                />
            )}
        </div>
    );
};

export default Converter;
