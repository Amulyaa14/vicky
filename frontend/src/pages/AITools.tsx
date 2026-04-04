import { useState, useCallback, useRef, useEffect } from 'react';
import {
    Wand2, PenTool, Copy, Trash2, Download, CheckCircle2,
    AlertCircle, Loader2, ChevronRight, Sparkles, RefreshCw,
    FileText, Mail, BookOpen, Briefcase,
    ShieldCheck, Search, ArrowDown, Zap, MessageSquare
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import AdSpace from '../components/ui/AdSpace';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'https://my-cloudflare-api.rpadmajaa-14.workers.dev';

/* ─── tiny helper: word / char count ─── */
const countStats = (txt: string) => {
    const words = txt.trim() === '' ? 0 : txt.trim().split(/\s+/).length;
    return { words, chars: txt.length };
};



/* ─── Templates ─── */
const TEMPLATES: { label: string; icon: React.ElementType; color: string; text: string }[] = [
    {
        label: 'Resume Builder', icon: Briefcase, color: 'from-blue-500 to-cyan-500',
        text: `[Your Name]\n[City, State | Phone | Email | LinkedIn]\n\nPROFESSIONAL SUMMARY\nResults-driven professional with X years of experience in [industry/field]. Proven track record of delivering [key achievement]. Seeking to leverage expertise in [skill] at [Target Company].\n\nEXPERIENCE\n[Job Title] | [Company Name] | [Start Date] – [End Date]\n• Led [project/initiative], resulting in [measurable impact]\n• Collaborated with cross-functional teams to [achievement]\n• Developed [product/process] that improved [metric] by X%\n\nEDUCATION\n[Degree] | [Major] | [University] | [Year]\n\nSKILLS\n• Technical: [List relevant software/tools/languages]\n• Soft Skills: Leadership, Communication, Problem-Solving`,
    },
    {
        label: 'Cover Letter', icon: FileText, color: 'from-purple-500 to-pink-500',
        text: `[Your Name]\n[Date]\n\nHiring Manager\n[Company Name]\n\nDear Hiring Manager,\n\nI am excited to apply for the [Position] role at [Company]. With [X years] of experience in [field] and a passion for [relevant area], I am confident I can make a meaningful contribution to your team.\n\nIn my previous role at [Previous Company], I [key achievement]. This experience has equipped me with [relevant skills and strengths].\n\nWhat draws me to [Company] is your commitment to [specific aspect — mission/product/culture]. I am eager to bring my skills in [key skill] to help [Company] achieve [goal].\n\nThank you for considering my application.\n\nSincerely,\n[Your Name]`,
    },
    {
        label: 'Blog Post', icon: BookOpen, color: 'from-amber-500 to-orange-500',
        text: `# [Compelling Blog Post Title]\n\n## Introduction\n[Hook sentence that grabs attention]. In this post, we'll explore [topic] and why it matters to [target audience].\n\n## Why [Topic] Matters\n[Explain the problem or opportunity]. According to [source/stat], [supporting evidence].\n\n## Key Takeaways\n\n### 1. [First Point]\n[Elaborate on the first point with examples or data].\n\n### 2. [Second Point]\n[Second point with real-world context].\n\n### 3. [Third Point]\n[Third point with actionable insight].\n\n## Conclusion\n[Summarise the key points and end with a call to action].`,
    },
    {
        label: 'Email Drafter', icon: Mail, color: 'from-green-500 to-emerald-500',
        text: `Subject: [Clear, Specific Email Subject Line]\n\nHi [Recipient's Name],\n\nI hope this message finds you well. I'm reaching out regarding [brief context].\n\n[Core message — be specific and concise]:\n• [Key point 1]\n• [Key point 2]\n• [Key point 3]\n\n[Call-to-action sentence — what do you need them to do?]\n\nBest regards,\n[Your Name]\n[Title | Company]`,
    },
];

type CheckerStatus = 'idle' | 'running' | 'done';
const LS_KEY = 'quicktools-ai-text';

const AITools = () => {
    const { token } = useAuth();
    const [text, setText] = useState(() => localStorage.getItem(LS_KEY) || '');
    const [output, setOutput] = useState('');
    const [action, setAction] = useState<string | null>(null);
    const [isBusy, setIsBusy] = useState(false);
    const [copied, setCopied] = useState(false);
    const [grammarIssues, setGrammarIssues] = useState<string[]>([]);
    const [grammarStatus, setGrammarStatus] = useState<CheckerStatus>('idle');
    const [plagiarismStatus, setPlagiarismStatus] = useState<CheckerStatus>('idle');
    const [plagiarismResult, setPlagiarismResult] = useState('');
    const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => { localStorage.setItem(LS_KEY, text); }, [text]);

    const stats = countStats(text);

    const runAction = useCallback(async (actionId: string, label: string) => {
        if (!text.trim()) { toast.error('Please enter some text first.'); return; }
        setIsBusy(true);
        setAction(label);
        setOutput('');
        try {
            const response = await fetch(`${API_URL}/api/ai/writing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: actionId, text })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            const result = data.result;
            setOutput(result);
            if (token) {
                try {
                    await fetch(`${API_URL}/api/history/ai`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ toolName: label, inputText: text, outputText: result })
                    });
                } catch (e) {
                    console.error("Failed to save history:", e);
                }
            }
            toast.success(`${label} complete!`);
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || 'AI processing failed. Check your connection.');
        } finally {
            setIsBusy(false);
        }
    }, [text, token]);

    const handleSummarise = () => runAction('summarize', 'Summarize');
    const handleFixGrammar = () => runAction('grammar', 'Fix Grammar');
    const handleImprove = () => runAction('improve', 'Improve Writing');

    const handleTemplate = (t: typeof TEMPLATES[0]) => {
        setText(t.text);
        setOutput('');
        setGrammarIssues([]);
        setGrammarStatus('idle');
        setPlagiarismStatus('idle');
        setPlagiarismResult('');
        toast.success(`${t.label} template loaded!`);
        textareaRef.current?.focus();
    };

    const handleCopy = async () => {
        const src = output || text;
        if (!src.trim()) { toast.error('Nothing to copy.'); return; }
        await navigator.clipboard.writeText(src);
        setCopied(true);
        toast.success('Copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClear = () => {
        setText(''); setOutput(''); setGrammarIssues([]);
        setGrammarStatus('idle'); setPlagiarismStatus('idle'); setPlagiarismResult('');
        setActiveQuickAction(null);
        toast('Editor cleared', { icon: '🗑️' });
    };

    const handleDownload = () => {
        const content = output || text;
        if (!content.trim()) { toast.error('Nothing to download.'); return; }
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'ai-tools-output.txt'; a.click();
        URL.revokeObjectURL(url);
        toast.success('File downloaded!');
    };

    const handleApplyOutput = () => {
        if (output) { setText(output); setOutput(''); toast.success('Applied to editor!'); }
    };

    const handleGrammarCheck = async () => {
        if (!text.trim()) { toast.error('Enter text first.'); return; }
        setGrammarStatus('running');
        setGrammarIssues([]);
        try {
            const response = await fetch(`${API_URL}/api/ai/writing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'grammar-check', text })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            const issues = data.result.split('\n').map((s: string) => s.trim().replace(/^[-*]\s*/, '')).filter(Boolean);
            setGrammarIssues(issues.length > 0 ? issues : ['No obvious grammar issues found. Text looks good!']);
        } catch (e: any) {
            toast.error(e.message || 'Grammar check failed.');
        } finally {
            setGrammarStatus('done');
        }
    };

    const handlePlagiarismScan = async () => {
        if (!text.trim()) { toast.error('Enter text first.'); return; }
        setPlagiarismStatus('running');
        setPlagiarismResult('');
        try {
            const response = await fetch(`${API_URL}/api/ai/plagiarism`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            setPlagiarismResult(data.result);
        } catch (e: any) {
            toast.error(e.message || 'Scan failed.');
            setPlagiarismResult('Error scanning text. Try again later.');
        } finally {
            setPlagiarismStatus('done');
        }
    };

    const quickActions = [
        { label: 'Make Formal', icon: Briefcase, desc: 'Convert to professional tone', actionId: 'formal' },
        { label: 'Make Casual', icon: MessageSquare, desc: 'Make it friendly & approachable', actionId: 'casual' },
        { label: 'Expand Text', icon: ArrowDown, desc: 'Add elaboration & detail', actionId: 'expand' },
    ];

    return (
        <div className="pb-20 overflow-x-hidden">
            <Helmet>
                <title>AI Writing Assistant – QuickTools</title>
                <meta name="description" content="Free AI writing assistant. Summarize, fix grammar, rewrite text, and use professional templates for resumes, cover letters, and more." />
            </Helmet>
            <div className="container px-4 pt-8 sm:pt-12 max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8 sm:mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-medium mb-4">
                        <Sparkles size={12} /> AI-Powered Writing Tools
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-800 dark:from-purple-400 dark:via-pink-400 dark:to-purple-600 bg-clip-text text-transparent">
                        AI Writing Assistant
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
                        Enhance your writing instantly — summarize, fix grammar, rewrite, and more. All processing happens locally in your browser.
                    </p>
                </div>

                <AdSpace className="mb-8 sm:mb-10 border-purple-500/20" />

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* ═══════ LEFT: Editor ═══════ */}
                    <div className="lg:col-span-2 flex flex-col gap-5">
                        {/* Editor Card */}
                        <div className="bg-card backdrop-blur border border-border shadow-sm rounded-2xl overflow-hidden">
                            {/* Toolbar */}
                            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-muted/30">
                                <div className="flex items-center gap-2">
                                    <PenTool size={16} className="text-purple-500 dark:text-purple-400" />
                                    <span className="text-sm font-semibold text-foreground">Editor</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {/* Primary Actions */}
                                    <button onClick={handleSummarise} disabled={isBusy || !text.trim()}
                                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold text-white transition-all flex items-center gap-1.5 shadow-sm shadow-purple-500/20">
                                        {isBusy && action === 'Summarize' ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                                        Summarize
                                    </button>
                                    <button onClick={handleFixGrammar} disabled={isBusy || !text.trim()}
                                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold text-white transition-all flex items-center gap-1.5 shadow-sm shadow-blue-500/20">
                                        {isBusy && action === 'Fix Grammar' ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                                        Fix Grammar
                                    </button>
                                    <div className="w-px h-5 bg-border mx-1" />
                                    {/* Utility Actions */}
                                    <button onClick={handleCopy} title="Copy text"
                                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                        {copied ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                                    </button>
                                    <button onClick={handleDownload} title="Download" disabled={!text.trim() && !output.trim()}
                                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30">
                                        <Download size={14} />
                                    </button>
                                    <button onClick={handleClear} title="Clear all"
                                        className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Textarea */}
                            <textarea
                                ref={textareaRef}
                                value={text}
                                onChange={e => { setText(e.target.value); setOutput(''); }}
                                className="w-full h-56 sm:h-72 bg-transparent resize-none focus:outline-none text-foreground placeholder:text-muted-foreground/50 leading-relaxed text-sm p-5"
                                placeholder="Start writing or paste your text here..."
                            />

                            {/* Output Area */}
                            {(isBusy || output) && (
                                <div className="border-t border-border bg-muted/20">
                                    <div className="flex items-center justify-between px-5 py-2.5">
                                        <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                                            {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                            {isBusy ? `${action}…` : `${action} Result`}
                                        </span>
                                        {output && (
                                            <button onClick={handleApplyOutput}
                                                className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-purple-500/10 transition-colors font-medium">
                                                <RefreshCw size={11} /> Apply to editor
                                            </button>
                                        )}
                                    </div>
                                    {isBusy ? (
                                        <div className="h-20 flex items-center justify-center">
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Loader2 size={14} className="animate-spin text-purple-500" /> Processing your text…
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="px-5 pb-4 max-h-52 overflow-y-auto">
                                            <pre className="text-sm text-foreground/90 whitespace-pre-wrap font-sans leading-relaxed">{output}</pre>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Bottom Bar */}
                            <div className="flex flex-wrap justify-between items-center px-5 py-3 border-t border-border bg-muted/20 gap-3">
                                <span className="text-xs text-muted-foreground font-medium">
                                    {stats.words} word{stats.words !== 1 ? 's' : ''} · {stats.chars} character{stats.chars !== 1 ? 's' : ''}
                                </span>
                                <button onClick={handleImprove} disabled={isBusy || !text.trim()}
                                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:via-pink-500 hover:to-purple-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40">
                                    {isBusy && action === 'Improve Writing' ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                                    Improve Writing
                                </button>
                            </div>
                        </div>

                        {/* Quick Actions Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {quickActions.map(qa => (
                                <button key={qa.label}
                                    disabled={isBusy || !text.trim()}
                                    onClick={() => { setActiveQuickAction(qa.label); runAction(qa.actionId, qa.label).finally(() => setActiveQuickAction(null)); }}
                                    className="bg-card backdrop-blur border border-border hover:border-purple-500/30 rounded-xl px-4 py-3.5 text-left transition-all disabled:opacity-30 disabled:cursor-not-allowed group hover:bg-muted/50">
                                    <div className="flex items-center gap-2.5 mb-1">
                                        <div className="p-1.5 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                                            {isBusy && activeQuickAction === qa.label
                                                ? <Loader2 size={14} className="animate-spin text-purple-500" />
                                                : <qa.icon size={14} className="text-purple-500" />}
                                        </div>
                                        <span className="text-sm font-semibold text-foreground tracking-tight">{qa.label}</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground pl-9">{qa.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ═══════ RIGHT: Sidebar ═══════ */}
                    <div className="flex flex-col gap-5">
                        {/* Templates */}
                        <div className="bg-card backdrop-blur border border-border rounded-2xl p-5 shadow-sm">
                            <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-foreground">
                                <Zap size={14} className="text-amber-500 dark:text-amber-400" /> Templates
                            </h3>
                            <div className="space-y-2">
                                {TEMPLATES.map(t => (
                                    <button key={t.label} onClick={() => handleTemplate(t)}
                                        className="w-full text-left px-3.5 py-3 rounded-xl bg-muted/40 hover:bg-muted border border-border/40 hover:border-purple-500/30 transition-all group flex items-center gap-3">
                                        <div className={`p-2 rounded-lg bg-gradient-to-br ${t.color} shadow-sm`}>
                                            <t.icon size={14} className="text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm font-medium text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors block leading-tight">{t.label}</span>
                                            <span className="text-[10px] text-muted-foreground mt-0.5 block italic">Click to load</span>
                                        </div>
                                        <ChevronRight size={14} className="text-muted-foreground opacity-30 group-hover:text-purple-500 transition-colors shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Checkers */}
                        <div className="bg-card backdrop-blur border border-border rounded-2xl p-5 shadow-sm">
                            <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-foreground">
                                <ShieldCheck size={14} className="text-green-500 dark:text-green-400" /> Checkers
                            </h3>
                            <div className="space-y-3">
                                {/* Grammar Check */}
                                <div>
                                    <button onClick={handleGrammarCheck} disabled={grammarStatus === 'running' || !text.trim()}
                                        className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-muted/40 hover:bg-muted border border-border/40 hover:border-green-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                                                {grammarStatus === 'running'
                                                    ? <Loader2 size={14} className="animate-spin text-green-600 dark:text-green-400" />
                                                    : <CheckCircle2 size={14} className="text-green-600 dark:text-green-400" />}
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium text-foreground block">Grammar Check</span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {grammarStatus === 'running' ? 'Analyzing...' : grammarStatus === 'done' ? 'Complete' : 'Click to check'}
                                                </span>
                                            </div>
                                        </div>
                                        {grammarStatus === 'done'
                                            ? <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                                            : <ChevronRight size={14} className="text-muted-foreground opacity-30 group-hover:text-green-500 transition-colors shrink-0" />}
                                    </button>
                                    {grammarStatus === 'done' && grammarIssues.length > 0 && (
                                        <div className="mt-2 p-3 bg-muted/30 rounded-xl border border-border/50 space-y-2">
                                            {grammarIssues.map((issue, i) => (
                                                <div key={i} className="flex items-start gap-2 text-xs">
                                                    {issue.startsWith('No obvious')
                                                        ? <CheckCircle2 size={12} className="text-green-500 mt-0.5 shrink-0" />
                                                        : <AlertCircle size={12} className="text-amber-500 mt-0.5 shrink-0" />}
                                                    <span className="text-muted-foreground">{issue}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Plagiarism Scan */}
                                <div>
                                    <button onClick={handlePlagiarismScan} disabled={plagiarismStatus === 'running' || !text.trim()}
                                        className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-muted/40 hover:bg-muted border border-border/40 hover:border-amber-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                                                {plagiarismStatus === 'running'
                                                    ? <Loader2 size={14} className="animate-spin text-amber-600 dark:text-amber-400" />
                                                    : <Search size={14} className="text-amber-600 dark:text-amber-400" />}
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium text-foreground block">Plagiarism Scan</span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {plagiarismStatus === 'running' ? 'Scanning...' : plagiarismStatus === 'done' ? 'Complete' : 'Click to scan'}
                                                </span>
                                            </div>
                                        </div>
                                        {plagiarismStatus === 'done'
                                            ? <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                                            : <Search size={14} className="text-muted-foreground opacity-30 group-hover:text-amber-500 transition-colors shrink-0" />}
                                    </button>
                                    {plagiarismStatus === 'done' && plagiarismResult && (
                                        <div className="mt-2 p-3 bg-green-500/5 rounded-xl border border-green-500/20">
                                            <p className="text-xs text-green-600 dark:text-green-400 font-medium">{plagiarismResult}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tip Card */}
                        <div className="bg-secondary/30 border border-border rounded-2xl p-5">
                            <h4 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">💡 Pro Tip</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Type or paste your text in the editor, then use <b className="text-purple-500">Summarize</b>, <b className="text-purple-500">Fix Grammar</b>, or <b className="text-purple-500">Improve Writing</b> to enhance it. Use templates for quick starts!
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AITools;
