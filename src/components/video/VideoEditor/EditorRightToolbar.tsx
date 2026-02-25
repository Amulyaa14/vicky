/**
 * Right sidebar - Editing tools: Captions, Audio, Fade, Filters, Effects, Adjust colors, Speed.
 */
import React from 'react';
import { Type, Music, Sliders, Filter, Sparkles, Palette, Timer } from 'lucide-react';
import { cn } from '../../../lib/utils';

const TOOLS = [
    { id: 'captions', icon: Type, label: 'Captions' },
    { id: 'audio', icon: Music, label: 'Audio' },
    { id: 'fade', icon: Sliders, label: 'Fade' },
    { id: 'filters', icon: Filter, label: 'Filters' },
    { id: 'effects', icon: Sparkles, label: 'Effects' },
    { id: 'adjust', icon: Palette, label: 'Adjust colors' },
    { id: 'speed', icon: Timer, label: 'Speed' },
];

interface EditorRightToolbarProps {
    activeTool: string;
    onToolChange: (id: string) => void;
}

const EditorRightToolbar: React.FC<EditorRightToolbarProps> = ({ activeTool, onToolChange }) => {
    return (
        <div className="w-14 lg:w-16 bg-[#1a1a1a] border-l border-white/5 flex flex-col items-center py-4 gap-2 shrink-0">
            {TOOLS.map((t) => (
                <button
                    key={t.id}
                    onClick={() => onToolChange(t.id)}
                    className={cn(
                        'w-10 h-10 flex flex-col items-center justify-center rounded-lg transition-colors group relative',
                        activeTool === t.id ? 'bg-purple-600/30 text-purple-400' : 'text-white/60 hover:bg-white/5 hover:text-purple-400'
                    )}
                    title={t.label}
                >
                    <t.icon size={18} />
                    <span className="absolute right-full mr-2 px-2 py-1 bg-[#2a2a2a] text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
                        {t.label}
                    </span>
                </button>
            ))}
        </div>
    );
};

export default EditorRightToolbar;
