import { UploadCloud, FileType, X } from 'lucide-react';
import { useState, useCallback } from 'react';

interface FileUploadProps {
    onFileSelect?: (file: File) => void;
    currentFile?: File | null;
    onRemoveFile?: () => void;
    /** HTML accept attribute, e.g. "video/*" or "video/mp4,video/webm" */
    accept?: string;
    /** Display text for supported formats */
    supportedFormats?: string;
}

const FileUpload = ({ onFileSelect, currentFile, onRemoveFile, accept, supportedFormats }: FileUploadProps = {}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [internalFile, setInternalFile] = useState<File | null>(null);

    const file = currentFile !== undefined ? currentFile : internalFile;

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (onFileSelect) onFileSelect(droppedFile);
            else setInternalFile(droppedFile);
        }
    }, [onFileSelect]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (onFileSelect) {
                onFileSelect(selectedFile);
            } else {
                setInternalFile(selectedFile);
            }
        }
    };

    const removeFile = () => {
        if (onRemoveFile) {
            onRemoveFile();
        } else {
            setInternalFile(null);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            {!file ? (
                <div
                    className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 transition-all duration-200 text-center cursor-pointer ${isDragging
                        ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]'
                        : 'border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/50'
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    role="button"
                    tabIndex={0}
                    aria-label="Upload file — click or drag and drop"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            const input = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement;
                            input?.click();
                        }
                    }}
                >
                    <input
                        type="file"
                        accept={accept}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                        tabIndex={-1}
                        aria-hidden="true"
                    />
                    <div className="flex flex-col items-center gap-3 sm:gap-4 pointer-events-none">
                        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center ${isDragging ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-indigo-400'}`}>
                            <UploadCloud size={28} />
                        </div>
                        <div>
                            <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">
                                {isDragging ? 'Drop file here' : 'Drag & Drop your files here'}
                            </h3>
                            <p className="text-gray-400 text-sm">
                                or tap to browse from your device
                            </p>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 sm:mt-4">
                            Supported formats: {supportedFormats || 'PDF, DOCX, PPTX, XLSX, MP4, MOV'}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-slate-800 rounded-xl p-4 sm:p-6 flex items-center justify-between border border-slate-700 gap-3">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                            <FileType size={20} />
                        </div>
                        <div className="min-w-0">
                            <p className="font-medium text-white truncate text-sm sm:text-base">{file.name}</p>
                            <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    </div>
                    <button
                        onClick={removeFile}
                        className="p-2.5 hover:bg-slate-700 rounded-full text-gray-400 hover:text-white transition-colors shrink-0"
                        aria-label="Remove file"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default FileUpload;
