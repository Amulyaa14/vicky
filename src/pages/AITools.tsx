import { Wand2, PenTool } from 'lucide-react';
import AdSpace from '../components/ui/AdSpace';

const AITools = () => {
    return (
        <div className="pb-20">
            <div className="container px-4 pt-12 text-center max-w-5xl mx-auto">
                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    AI Writing Assistant
                </h1>
                <p className="text-gray-400 mb-12">
                    Enhance your writing with next-gen AI. Rewrite, summarize, and correct instantly.
                </p>

                <AdSpace className="mb-12 border-purple-500/20" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Tool Cards */}
                    <div className="glass-card p-6 rounded-2xl md:col-span-2 row-span-2 text-left">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <PenTool className="text-purple-400" /> Editor
                            </h2>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 rounded-md bg-slate-700 text-xs font-medium hover:bg-slate-600">Summarize</button>
                                <button className="px-3 py-1 rounded-md bg-slate-700 text-xs font-medium hover:bg-slate-600">Fix Grammar</button>
                            </div>
                        </div>

                        <textarea
                            className="w-full h-[400px] bg-transparent resize-none focus:outline-none text-gray-300 placeholder-gray-600 leading-relaxed"
                            placeholder="Start writing or paste your text here..."
                        ></textarea>

                        <div className="flex justify-between items-center pt-4 border-t border-slate-700">
                            <span className="text-xs text-gray-500">0 words | 0 chars</span>
                            <button className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium flex items-center gap-2 transition-colors">
                                <Wand2 size={16} /> Improve with AI
                            </button>
                        </div>
                    </div>

                    {/* Sidebar / Tools List */}
                    <div className="space-y-6">
                        <div className="glass-card p-6 rounded-2xl text-left">
                            <h3 className="font-semibold mb-4 text-pink-400">Templates</h3>
                            <div className="space-y-3">
                                {['Resume Builder', 'Cover Letter', 'Blog Post', 'Email Drafter'].map(tool => (
                                    <button key={tool} className="w-full text-left px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-sm text-gray-300">
                                        {tool}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="glass-card p-6 rounded-2xl text-left">
                            <h3 className="font-semibold mb-4 text-blue-400">Checkers</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span className="text-sm text-gray-300">Grammar Check</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                    <span className="text-sm text-gray-300">Plagiarism Scan</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AITools;
