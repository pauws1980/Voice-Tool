
import React from 'react';
import type { DialogueLine, SpeakerSetting } from '../types';
import DialogueLineItem from './DialogueLineItem';

interface ScriptEditorProps {
    script: string;
    setScript: (script: string) => void;
    lines: DialogueLine[];
    speakerSettings: Map<string, SpeakerSetting>;
    handleGenerateAudioForLine: (line: DialogueLine) => Promise<string | null>;
    activePlayers: Set<string>;
    setActivePlayers: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const ScriptEditor: React.FC<ScriptEditorProps> = ({
    script,
    setScript,
    lines,
    speakerSettings,
    handleGenerateAudioForLine,
    activePlayers,
    setActivePlayers,
}) => {
    return (
        <div className="bg-surface rounded-lg p-6 shadow-lg h-full flex flex-col">
            <h2 className="text-xl font-bold mb-4 text-text-primary">Script Input</h2>
            <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Speaker 1: Hello world..."
                className="w-full h-48 p-3 bg-background border border-gray-600 rounded-md resize-y focus:ring-2 focus:ring-accent focus:border-accent transition mb-6 text-text-secondary"
            />

            <h3 className="text-lg font-semibold mb-3 text-text-primary">Dialogue Breakdown</h3>
            <div className="flex-grow overflow-y-auto pr-2 space-y-3">
                {lines.length > 0 ? (
                    lines.map((line, index) => (
                        <DialogueLineItem
                            key={line.id}
                            line={line}
                            speakerSettings={speakerSettings}
                            handleGenerateAudioForLine={handleGenerateAudioForLine}
                            activePlayers={activePlayers}
                            setActivePlayers={setActivePlayers}
                        />
                    ))
                ) : (
                    <div className="text-center py-10 text-text-secondary">
                        <p>Your parsed script will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScriptEditor;
