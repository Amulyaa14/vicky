/**
 * Export panel - Format, resolution, Export button.
 * Export runs FFmpeg processing and downloads the final video.
 */
import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

interface ExportPanelProps {
    onExport?: (opts: { format: string; resolution: string }) => void;
    onDownload?: () => void;
    disabled?: boolean;
    isExporting?: boolean;
}

const ExportPanel: React.FC<ExportPanelProps> = ({
    onExport,
    onDownload,
    disabled,
    isExporting = false,
}) => {
    const [format, setFormat] = useState('mp4');
    const [resolution, setResolution] = useState('1080p');

    const handleClick = () => {
        if (onExport) {
            onExport({ format, resolution });
        } else if (onDownload) {
            onDownload();
        }
    };

    return (
        <div className="flex items-center gap-3">
            <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                disabled={disabled}
                className="bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
                <option value="mp4">MP4</option>
                <option value="webm">WebM</option>
            </select>
            <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                disabled={disabled}
                className="bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
                <option value="1080p">1080p</option>
                <option value="720p">720p</option>
                <option value="auto">Auto</option>
            </select>
            <button
                onClick={handleClick}
                disabled={disabled || isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-sm font-bold transition-colors"
            >
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {isExporting ? 'Exporting...' : 'Export'}
            </button>
        </div>
    );
};

export default ExportPanel;
