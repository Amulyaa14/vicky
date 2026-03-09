/**
 * Editing controls - brightness, contrast, speed, volume, text overlay, filters.
 * Shown when user selects a tool from the right toolbar.
 */
import React from 'react';
import { cn } from '../../../lib/utils';
import { RotateCcw } from 'lucide-react';

import type { VideoEditState as EditState } from '../../../types/videoEditor';

interface EditingControlsProps {
    activeTool: string;
    editState: EditState;
    onEditChange: (updates: Partial<EditState>) => void;
}

const EditingControls: React.FC<EditingControlsProps> = ({ activeTool, editState, onEditChange }) => {
    const renderControls = () => {
        switch (activeTool) {
            case 'adjust':
                return (
                    <div className="space-y-4 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-bold text-white">Adjust Colors</h4>
                            <button
                                onClick={() => onEditChange({
                                    brightness: 1, contrast: 1, saturation: 1,
                                    temperature: 0, tint: 0, highlights: 0, shadows: 0, sharpness: 0
                                })}
                                className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1 bg-white/5 px-2 py-1 rounded transition-colors"
                            >
                                <RotateCcw size={10} /> Reset
                            </button>
                        </div>
                        <div className="space-y-4 pb-8">
                            {[
                                { label: 'Brightness', key: 'brightness', value: editState.brightness, min: 0, max: 2, step: 0.1, display: (v: number) => `${Math.round(v * 100)}%` },
                                { label: 'Contrast', key: 'contrast', value: editState.contrast, min: 0, max: 2, step: 0.1, display: (v: number) => `${Math.round(v * 100)}%` },
                                { label: 'Saturation', key: 'saturation', value: editState.saturation ?? 1, min: 0, max: 2, step: 0.1, display: (v: number) => `${Math.round(v * 100)}%` },
                                { label: 'Temperature', key: 'temperature', value: editState.temperature ?? 0, min: -100, max: 100, step: 1, display: (v: number) => `${v > 0 ? '+' : ''}${v}` },
                                { label: 'Tint', key: 'tint', value: editState.tint ?? 0, min: -100, max: 100, step: 1, display: (v: number) => `${v > 0 ? '+' : ''}${v}` },
                                { label: 'Highlights', key: 'highlights', value: editState.highlights ?? 0, min: -100, max: 100, step: 1, display: (v: number) => `${v > 0 ? '+' : ''}${v}` },
                                { label: 'Shadows', key: 'shadows', value: editState.shadows ?? 0, min: -100, max: 100, step: 1, display: (v: number) => `${v > 0 ? '+' : ''}${v}` },
                                { label: 'Sharpness', key: 'sharpness', value: editState.sharpness ?? 0, min: 0, max: 100, step: 1, display: (v: number) => `${v}` },
                            ].map(adj => (
                                <div key={adj.key}>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs text-gray-400">{adj.label}</label>
                                        <span className="text-xs font-mono text-purple-400">{adj.display(adj.value)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={adj.min} max={adj.max} step={adj.step}
                                        value={adj.value}
                                        onChange={(e) => onEditChange({ [adj.key]: parseFloat(e.target.value) })}
                                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'speed':
                return (
                    <div className="space-y-4 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-bold text-white">Playback Speed</h4>
                            {editState.speed !== 1 && (
                                <button onClick={() => onEditChange({ speed: 1 })} className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1 bg-white/5 px-2 py-1 rounded transition-colors">
                                    <RotateCcw size={10} /> Reset
                                </button>
                            )}
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs text-gray-400">Speed Multiplier</label>
                                <span className="text-xs font-mono text-purple-400">{editState.speed}x</span>
                            </div>
                            <input
                                type="range"
                                min="0.25"
                                max="4"
                                step="0.25"
                                value={editState.speed}
                                onChange={(e) => onEditChange({ speed: parseFloat(e.target.value) })}
                                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                        </div>
                    </div>
                );
            case 'audio':
                return (
                    <div className="space-y-4 p-4">
                        <h4 className="text-sm font-bold text-white">Audio</h4>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={editState.muted}
                                onChange={(e) => onEditChange({ muted: e.target.checked })}
                                className="rounded accent-purple-500"
                            />
                            <span className="text-sm">Mute</span>
                        </label>
                        {!editState.muted && (
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Volume: {Math.round(editState.volume * 100)}%</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={editState.volume}
                                    onChange={(e) => onEditChange({ volume: parseFloat(e.target.value) })}
                                    className="w-full accent-purple-500"
                                />
                            </div>
                        )}
                    </div>
                );
            case 'filters':
                return (
                    <div className="space-y-4 p-4">
                        <h4 className="text-sm font-bold text-white">Filters</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {['none', 'grayscale', 'sepia', 'vintage'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => onEditChange({ filter: f as 'none' | 'grayscale' | 'sepia' | 'vintage' })}
                                    className={cn(
                                        'px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors',
                                        editState.filter === f ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20'
                                    )}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            case 'captions':
                return (
                    <div className="space-y-4 p-4">
                        <h4 className="text-sm font-bold text-white">Text Overlay</h4>
                        <input
                            type="text"
                            placeholder="Add text..."
                            value={editState.textOverlay || ''}
                            onChange={(e) => onEditChange({ textOverlay: e.target.value })}
                            className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
                        />
                    </div>
                );
            case 'fade':
                return (
                    <div className="space-y-4 p-4">
                        <h4 className="text-sm font-bold text-white">Fade Transitions</h4>
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={editState.fadeIn}
                                    onChange={(e) => onEditChange({ fadeIn: e.target.checked })}
                                    className="rounded accent-purple-500"
                                />
                                <span className="text-sm text-gray-300">Fade In (Start)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={editState.fadeOut}
                                    onChange={(e) => onEditChange({ fadeOut: e.target.checked })}
                                    className="rounded accent-purple-500"
                                />
                                <span className="text-sm text-gray-300">Fade Out (End)</span>
                            </label>
                        </div>
                    </div>
                );
            case 'effects':
                return (
                    <div className="space-y-4 p-4">
                        <h4 className="text-sm font-bold text-white">Effects</h4>
                        <div className="flex flex-col gap-2">
                            {['none', 'blur', 'invert'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => onEditChange({ effect: f as 'none' | 'blur' | 'invert' })}
                                    className={cn(
                                        'px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors text-left',
                                        editState.effect === f ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20'
                                    )}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="p-4 text-sm text-gray-500">
                        Select a tool to edit
                    </div>
                );
        }
    };

    return (
        <div className="w-56 bg-[#141414] border-l border-white/5 overflow-y-auto shrink-0">
            {renderControls()}
        </div>
    );
};

export default EditingControls;
