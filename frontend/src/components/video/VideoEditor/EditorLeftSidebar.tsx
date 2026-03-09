/**
 * Left sidebar - Media, templates, text, audio, transitions.
 * Each section opens inside the sidebar.
 */
import React from 'react';
import {
    Layout,
    Video,
    Image as ImageIcon,
    Sparkles,
    Type,
    Layers,
    Upload,
    Plus,
    Circle,
    Square
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useState, useRef } from 'react';

const SIDEBAR_SECTIONS = [
    { id: 'media', label: 'My Media', icon: Layout, desc: 'Upload videos and images' },
    { id: 'record', label: 'Record & Create', icon: Video, desc: 'Record screen or camera' },
    { id: 'library', label: 'Content Library', icon: ImageIcon, desc: 'Stock assets' },
    { id: 'templates', label: 'Templates', icon: Sparkles, desc: 'Pre-made templates' },
    { id: 'text', label: 'Text', icon: Type, desc: 'Add text overlays' },
    { id: 'transitions', label: 'Transitions', icon: Layers, desc: 'Scene transitions' },
];

interface EditorLeftSidebarProps {
    activeSection: string;
    onSectionChange: (id: string) => void;
    onImportMedia?: () => void;
    onReplaceMedia?: (file: File) => void;
    onEditChange?: (updates: any) => void;
}

const EditorLeftSidebar: React.FC<EditorLeftSidebarProps> = ({
    activeSection,
    onSectionChange,
    onImportMedia,
    onReplaceMedia,
    onEditChange,
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
            const chunks: BlobPart[] = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const recFile = new File([blob], 'recording.webm', { type: 'video/webm' });
                if (onReplaceMedia) onReplaceMedia(recFile);
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorderRef.current = recorder;
            recorder.start();
            setIsRecording(true);
        } catch (e) {
            console.error('Camera access denied', e);
            alert('Failed to access camera.');
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };

    const applyTemplate = (template: string) => {
        if (!onEditChange) return;
        switch (template) {
            case 'cinematic': onEditChange({ filter: 'none', contrast: 1.2, brightness: 0.9 }); break;
            case 'vintage': onEditChange({ filter: 'vintage', contrast: 1.1, brightness: 1 }); break;
            case 'vlog': onEditChange({ speed: 1.25, brightness: 1.1, filter: 'none' }); break;
        }
    };
    return (
        <div className="w-[72px] lg:w-72 bg-[#1a1a1a] border-r border-white/5 flex flex-col shrink-0">
            {/* Icon strip - visible on small screens */}
            <div className="flex lg:flex-col items-center lg:items-stretch justify-center lg:justify-start py-3 lg:py-4 gap-1">
                {SIDEBAR_SECTIONS.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => onSectionChange(s.id)}
                        className={cn(
                            'w-12 h-12 lg:w-full lg:h-auto lg:flex lg:items-center lg:gap-3 lg:px-4 lg:py-3 rounded-lg transition-colors',
                            activeSection === s.id
                                ? 'bg-purple-600/30 text-purple-400'
                                : 'text-white/60 hover:bg-white/5 hover:text-white'
                        )}
                        title={s.label}
                    >
                        <s.icon size={20} className="shrink-0 mx-auto lg:mx-0" />
                        <span className="hidden lg:inline text-sm font-medium">{s.label}</span>
                    </button>
                ))}
            </div>

            {/* Expanded panel - shown when section selected (desktop) */}
            <div className="hidden lg:flex flex-col flex-1 border-t border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5">
                    <h3 className="text-sm font-bold text-white">{SIDEBAR_SECTIONS.find((s) => s.id === activeSection)?.label}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {SIDEBAR_SECTIONS.find((s) => s.id === activeSection)?.desc}
                    </p>
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                    <button
                        onClick={onImportMedia}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-bold transition-colors"
                    >
                        <Upload size={18} />
                        Import Media
                    </button>
                    {activeSection === 'media' && (
                        <div className="mt-4 space-y-2">
                            <div className="text-xs text-gray-500">Drop & drop your files here</div>
                            <div className="aspect-video bg-white/5 rounded-lg border border-dashed border-white/10 flex items-center justify-center">
                                <Plus size={24} className="text-white/30" />
                            </div>
                        </div>
                    )}

                    {activeSection === 'record' && (
                        <div className="mt-4 space-y-4">
                            <p className="text-xs text-gray-500">Record your screen or camera directly into the editor.</p>
                            {!isRecording ? (
                                <button onClick={startRecording} className="w-full flex items-center justify-center gap-2 py-8 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg transition-colors">
                                    <Circle size={24} fill="currentColor" />
                                    <span>Start Recording</span>
                                </button>
                            ) : (
                                <button onClick={stopRecording} className="w-full flex items-center justify-center gap-2 py-8 bg-red-600 hover:bg-red-700 text-white rounded-lg animate-pulse transition-colors">
                                    <Square size={24} fill="currentColor" />
                                    <span>Stop Recording</span>
                                </button>
                            )}
                        </div>
                    )}

                    {activeSection === 'templates' && (
                        <div className="mt-4 space-y-2">
                            <p className="text-xs text-gray-500 mb-4">Apply instant styles to your video.</p>
                            <button onClick={() => applyTemplate('cinematic')} className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-left transition-colors">
                                <h4 className="font-bold text-sm text-white">Cinematic</h4>
                                <p className="text-xs text-gray-400">High contrast, moody tones.</p>
                            </button>
                            <button onClick={() => applyTemplate('vintage')} className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-left transition-colors">
                                <h4 className="font-bold text-sm text-white">Vintage Film</h4>
                                <p className="text-xs text-gray-400">Sepia filter with light fade.</p>
                            </button>
                            <button onClick={() => applyTemplate('vlog')} className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-left transition-colors">
                                <h4 className="font-bold text-sm text-white">Fast Vlog</h4>
                                <p className="text-xs text-gray-400">1.25x speed + brightened.</p>
                            </button>
                        </div>
                    )}

                    {activeSection === 'text' && (
                        <div className="mt-4 space-y-4">
                            <p className="text-xs text-gray-500">Quick text styles</p>
                            <button
                                onClick={() => onEditChange?.({ textOverlay: 'MY AWESOME VIDEO' })}
                                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-center font-black text-xl tracking-wider transition-colors"
                            >
                                TITLE
                            </button>
                            <button
                                onClick={() => onEditChange?.({ textOverlay: 'Subscribe & Like!' })}
                                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-center font-medium italic text-pink-400 transition-colors"
                            >
                                Call to Action
                            </button>
                        </div>
                    )}

                    {activeSection === 'transitions' && (
                        <div className="mt-4 space-y-2 text-center py-8">
                            <Layers size={32} className="mx-auto text-gray-600 mb-2" />
                            <p className="text-sm text-gray-400">Transitions</p>
                            <p className="text-xs text-gray-500">Only available when merging multiple clips.</p>
                        </div>
                    )}

                    {activeSection === 'library' && (
                        <div className="mt-4 space-y-2 text-center py-8">
                            <ImageIcon size={32} className="mx-auto text-gray-600 mb-2" />
                            <p className="text-sm text-gray-400">Content Library</p>
                            <p className="text-xs text-gray-500">Premium account required for stock assets.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EditorLeftSidebar;
