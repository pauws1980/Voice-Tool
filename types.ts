
export interface DialogueLine {
    id: string;
    speaker: string;
    dialogue: string;
}

export interface SpeakerSetting {
    voice: string;
    stylePrompt: string;
    emotion: string;
}

export interface DecodedAudio {
    audioBuffer: AudioBuffer;
    audioContext: AudioContext;
}