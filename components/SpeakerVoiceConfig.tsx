import React, { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import type { SpeakerSetting } from '../types';
import { AVAILABLE_VOICES, AVAILABLE_EMOTIONS } from '../constants';
import { generateSpeech, getDecodedAudio } from '../services/geminiService';

interface SpeakerVoiceConfigProps {
    speaker: string;
    settings: SpeakerSetting;
    setSpeakerSettings: React.Dispatch<React.SetStateAction<Map<string, SpeakerSetting>>>;
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


const SpeakerVoiceConfig: React.FC<SpeakerVoiceConfigProps> = ({
    speaker,
    settings,
    setSpeakerSettings,
    activePlayers,
    setActivePlayers
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const playerId = `speaker-preview-${speaker}`;
    const isPlaying = activePlayers.has(playerId);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const updateSetting = (key: keyof SpeakerSetting, value: string) => {
        setSpeakerSettings(prev => {
            const newSettings = new Map(prev);
            const current = newSettings.get(speaker);
            if (current) {
                const currentSetting = current as SpeakerSetting;
                newSettings.set(speaker, {
                    voice: key === 'voice' ? value : currentSetting.voice,
                    stylePrompt: key === 'stylePrompt' ? value : currentSetting.stylePrompt,
                    emotion: key === 'emotion' ? value : currentSetting.emotion ?? 'Neutral',
                });
            }
            return newSettings;
        });
    };

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
            newSet.delete(playerId);
            return newSet;
        });
    }, [playerId, setActivePlayers]);

    const handlePreview = useCallback(async () => {
        if (isLoading) return;

        if (isPlaying) {
            cleanupAudio();
            return;
        }

        setIsLoading(true);

        try {
            const audioData = await generateSpeech(`Hello, my name is ${speaker}.`, settings.voice, settings.stylePrompt, settings.emotion);
            cleanupAudio(); // Ensure no lingering audio contexts
            const { audioBuffer, audioContext } = await getDecodedAudio(audioData);
            audioContextRef.current = audioContext;
            const source = audioContext.createBufferSource();
            audioSourceRef.current = source;
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);

            setActivePlayers(prev => new Set(prev).add(playerId));
            source.onended = cleanupAudio;
            source.start();

        } catch (error) {
            console.error('Error previewing audio:', error);
            toast.error(`Could not preview voice for ${speaker}.`);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, isPlaying, speaker, settings, setActivePlayers, playerId, cleanupAudio]);

    useEffect(() => {
        return cleanupAudio;
    }, [cleanupAudio]);

    return (
        <div className="bg-background p-4 rounded-lg border border-gray-700">
            <h4 className="font-bold text-accent mb-3">{speaker}</h4>
            <div className="space-y-3">
                <div>
                    <label htmlFor={`voice-${speaker}`} className="block text-sm font-medium text-text-secondary mb-1">Voice</label>
                    <div className="flex items-center gap-2">
                        <select
                            id={`voice-${speaker}`}
                            value={settings.voice}
                            onChange={(e) => updateSetting('voice', e.target.value)}
                            className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-accent focus:border-accent transition text-text-secondary"
                        >
                            {AVAILABLE_VOICES.map(voice => (
                                <option key={voice} value={voice}>{voice}</option>
                            ))}
                        </select>
                        <button
                            onClick={handlePreview}
                            disabled={isLoading}
                            className="p-2 rounded-md bg-accent hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors text-white flex-shrink-0"
                            aria-label={`Preview voice for ${speaker}`}
                        >
                            {isLoading ? <LoadingSpinner /> : isPlaying ? <StopIcon /> : <PlayIcon />}
                        </button>
                    </div>
                </div>

                <div>
                    <label htmlFor={`emotion-${speaker}`} className="block text-sm font-medium text-text-secondary mb-1">Emotion</label>
                    <select
                        id={`emotion-${speaker}`}
                        value={settings.emotion || 'Neutral'}
                        onChange={(e) => updateSetting('emotion', e.target.value)}
                        className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-accent focus:border-accent transition text-text-secondary"
                    >
                        {AVAILABLE_EMOTIONS.map(emotion => (
                            <option key={emotion} value={emotion}>{emotion}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor={`style-${speaker}`} className="block text-sm font-medium text-text-secondary mb-1">Style Prompt (Optional)</label>
                    <input
                        id={`style-${speaker}`}
                        type="text"
                        value={settings.stylePrompt}
                        onChange={(e) => updateSetting('stylePrompt', e.target.value)}
                        placeholder="e.g., 'whispering', 'shouting'"
                        className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-accent focus:border-accent transition text-text-secondary"
                    />
                </div>
            </div>
        </div>
    );
};

export default SpeakerVoiceConfig;