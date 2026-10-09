
import React, { FC, useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, Blob as GenAIBlob, LiveServerMessage } from "@google/genai";
import { encode, decode, decodeAudioData } from '../../utils/audioUtils';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

const API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: API_KEY || 'MISSING_API_KEY' });

// Infer the LiveSession type as it's not exported from the package.
type LiveSession = Awaited<ReturnType<typeof ai.live.connect>>;

const InteractivePractice: FC<{
    systemInstruction: string;
    practicePrompt: string;
}> = ({ systemInstruction, practicePrompt }) => {
    const [session, setSession] = useState<LiveSession | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcript, setTranscript] = useState<{ speaker: 'You' | 'AI'; text: string }[]>([]);

    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    
    // For audio playback queue
    const nextStartTimeRef = useRef(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    // For transcription assembly
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');
    
    const cleanup = () => {
        console.log('Cleaning up resources...');
        if (session) {
            session.close();
            setSession(null);
        }
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;

        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.onaudioprocess = null;
            scriptProcessorRef.current.disconnect();
        }
        mediaStreamSourceRef.current?.disconnect();
        scriptProcessorRef.current = null;
        mediaStreamSourceRef.current = null;
        
        if (inputAudioContextRef.current?.state !== 'closed') {
            inputAudioContextRef.current?.close().catch(console.error);
        }
        inputAudioContextRef.current = null;
        
        if (outputAudioContextRef.current?.state !== 'closed') {
            outputAudioContextRef.current?.close().catch(console.error);
        }
        outputAudioContextRef.current = null;

        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;
        
        setIsActive(false);
        setIsConnecting(false);
    };

    const handleStart = async () => {
        if (isActive || isConnecting) return;

        setIsConnecting(true);
        setError(null);
        setTranscript([]);
        currentInputTranscriptionRef.current = '';
        currentOutputTranscriptionRef.current = '';

        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                    },
                } as any,
                callbacks: {
                    onopen: () => {
                        console.log('Session opened.');
                        setIsConnecting(false);
                        setIsActive(true);
                        
                        mediaStreamSourceRef.current = inputAudioContextRef.current!.createMediaStreamSource(streamRef.current!);
                        scriptProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);

                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob: GenAIBlob = {
                                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        
                        mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle transcriptions
                        const serverContent = message.serverContent as any;
                        if (serverContent?.inputTranscription) {
                            currentInputTranscriptionRef.current += serverContent.inputTranscription.text;
                        }
                        if (serverContent?.outputTranscription) {
                            currentOutputTranscriptionRef.current += serverContent.outputTranscription.text;
                        }
                        if (serverContent?.turnComplete) {
                            const userInput = currentInputTranscriptionRef.current.trim();
                            const aiOutput = currentOutputTranscriptionRef.current.trim();
                            
                            setTranscript(prev => {
                                const newTranscript = [...prev];
                                if (userInput) newTranscript.push({ speaker: 'You', text: userInput });
                                if (aiOutput) newTranscript.push({ speaker: 'AI', text: aiOutput });
                                return newTranscript;
                            });

                            currentInputTranscriptionRef.current = '';
                            currentOutputTranscriptionRef.current = '';
                        }
                        
                        // Handle audio playback
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
                            const outputCtx = outputAudioContextRef.current;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                            const source = outputCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputCtx.destination);
                            
                            source.addEventListener('ended', () => {
                                audioSourcesRef.current.delete(source);
                            });

                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                        }
                        
                        if (message.serverContent?.interrupted) {
                            for (const source of audioSourcesRef.current.values()) {
                                source.stop();
                            }
                            audioSourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onclose: () => {
                        console.log('Session closed.');
                        cleanup();
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Session error:', e);
                        setError(`A connection error occurred: ${e.message}. Please try again.`);
                        cleanup();
                    },
                }
            });

            const session = await sessionPromiseRef.current;
            setSession(session);
            // The conversation is initiated by the user speaking the practice prompt, which is displayed in the UI.
            // The `sendText` method does not exist on the Live API session object.

        } catch (err) {
            console.error("Failed to start interactive practice:", err);
            setError(err instanceof Error ? `Microphone access denied or another error occurred: ${err.message}` : "An unknown error occurred.");
            cleanup();
        }
    };
    
    const handleStop = () => {
        cleanup();
    };

    // Ensure cleanup happens on component unmount
    useEffect(() => {
        return () => cleanup();
    }, []);

    return (
        <div className="mt-6 p-4 bg-gray-50 border-t">
            <h4 className="font-semibold text-lg text-gray-700 mb-2">Interactive Practice</h4>
            <p className="text-sm text-gray-600 mb-3">{practicePrompt}</p>
            <div className="flex items-center space-x-4 mb-3">
                <Button 
                    onClick={isActive ? handleStop : handleStart}
                    disabled={isConnecting}
                    className={isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                >
                    {isConnecting ? <Spinner /> : (isActive ? <><i className="fas fa-stop-circle mr-2"></i>Stop Practice</> : <><i className="fas fa-microphone mr-2"></i>Start Practice</>)}
                </Button>
                {isActive && (
                    <div className="flex items-center space-x-2">
                         <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        <span className="text-sm font-medium text-gray-700">Live</span>
                    </div>
                )}
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="mt-4 p-3 bg-white border rounded-md min-h-[100px] max-h-48 overflow-y-auto space-y-2">
                {transcript.length === 0 && !isActive && !isConnecting && <p className="text-gray-400 text-sm">Transcript will appear here...</p>}
                {transcript.map((entry, index) => (
                    <p key={index} className="text-sm">
                        <strong className={entry.speaker === 'You' ? 'text-blue-600' : 'text-purple-600'}>{entry.speaker}:</strong> {entry.text}
                    </p>
                ))}
            </div>
        </div>
    );
};

export default InteractivePractice;
