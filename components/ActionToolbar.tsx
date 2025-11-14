
import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { DialogueLine, SpeakerSetting } from '../types';

declare const JSZip: any;

interface ActionToolbarProps {
    lines: DialogueLine[];
    handleGenerateAudioForLine: (line: DialogueLine) => Promise<string | null>;
    audioCache: Map<string, string>;
    setScript: (script: string) => void;
    setLines: (lines: DialogueLine[]) => void;
    setSpeakerSettings: (settings: Map<string, SpeakerSetting>) => void;
    setAudioCache: (cache: Map<string, string>) => void;
    script: string;
    speakerSettings: Map<string, SpeakerSetting>;
}

const LoadingSpinner = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// Function to convert base64 to a Blob for WAV file
const base64ToWavBlob = (base64: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    
    // Create a WAV file header
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = byteArray.length;
    const chunkSize = 36 + dataSize;
    
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);
    
    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, chunkSize, true);
    writeString(view, 8, 'WAVE');
    
    // fmt chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // Audio format 1 is PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    
    // data chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    const wavHeader = new Uint8Array(buffer);
    const wavBlob = new Blob([wavHeader, byteArray], { type: 'audio/wav' });

    return wavBlob;
};

const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
};


const ActionToolbar: React.FC<ActionToolbarProps> = ({ 
    lines, 
    handleGenerateAudioForLine, 
    audioCache,
    setScript,
    setSpeakerSettings,
    setAudioCache,
    script,
    speakerSettings
 }) => {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateAll = useCallback(async () => {
        setIsGenerating(true);
        toast.info('Generating audio for the entire script...');

        const promises = lines.map(line => handleGenerateAudioForLine(line));
        const results = await Promise.all(promises);
        
        const successCount = results.filter(r => r !== null).length;
        if (successCount === lines.length) {
            toast.success('All audio generated successfully!');
        } else {
            toast.warning(`Generated audio for ${successCount} out of ${lines.length} lines.`);
        }
        
        setIsGenerating(false);
    }, [lines, handleGenerateAudioForLine]);

    const handleDownloadAll = useCallback(async () => {
        if (audioCache.size < lines.length) {
            toast.error('Please generate all audio clips before downloading.');
            return;
        }

        toast.info('Preparing your download...');
        const zip = new JSZip();
        const date = new Date().toLocaleDateString('en-CA').replace(/-/g, '');

        lines.forEach((line, index) => {
            const audioData = audioCache.get(line.id);
            if (audioData) {
                const blob = base64ToWavBlob(audioData);
                const fileName = `${line.speaker.replace(/\s+/g, '_')}_${index + 1}_${date}.wav`;
                zip.file(fileName, blob);
            }
        });

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Story_${date}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Download started!');
    }, [audioCache, lines]);
    
    const handleSave = () => {
        try {
            const stateToSave = {
                script,
                speakerSettings: Array.from(speakerSettings.entries())
            };
            localStorage.setItem('robertTechToolVoiceState', JSON.stringify(stateToSave));
            toast.success('Progress saved!');
        } catch (error) {
            console.error('Failed to save state:', error);
            toast.error('Could not save progress.');
        }
    };
    
    const handleLoad = () => {
        try {
            const savedStateJSON = localStorage.getItem('robertTechToolVoiceState');
            if(savedStateJSON) {
                const savedState = JSON.parse(savedStateJSON);
                setScript(savedState.script);
                setSpeakerSettings(new Map(savedState.speakerSettings));
                setAudioCache(new Map()); // Clear cache on load
                toast.success('Progress loaded!');
            } else {
                toast.info('No saved data found.');
            }
        } catch (error) {
            console.error('Failed to load state:', error);
            toast.error('Could not load progress.');
        }
    };

    return (
        <footer className="sticky bottom-0 bg-surface p-4 border-t border-gray-700 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 md:gap-4 flex-wrap">
                <button
                    onClick={handleGenerateAll}
                    disabled={isGenerating || lines.length === 0}
                    className="flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-secondary disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                    {isGenerating && <LoadingSpinner />}
                    {isGenerating ? 'Generating...' : 'Generate All Audio'}
                </button>

                <button
                    onClick={handleDownloadAll}
                    disabled={isGenerating || audioCache.size !== lines.length || lines.length === 0}
                    className="px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-accent hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                    Download All (ZIP)
                </button>
                 <button
                    onClick={handleSave}
                    className="px-4 py-2 border border-gray-600 text-base font-medium rounded-md text-text-secondary hover:bg-gray-700 hover:text-white transition-colors"
                >
                    Save
                </button>
                <button
                    onClick={handleLoad}
                    className="px-4 py-2 border border-gray-600 text-base font-medium rounded-md text-text-secondary hover:bg-gray-700 hover:text-white transition-colors"
                >
                    Load
                </button>
            </div>
        </footer>
    );
};

export default ActionToolbar;
