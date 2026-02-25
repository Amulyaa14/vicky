import { Image, Layers } from 'lucide-react';
import FileUpload from '../components/ui/FileUpload';
import AdSpace from '../components/ui/AdSpace';

const BgRemover = () => {
    return (
        <div className="pb-20">
            <div className="container px-4 pt-12 text-center max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    Background Remover
                </h1>
                <p className="text-gray-400 mb-12">
                    Remove image backgrounds automatically in 5 seconds.
                </p>

                <AdSpace className="mb-12 border-green-500/20" />

                <div className="glass-card rounded-3xl p-8 mb-12">
                    <FileUpload />

                    <div className="mt-8 flex justify-center">
                        <button className="px-8 py-3 rounded-full bg-green-600 hover:bg-green-500 text-white font-semibold flex items-center gap-2 transition-all shadow-lg shadow-green-500/20">
                            <Layers size={18} /> Remove Background
                        </button>
                    </div>
                </div>

                {/* Example / Demo Area */}
                <div className="grid md:grid-cols-2 gap-8 text-left">
                    <div>
                        <h3 className="text-xl font-bold mb-4">How it works</h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold">1</div>
                                <p className="text-gray-400 text-sm pt-1">Upload your image (JPG, PNG).</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold">2</div>
                                <p className="text-gray-400 text-sm pt-1">AI automatically detects the subject and removes the background.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold">3</div>
                                <p className="text-gray-400 text-sm pt-1">Download your high-resolution PNG with transparent background.</p>
                            </div>
                        </div>
                    </div>
                    <div className="glass-card p-6 rounded-2xl flex items-center justify-center bg-checkered">
                        {/* Fallback for bg-checkered if not defined in CSS, simulated with css pattern later or assume user knows */}
                        <div className="text-center">
                            <Image size={48} className="mx-auto text-gray-600 mb-2 opacity-50" />
                            <p className="text-gray-500 text-sm">Preview Area</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BgRemover;
