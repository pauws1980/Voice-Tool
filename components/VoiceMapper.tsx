
import React from 'react';
import type { SpeakerSetting } from '../types';
import SpeakerVoiceConfig from './SpeakerVoiceConfig';

interface VoiceMapperProps {
    speakers: string[];
    speakerSettings: Map<string, SpeakerSetting>;
    setSpeakerSettings: React.Dispatch<React.SetStateAction<Map<string, SpeakerSetting>>>;
    activePlayers: Set<string>;
    setActivePlayers: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const VoiceMapper: React.FC<VoiceMapperProps> = ({
    speakers,
    speakerSettings,
    setSpeakerSettings,
    activePlayers,
    setActivePlayers
}) => {
    return (
        <div className="bg-surface rounded-lg p-6 shadow-lg h-full">
            <h2 className="text-xl font-bold mb-4 text-text-primary">Voice Mapping & Settings</h2>
            <div className="space-y-4">
                {speakers.map(speaker => (
                    <SpeakerVoiceConfig
                        key={speaker}
                        speaker={speaker}
                        settings={speakerSettings.get(speaker)!}
                        setSpeakerSettings={setSpeakerSettings}
                        activePlayers={activePlayers}
                        setActivePlayers={setActivePlayers}
                    />
                ))}
                {speakers.length === 0 && (
                    <div className="text-center py-10 text-text-secondary">
                        <p>Speakers from your script will appear here for configuration.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoiceMapper;
