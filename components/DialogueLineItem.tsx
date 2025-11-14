
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import type { DialogueLine, SpeakerSetting } from '../types';
import { getDecodedAudio } from '../services/geminiService';

interface DialogueLineItemProps {
    line: DialogueLine;
    speakerSettings: Map<string, SpeakerSetting>;
    handleGenerateAudioForLine: (line: DialogueLine) => Promise<string | null>;
    activePlayers: Set<string>;
    setActivePlayers: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.717-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
    </svg>
);

const StopIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" />
    </svg>
);

const LoadingSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const DialogueLineItem: React.FC<DialogueLineItemProps> = ({
    line,
    speakerSettings,
    handleGenerateAudioForLine,
    activePlayers,
    setActivePlayers,
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const isPlaying = activePlayers.has(line.id);

    const cleanupAudio = useCallback(() => {
        if (audioSourceRef.current) {
            audioSourceRef.current.onended = null;
            try { audioSourceRef.current.stop(); } catch (e) { /* Ignore */ }
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        audioSourceRef.current = null;
        audioContextRef.current = null;
        setActivePlayers(prev => {
            const newSet = new Set(prev);
            newSet.delete(line.id);
            return newSet;
        });
    }, [line.id, setActivePlayers]);

    const handlePlay = useCallback(async () => {
        if (isLoading) return;
        
        if (isPlaying) {
            cleanupAudio();
            return;
        }

        setIsLoading(true);

        try {
            const audioData = await handleGenerateAudioForLine(line);
            if (audioData) {
                cleanupAudio(); // Ensure no lingering audio contexts
                const { audioBuffer, audioContext } = await getDecodedAudio(audioData);
                audioContextRef.current = audioContext;
                const source = audioContext.createBufferSource();
                audioSourceRef.current = source;
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                
                setActivePlayers(prev => new Set(prev).add(line.id));
                source.onended = cleanupAudio;
                source.start();
            }
        } catch (error) {
            console.error('Error playing audio:', error);
            toast.error('Could not play audio.');
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, isPlaying, handleGenerateAudioForLine, line, setActivePlayers, cleanupAudio]);

    useEffect(() => {
        return cleanupAudio;
    }, [cleanupAudio]);

    const speakerColor = line.speaker === 'N/A' ? 'text-red-400' : 'text-accent';
    const voice = speakerSettings.get(line.speaker)?.voice || 'N/A';

    return (
        <div className="bg-background p-3 rounded-md border border-gray-700 flex items-center gap-3">
            <button
                onClick={handlePlay}
                disabled={isLoading || line.speaker === 'N/A'}
                className="p-2 rounded-full bg-primary hover:bg-secondary disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors text-white flex-shrink-0"
                aria-label={isPlaying ? 'Stop' : 'Play'}
            >
                {isLoading ? <LoadingSpinner /> : isPlaying ? <StopIcon /> : <PlayIcon />}
            </button>
            <div className="flex-grow">
                <p className={`font-bold text-sm ${speakerColor}`}>
                    {line.speaker} <span className="font-normal text-xs text-text-secondary">({voice})</span>
                </p>
                <p className="text-text-secondary">{line.dialogue}</p>
            </div>
        </div>
    );
};

export default DialogueLineItem;