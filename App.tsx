
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import type { DialogueLine, SpeakerSetting } from './types';
import { AVAILABLE_VOICES } from './constants';
import { generateSpeech } from './services/geminiService';
import ScriptEditor from './components/ScriptEditor';
import VoiceMapper from './components/VoiceMapper';
import ActionToolbar from './components/ActionToolbar';

const App: React.FC = () => {
    const [script, setScript] = useState<string>(`Speaker 1: Hello, how are you?\nSpeaker 2: I'm good, thanks! What about you?\nSpeaker 1: I'm doing great, excited to see you.`);
    const [lines, setLines] = useState<DialogueLine[]>([]);
    const [speakerSettings, setSpeakerSettings] = useState<Map<string, SpeakerSetting>>(new Map());
    const [audioCache, setAudioCache] = useState<Map<string, string>>(new Map());
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [activePlayers, setActivePlayers] = useState<Set<string>>(new Set());

    const parseScript = useCallback((text: string) => {
        const newLines: DialogueLine[] = text.split('\n')
            .map((line, index) => line.trim())
            .filter(line => line)
            .map((line, index) => {
                const match = line.match(/^(?:\[)?(.*?):(?:\])?\s*(.*)$/);
                if (match) {
                    return { id: `line-${index}`, speaker: match[1].trim(), dialogue: match[2].trim() };
                }
                return { id: `line-${index}`, speaker: 'N/A', dialogue: line };
            });
        setLines(newLines);

        const newSpeakers = new Map<string, SpeakerSetting>(speakerSettings);
        let voiceIndex = 0;
        newLines.forEach(line => {
            if (line.speaker !== 'N/A' && !newSpeakers.has(line.speaker)) {
                newSpeakers.set(line.speaker, {
                    voice: AVAILABLE_VOICES[voiceIndex % AVAILABLE_VOICES.length],
                    stylePrompt: '',
                    emotion: 'Neutral',
                });
                voiceIndex++;
            }
        });
        setSpeakerSettings(newSpeakers);
    }, [speakerSettings]);

    useEffect(() => {
        parseScript(script);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [script]);
    
    const speakers = useMemo(() => Array.from(speakerSettings.keys()), [speakerSettings]);

    const handleGenerateAudioForLine = useCallback(async (line: DialogueLine): Promise<string | null> => {
        if (audioCache.has(line.id)) {
            return audioCache.get(line.id) || null;
        }
        if (line.speaker === 'N/A') {
            toast.error('Cannot generate audio for a line with no speaker.');
            return null;
        }

        const settings = speakerSettings.get(line.speaker);
        if (!settings) {
            toast.error(`No voice settings found for ${line.speaker}.`);
            return null;
        }

        try {
            const audioData = await generateSpeech(line.dialogue, settings.voice, settings.stylePrompt, settings.emotion);
            setAudioCache(prev => new Map(prev).set(line.id, audioData));
            return audioData;
        } catch (error) {
            console.error('Error generating audio:', error);
            toast.error(`Failed to generate audio for "${line.dialogue.substring(0, 20)}...".`);
            return null;
        }
    }, [audioCache, speakerSettings]);

    return (
        <div className="min-h-screen bg-background text-text-primary font-sans">
            <Toaster position="top-center" richColors theme="dark" />
            <header className="py-4 px-8 bg-surface border-b border-gray-700">
                <h1 className="text-2xl font-bold text-primary">Robert Tech Tool Voice</h1>
                <p className="text-text-secondary">Convert your story scripts into natural-sounding audio.</p>
            </header>

            <main className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <ScriptEditor
                        script={script}
                        setScript={setScript}
                        lines={lines}
                        speakerSettings={speakerSettings}
                        handleGenerateAudioForLine={handleGenerateAudioForLine}
                        activePlayers={activePlayers}
                        setActivePlayers={setActivePlayers}
                    />
                </div>
                <div className="lg:col-span-1">
                    <VoiceMapper
                        speakers={speakers}
                        speakerSettings={speakerSettings}
                        setSpeakerSettings={setSpeakerSettings}
                        activePlayers={activePlayers}
                        setActivePlayers={setActivePlayers}
                    />
                </div>
            </main>
            
            <ActionToolbar 
                lines={lines} 
                handleGenerateAudioForLine={handleGenerateAudioForLine}
                audioCache={audioCache}
                setScript={setScript}
                setLines={setLines}
                setSpeakerSettings={setSpeakerSettings}
                setAudioCache={setAudioCache}
                script={script}
                speakerSettings={speakerSettings}
            />
        </div>
    );
};

export default App;