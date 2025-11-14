
import { GoogleGenAI, Modality } from "@google/genai";
import type { DecodedAudio } from '../types';

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }
}

// Ensure API key is available
if (!process.env.API_KEY) {
  // In a real app, you might want to handle this more gracefully.
  // For this context, we assume it's provided.
  console.warn("API_KEY environment variable not set. Using a placeholder.");
  // process.env.API_KEY = "YOUR_API_KEY"; // This would be a security risk. Handled externally.
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export async function generateSpeech(dialogue: string, voice: string, stylePrompt: string = '', emotion: string = 'Neutral'): Promise<string> {
    const emotionText = emotion !== 'Neutral' ? emotion.toLowerCase() : '';
    
    // Combine emotion and user-defined style prompt
    const combinedStyle = [emotionText, stylePrompt].filter(Boolean).join(', ');

    const prompt = combinedStyle 
        ? `Say it in this style '${combinedStyle}': ${dialogue}` 
        : dialogue;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voice },
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("No audio data received from API.");
    }

    return base64Audio;
}

// --- Audio Decoding Utilities ---

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodePcmAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


export async function getDecodedAudio(base64Audio: string): Promise<DecodedAudio> {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    const decodedBytes = decodeBase64(base64Audio);
    const audioBuffer = await decodePcmAudioData(decodedBytes, audioContext);
    return { audioBuffer, audioContext };
}