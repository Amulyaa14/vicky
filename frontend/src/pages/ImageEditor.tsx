import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, Minimize2, Repeat2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ImageEditorWorkspace from '@/components/image-editor/ImageEditorWorkspace';
import ImageCompressor from '@/components/image-editor/ImageCompressor';
import ImageConverter from '@/components/image-editor/ImageConverter';

type Tab = 'editor' | 'compressor' | 'converter';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'editor', label: 'Editor', icon: ImageIcon },
    { id: 'compressor', label: 'Compressor', icon: Minimize2 },
    { id: 'converter', label: 'Converter', icon: Repeat2 },
];

const ImageEditor = () => {
    const [activeTab, setActiveTab] = useState<Tab>('editor');

    return (
        <div className="min-h-screen pt-20 sm:pt-24 pb-12 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col">
            <Helmet>
                <title>Image Studio - QuickTools</title>
                <meta name="description" content="Edit, compress, and convert images directly in your browser." />
            </Helmet>

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 sm:mb-2 flex items-center gap-2">
                        <ImageIcon className="text-primary w-7 h-7 sm:w-8 sm:h-8" />
                        Image Studio
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        Edit, compress, and convert images entirely in your browser.
                    </p>
                </div>

                {/* Tab Switcher — scrollable on mobile */}
                <div className="flex p-1 bg-muted/50 rounded-lg border border-border/50 overflow-x-auto flex-shrink-0 w-full sm:w-auto">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={cn(
                                'px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap flex-1 sm:flex-none justify-center sm:justify-start',
                                activeTab === id
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                            )}
                        >
                            <Icon size={15} />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 w-full bg-background/50 border border-border/50 rounded-xl overflow-hidden shadow-sm relative backdrop-blur-sm flex flex-col min-h-[500px] sm:min-h-[600px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 w-full h-full flex flex-col"
                    >
                        {activeTab === 'editor' && <ImageEditorWorkspace />}
                        {activeTab === 'compressor' && <ImageCompressor />}
                        {activeTab === 'converter' && <ImageConverter />}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
};

export default ImageEditor;
