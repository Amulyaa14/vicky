import { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
    ShieldCheck, 
    FileText, 
    CheckCircle2, 
    Loader2, 
    Sparkles, 
    ScanSearch, 
    RefreshCw, 
    ArrowRight,
    Trophy,
    Search,
    ListChecks,
    Target
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import AdSpace from '../components/ui/AdSpace';
import FileUpload from '../components/ui/FileUpload';
import { analyzeResume } from '../lib/atsScorer';
import type { ATSResults } from '../lib/atsScorer';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - Vite special import
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set worker source - match Converter.tsx logic
try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
} catch (e) {
    const version = '5.4.530';
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
}

const ATSChecker = () => {
    const { token } = useAuth();
    const [jobDescription, setJobDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [results, setResults] = useState<ATSResults | null>(null);
    const [resumeText, setResumeText] = useState('');

    const API_URL = import.meta.env.VITE_API_URL || 'https://my-cloudflare-api.rpadmajaa-14.workers.dev';

    const extractTextFromPDF = async (pdfFile: File) => {
        setIsExtracting(true);
        try {
            const arrayBuffer = await pdfFile.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            let fullText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map((item: any) => item.str)
                    .join(' ');
                fullText += pageText + '\n';
            }
            setResumeText(fullText);
            return fullText;
        } catch (error) {
            console.error('PDF extraction failed:', error);
            toast.error('Failed to extract text from PDF. Please try a different file.');
            return '';
        } finally {
            setIsExtracting(false);
        }
    };

    const handleFileSelect = useCallback(async (selectedFile: File) => {
        setFile(selectedFile);
        if (selectedFile.type === 'application/pdf') {
            await extractTextFromPDF(selectedFile);
        } else if (selectedFile.type === 'text/plain') {
            const text = await selectedFile.text();
            setResumeText(text);
        } else {
            // For other formats like docx, simple text read might fail or give junk
            // In a more advanced version, we'd use a docx parser.
            // For now, let's just alert the user.
            toast.error('Only PDF and Plain Text are supported for direct extraction currently.');
        }
    }, []);

    const handleRemoveFile = useCallback(() => {
        setFile(null);
        setResumeText('');
    }, []);

    const handleAnalyze = async () => {
        if (!jobDescription.trim()) {
            toast.error('Please provide a Job Description.');
            return;
        }
        if (!resumeText.trim()) {
            toast.error('Please provide your Resume content (paste or upload).');
            return;
        }

        setIsAnalyzing(true);
        // Simulate analysis delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        const analysis = analyzeResume(resumeText, jobDescription);
        setResults(analysis);
        setIsAnalyzing(false);

        // Save to History if token exists
        if (token) {
            try {
                await fetch(`${API_URL}/api/history/ai`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        toolName: 'ATS Checker',
                        inputText: `JD: ${jobDescription.substring(0, 500)}... | Resume: ${resumeText.substring(0, 500)}...`,
                        outputText: `Score: ${analysis.overallScore}% | Match: ${analysis.keywordMatchRate}%`
                    })
                });
            } catch (e) {
                console.error("Failed to save history:", e);
            }
        }

        toast.success('Analysis complete!');
    };

    const handleReset = () => {
        setResults(null);
        setJobDescription('');
        setFile(null);
        setResumeText('');
    };

    return (
        <div className="pb-20 overflow-x-hidden">
            <Helmet>
                <title>ATS Score Checker – QuickTools</title>
                <meta name="description" content="Check your resume against Applicant Tracking Systems (ATS). Upload your resume and job description to get a free ATS match score and instant feedback." />
            </Helmet>
            <div className="container px-4 pt-8 sm:pt-12 max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8 sm:mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium mb-4">
                        <ScanSearch size={12} /> ATS Resume Scanner
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 dark:from-blue-400 dark:via-indigo-400 dark:to-blue-600 bg-clip-text text-transparent">
                        ATS Score Checker
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
                        Optimize your resume for Applicant Tracking Systems. Paste a job description, upload your resume, and get instant feedback.
                    </p>
                </div>

                <AdSpace className="mb-10 border-blue-500/20" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Inputs Panel */}
                    <div className={`${results ? 'lg:col-span-12' : 'lg:col-span-12'} transition-all duration-500`}>
                        {!results ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Job Description Input */}
                                <div className="bg-card backdrop-blur border border-border shadow-sm rounded-2xl overflow-hidden p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                            <ShieldCheck size={18} />
                                        </div>
                                        <h3 className="font-semibold text-foreground">Job Description</h3>
                                    </div>
                                    <textarea
                                        value={jobDescription}
                                        onChange={(e) => setJobDescription(e.target.value)}
                                        placeholder="Paste the target job description here..."
                                        className="w-full h-80 bg-muted/30 border border-border rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-foreground"
                                    />
                                </div>

                                {/* Resume Upload */}
                                <div className="bg-card backdrop-blur border border-border shadow-sm rounded-2xl overflow-hidden p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                                            <FileText size={18} />
                                        </div>
                                        <h3 className="font-semibold text-foreground">Resume / CV</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <FileUpload 
                                            onFileSelect={handleFileSelect} 
                                            currentFile={file} 
                                            onRemoveFile={handleRemoveFile} 
                                            accept=".pdf,.txt"
                                            supportedFormats="PDF, TXT"
                                        />
                                        
                                        <div className="relative">
                                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center px-4">
                                                <div className="w-full h-px bg-border" />
                                            </div>
                                            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                                                <span className="bg-card px-2">Or Paste Text</span>
                                            </div>
                                        </div>

                                        <textarea
                                            value={resumeText}
                                            onChange={(e) => setResumeText(e.target.value)}
                                            placeholder="Paste your resume text here if not uploading a file..."
                                            className="w-full h-40 bg-muted/30 border border-border rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-foreground"
                                            disabled={!!file && isExtracting}
                                        />
                                        
                                        {isExtracting && (
                                            <div className="flex items-center gap-2 text-xs text-blue-500 font-medium">
                                                <Loader2 size={12} className="animate-spin" />
                                                Extracting text from PDF...
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="md:col-span-2 flex justify-center pt-4">
                                    <button
                                        onClick={handleAnalyze}
                                        disabled={isAnalyzing || isExtracting || !jobDescription.trim() || !resumeText.trim()}
                                        className="inline-flex items-center gap-2 px-10 py-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-all shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 transform hover:-translate-y-0.5 active:translate-y-0"
                                    >
                                        {isAnalyzing ? (
                                            <>
                                                <Loader2 size={20} className="animate-spin" />
                                                Analyzing Compatibility...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={20} />
                                                Check Compatibility score
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Results View */
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                                        <CheckCircle2 className="text-green-500" />
                                        Analysis Dashboard
                                    </h2>
                                    <button 
                                        onClick={handleReset}
                                        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
                                    >
                                        <RefreshCw size={14} /> Start New Check
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Main Score Card */}
                                    <div className="bg-card border border-border rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        
                                        <div className="relative w-40 h-40 mb-4 flex items-center justify-center">
                                            <svg className="w-full h-full transform -rotate-90">
                                                <circle
                                                    cx="80"
                                                    cy="80"
                                                    r="70"
                                                    stroke="currentColor"
                                                    strokeWidth="8"
                                                    fill="transparent"
                                                    className="text-muted/10"
                                                />
                                                <circle
                                                    cx="80"
                                                    cy="80"
                                                    r="70"
                                                    stroke="currentColor"
                                                    strokeWidth="8"
                                                    fill="transparent"
                                                    strokeDasharray={440}
                                                    strokeDashoffset={440 - (440 * results.overallScore) / 100}
                                                    strokeLinecap="round"
                                                    className="text-blue-500 transition-all duration-1000 ease-out"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-4xl font-bold text-foreground">{results.overallScore}%</span>
                                                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Match Score</span>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-foreground">
                                                {results.overallScore >= 80 ? 'Exceptional Match' : results.overallScore >= 60 ? 'Strong Match' : 'Potential Match'}
                                            </h4>
                                            <p className="text-xs text-muted-foreground">Based on local heuristic analysis</p>
                                        </div>
                                    </div>

                                    {/* Detailed Stats */}
                                    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                                            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
                                                <Target size={16} className="text-red-500" /> Keyword Alignment
                                            </h4>
                                            <div className="flex items-end justify-between mb-2">
                                                <span className="text-2xl font-bold text-foreground">{results.keywordMatchRate}%</span>
                                                <span className="text-xs text-muted-foreground">{results.foundKeywords.length} / {(results.foundKeywords.length + results.missingKeywords.length)} found</span>
                                            </div>
                                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                                <div className="h-full bg-red-500 rounded-full" style={{ width: `${results.keywordMatchRate}%` }} />
                                            </div>
                                        </div>

                                        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                                            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
                                                <Trophy size={16} className="text-yellow-500" /> Impact Score
                                            </h4>
                                            <div className="flex flex-col gap-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-muted-foreground">Action Verbs</span>
                                                    <span className="text-xs font-bold text-foreground">{results.actionVerbsFound.length} found</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-muted-foreground">Measurable Metrics</span>
                                                    <span className={`text-xs font-bold ${results.hasMetrics ? 'text-green-500' : 'text-amber-500'}`}>
                                                        {results.hasMetrics ? 'Present' : 'Missing'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-muted-foreground">Word Count</span>
                                                    <span className="text-xs font-bold text-foreground">{results.wordCount} words</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Suggestions */}
                                        <div className="sm:col-span-2 bg-blue-500/5 border border-blue-500/10 rounded-2xl p-5">
                                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                                <ListChecks size={16} /> Key Suggestions
                                            </h4>
                                            <ul className="space-y-2">
                                                {results.suggestions.map((s, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                                        <ArrowRight size={12} className="mt-0.5 text-blue-500" />
                                                        {s}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Keyword Lists */}
                                    <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                                        <div className="px-5 py-3 border-b border-border bg-muted/30">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Keyword Analysis</h4>
                                        </div>
                                        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div>
                                                <span className="text-xs font-bold text-green-500 mb-3 block">Found in Resume</span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {results.foundKeywords.length > 0 ? (
                                                        results.foundKeywords.map(kw => (
                                                            <span key={kw} className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-medium border border-green-500/20 capitalize">
                                                                {kw}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground italic">No keywords matched</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-red-500 mb-3 block">Missing Keywords</span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {results.missingKeywords.length > 0 ? (
                                                        results.missingKeywords.map(kw => (
                                                            <span key={kw} className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-medium border border-red-500/20 capitalize">
                                                                {kw}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground italic">No missing keywords! Excellent.</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info Panel */}
                                    <div className="bg-gradient-to-br from-indigo-900/30 to-blue-900/20 border border-indigo-500/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                                        <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center mb-3">
                                            <Search size={24} className="text-indigo-400" />
                                        </div>
                                        <h4 className="font-bold text-white mb-2">Want to score higher?</h4>
                                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                            ATS systems look for specific roles, skills, and metrics. Use the missing keywords list to naturally integrate those terms into your experience.
                                        </p>
                                        <button 
                                            onClick={handleReset}
                                            className="px-6 py-2 rounded-full bg-white text-indigo-900 text-xs font-bold hover:bg-slate-100 transition-colors shadow-lg"
                                        >
                                            Re-analyze Resume
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ATSChecker;
