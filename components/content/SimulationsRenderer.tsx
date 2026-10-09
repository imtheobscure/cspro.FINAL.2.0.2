import React, { FC, useState, useEffect, useRef } from 'react';
import type { SimulationScenario, SimulationLine, LearnerProfile } from '../../types';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import Textarea from '../ui/Textarea';
import { SearchableVoiceSelect } from '../ui/SearchableVoiceSelect';
import { handleSaveSimulationAsHtml } from '../../utils/simulationHtmlGenerator';
import { isCompanionVoiceCode, resolveGlobalReadAloudVoice } from '../../utils/characters';

const DialoguePlayer: FC<{ scenario: SimulationScenario; characterVoices: Record<string, string> }> = ({ scenario, characterVoices }) => {
    const [playbackState, setPlaybackState] = useState<'idle' | 'playing' | 'paused'>('idle');
    const [currentLineIndex, setCurrentLineIndex] = useState(0);

    const cleanup = () => {
        window.speechSynthesis.cancel();
        setPlaybackState('idle');
    };

    const handlePlay = () => {
        if (playbackState === 'paused') {
            window.speechSynthesis.resume();
            setPlaybackState('playing');
            return;
        }

        cleanup();
        setPlaybackState('playing');
        playLine(0);
    };

    const playLine = (index: number) => {
        if (!scenario?.dialogue || index >= scenario.dialogue.length) {
            setPlaybackState('idle');
            return;
        }

        setCurrentLineIndex(index);
        const line = scenario.dialogue[index];
        const voiceId = characterVoices[line.speaker];
        
        const utter = new SpeechSynthesisUtterance(line.line);
        const voices = window.speechSynthesis.getVoices();
        
        // Find the matched voice
        if (voiceId) {
            const matched = voices.find(v => v.voiceURI === voiceId);
            if (matched) utter.voice = matched;
        }

        utter.onend = () => {
            playLine(index + 1);
        };
        
        window.speechSynthesis.speak(utter);
    };

    
    const handlePause = () => {
        if (playbackState === 'playing') {
            window.speechSynthesis.pause();
            setPlaybackState('paused');
        }
    };

    const handleStop = () => {
        cleanup();
    };

    useEffect(() => {
        return () => window.speechSynthesis.cancel();
    }, []);

    // Audio Recording states
    const [isRecording, setIsRecording] = useState(false);
    const [recMode, setRecMode] = useState<'mic' | 'tab'>('mic');
    const [audioLevel, setAudioLevel] = useState(0);
    
    const handleRecordAndDownload = async () => {
        if (!scenario?.dialogue || scenario.dialogue.length === 0) return;

        if (recMode === 'tab') {
            const confirm = window.confirm("To record this conversation via tab audio, we need to capture your tab's audio output as it plays.\n\n1. Select 'Chrome Tab' or 'This Tab'.\n2. IMPORTANT: Ensure 'Share tab audio' is CHECKED.\n3. Do not switch tabs while recording.");
            if (!confirm) return;
        } else {
            const confirm = window.confirm("To record this conversation via microphone, ensure your microphone is enabled and your speakers are turned up so the mic can pick up the browser voices.");
            if (!confirm) return;
        }

        setIsRecording(true);
        setPlaybackState('playing');

        let stream: MediaStream | null = null;
        try {
            if (recMode === 'tab') {
                stream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true,
                    // @ts-ignore
                    preferCurrentTab: true 
                });
            } else {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: true
                    }
                });
            }

            const audioTrack = stream.getAudioTracks()[0];
            if (!audioTrack) {
                stream.getTracks().forEach(track => track.stop());
                throw new Error(recMode === 'tab' 
                    ? "No audio track selected. Did you check 'Share tab audio'?" 
                    : "No microphone audio track found."
                );
            }

            const mimeType = MediaRecorder.isTypeSupported('audio/mp4') 
                ? 'audio/mp4' 
                : (MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm');

            // Extract ONLY the audio track into a new MediaStream (completely removing any video recording tracks)
            const audioStream = new MediaStream([audioTrack]);
            const mediaRecorder = new MediaRecorder(audioStream, { mimeType });
            const chunks: Blob[] = [];

            // Live Audio Level Analyzer setup
            let audioCtx: AudioContext | null = null;
            let analyser: AnalyserNode | null = null;
            let animationId: number | null = null;

            try {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                audioCtx = new AudioContextClass();
                const source = audioCtx.createMediaStreamSource(audioStream);
                analyser = audioCtx.createAnalyser();
                analyser.fftSize = 64;
                source.connect(analyser);

                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);

                const checkLevel = () => {
                    if (mediaRecorder.state !== 'recording') return;
                    analyser!.getByteFrequencyData(dataArray);
                    let sum = 0;
                    for (let i = 0; i < bufferLength; i++) {
                        sum += dataArray[i];
                    }
                    const average = sum / bufferLength;
                    // Normalize to 0-100
                    const level = Math.min(100, Math.round((average / 128) * 100));
                    setAudioLevel(level);
                    animationId = requestAnimationFrame(checkLevel);
                };
                animationId = requestAnimationFrame(checkLevel);
            } catch (err) {
                console.warn("Could not start visualizer analyser:", err);
            }

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                if (animationId) cancelAnimationFrame(animationId);
                if (audioCtx) audioCtx.close().catch(e => {});
                setAudioLevel(0);

                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
                
                const blob = new Blob(chunks, { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${scenario.title.replace(/\s+/g, '_')}_${Date.now()}.mp3`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                setIsRecording(false);
                setPlaybackState('idle');
            };

            mediaRecorder.start();

            window.speechSynthesis.cancel();
            
            const playRecordSequence = (index: number) => {
                if (index >= scenario.dialogue.length) {
                    setTimeout(() => {
                        if (mediaRecorder.state === 'recording') {
                            mediaRecorder.stop();
                        }
                    }, 1200); 
                    return;
                }

                setCurrentLineIndex(index);
                const line = scenario.dialogue[index];
                const u = new SpeechSynthesisUtterance(line.line);
                
                const voiceId = characterVoices[line.speaker];
                const voices = window.speechSynthesis.getVoices();
                if (voiceId) {
                    const matched = voices.find(v => v.voiceURI === voiceId);
                    if (matched) u.voice = matched;
                }

                u.onend = () => {
                    setTimeout(() => playRecordSequence(index + 1), 350);
                };
                
                u.onerror = () => {
                     if (mediaRecorder.state === 'recording') {
                         mediaRecorder.stop();
                     }
                }

                window.speechSynthesis.speak(u);
            };

            playRecordSequence(0);

        } catch (e: any) {
            console.error(e);
            alert(e.message || "Failed to start recording. Please try again.");
            setIsRecording(false);
            setPlaybackState('idle');
        }
    };

    return (
        <div className="text-center mt-4 space-y-4">
            <div className="flex flex-wrap justify-center items-center gap-2">
                {playbackState === 'idle' ? (
                    <Button id="btn-play-dialogue" onClick={handlePlay} className="bg-purple-600 hover:bg-purple-700" disabled={isRecording}>
                        <i className="fas fa-play mr-2"></i> Play Dialogue
                    </Button>
                ) : playbackState === 'playing' ? (
                    <Button id="btn-pause-dialogue" onClick={handlePause} className="bg-yellow-500 hover:bg-yellow-600" disabled={isRecording}>
                        <i className="fas fa-pause mr-2"></i> Pause
                    </Button>
                ) : (
                    <Button id="btn-play-dialogue" onClick={handlePlay} className="bg-green-500 hover:bg-green-600" disabled={isRecording}>
                        <i className="fas fa-play mr-2"></i> Resume
                    </Button>
                )}
                 <Button id="btn-stop-dialogue" onClick={handleStop} disabled={playbackState === 'idle' || isRecording} className="bg-red-600 hover:bg-red-700">
                    <i className="fas fa-stop mr-2"></i> Stop
                </Button>
            </div>
            
            <div className="pt-4 border-t border-gray-200 space-y-3">
                 <h5 className="text-sm font-bold text-gray-700 mb-1">Generate Audio File (Save to device)</h5>
                 
                 {/* Recording Mode Selection */}
                 {!isRecording && (
                     <div className="flex flex-col items-center gap-1.5 my-2">
                         <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Choose Recording Method</span>
                         <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                             <button
                                 type="button"
                                 onClick={() => setRecMode('mic')}
                                 className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                     recMode === 'mic' 
                                         ? 'bg-slate-900 text-white shadow-sm' 
                                         : 'text-slate-500 hover:text-slate-800'
                                 }`}
                             >
                                 🎙️ Mic (Speakers + voice)
                             </button>
                             <button
                                 type="button"
                                 onClick={() => setRecMode('tab')}
                                 className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                     recMode === 'tab' 
                                         ? 'bg-slate-900 text-white shadow-sm' 
                                         : 'text-slate-500 hover:text-slate-800'
                                 }`}
                             >
                                 💻 Tab Audio
                             </button>
                         </div>
                     </div>
                 )}

                 {/* Real-time Audio Input Meter */}
                 {isRecording && (
                     <div className="flex flex-col items-center justify-center p-3 bg-indigo-50/60 border border-indigo-100/80 rounded-xl max-w-sm mx-auto my-2">
                         <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                             <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span> Live Audio Meter
                         </span>
                         <div className="w-full bg-slate-200/80 h-2.5 rounded-full mt-2 overflow-hidden flex gap-0.5 p-0.5">
                             {Array.from({ length: 15 }).map((_, i) => {
                                 const isActive = audioLevel > (i * 100 / 15);
                                 return (
                                     <div
                                         key={i}
                                         className={`h-full flex-1 rounded-sm transition-all duration-75 ${
                                             isActive 
                                                 ? i < 9 
                                                     ? 'bg-green-500' 
                                                     : i < 12 
                                                         ? 'bg-yellow-500' 
                                                         : 'bg-red-500'
                                                 : 'bg-slate-300'
                                         }`}
                                     />
                                 );
                             })}
                         </div>
                         <p className="text-[9px] text-slate-500 mt-1 font-semibold">
                             {audioLevel > 5 ? "🟢 Audio input detected!" : "⚪ Waiting for sound..."}
                         </p>
                     </div>
                 )}

                 <div className="flex flex-wrap justify-center items-center gap-2">
                    {!isRecording ? (
                        <Button id="btn-record-dialogue" onClick={handleRecordAndDownload} className="bg-indigo-600 hover:bg-indigo-700 text-sm">
                            <i className="fas fa-file-audio mr-2"></i> Record Conversation & Download
                        </Button>
                    ) : (
                        <Button id="btn-recording-active" disabled className="bg-indigo-800 text-sm animate-pulse">
                            <i className="fas fa-circle text-red-500 mr-2"></i> Recording Conversation...
                        </Button>
                    )}
                 </div>
            </div>
        </div>
    );
};

const SimulationCard: FC<{ 
    scenario: SimulationScenario; 
    learner: LearnerProfile;
    onUpdateScenario?: (updated: SimulationScenario) => void;
}> = ({ scenario, learner, onUpdateScenario }) => {
    const [characterVoices, setCharacterVoices] = useState<Record<string, string>>({});
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

    // Editing states
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(scenario?.title || '');
    const [editedDesc, setEditedDesc] = useState(scenario?.scenario || '');
    const [editedDialogue, setEditedDialogue] = useState<SimulationLine[]>([]);

    useEffect(() => {
        // Companion profiles are Classmate-only: a leftover "Alexander Wright" / "male1"
        // voice coming from older generated JSON is replaced by the global Read Aloud Voice,
        // which is also why empty slots fall back to it instead of a browser default.
        const globalVoice = resolveGlobalReadAloudVoice(learner?.readAloudVoice);
        const initialVoices = (scenario?.characters || []).reduce((acc, char) => {
            acc[char.name] = (!char.voice || isCompanionVoiceCode(char.voice)) ? globalVoice : char.voice;
            return acc;
        }, {} as Record<string, string>);
        setCharacterVoices(initialVoices);

        setEditedTitle(scenario?.title || '');
        setEditedDesc(scenario?.scenario || '');
        setEditedDialogue(scenario?.dialogue || []);
    }, [scenario, learner?.readAloudVoice]);

    const handleVoiceChange = (characterName: string, voiceId: string) => {
        setCharacterVoices(prev => ({ ...prev, [characterName]: voiceId }));
    };

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(scenario.dialogueForStudent).then(() => {
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 2000);
        });
    };

    const handleLineEdit = (index: number, field: keyof SimulationLine, value: string) => {
        setEditedDialogue(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handleSaveEdits = () => {
        if (onUpdateScenario) {
            onUpdateScenario({
                ...scenario,
                title: editedTitle,
                scenario: editedDesc,
                dialogue: editedDialogue
            });
        }
        setIsEditing(false);
    };

    const handleCancelEdits = () => {
        setEditedTitle(scenario?.title || '');
        setEditedDesc(scenario?.scenario || '');
        setEditedDialogue(scenario?.dialogue || []);
        setIsEditing(false);
    };
    
    return (
        <div id={`simulation-${scenario.title.replace(/\s+/g, '_')}`} className="bg-white p-6 rounded-lg shadow-md mb-6 border-l-4 border-purple-500">
            <header className="pb-3 border-b border-gray-200 flex flex-wrap justify-between items-start gap-2">
                <div className="flex-1 min-w-[250px]">
                    {isEditing ? (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 block">Edit Title</label>
                            <input 
                                type="text"
                                value={editedTitle}
                                onChange={e => setEditedTitle(e.target.value)}
                                className="w-full text-lg font-bold border rounded p-1.5 bg-gray-50 text-black border-gray-300"
                            />
                            <label className="text-xs font-bold text-gray-500 block">Edit Scenario</label>
                            <textarea 
                                value={editedDesc}
                                onChange={e => setEditedDesc(e.target.value)}
                                className="w-full text-sm border rounded p-1.5 bg-gray-50 h-16 text-black border-gray-300"
                            />
                        </div>
                    ) : (
                        <>
                            <h3 className="text-xl font-bold text-purple-800">{scenario?.title || 'Simulation'}</h3>
                            <p className="text-sm text-gray-600 mt-1">{scenario?.scenario || 'Interactive scenario details'}</p>
                        </>
                    )}
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                    {isEditing ? (
                        <>
                            <Button id="btn-save-simulation-edits" onClick={handleSaveEdits} className="bg-purple-600 hover:bg-purple-700 text-xs py-1 px-2">
                                <i className="fas fa-check mr-1"></i> Save Changes
                            </Button>
                            <Button id="btn-cancel-simulation-edits" onClick={handleCancelEdits} className="bg-gray-400 hover:bg-gray-500 text-xs py-1 px-2">
                                <i className="fas fa-times mr-1"></i> Cancel
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button id="btn-edit-simulation" onClick={() => setIsEditing(true)} className="bg-purple-600 hover:bg-purple-700 text-xs py-1 px-2">
                                <i className="fas fa-edit mr-1"></i> Edit Text
                            </Button>
                            <Button id="btn-save-simulation-html" onClick={() => handleSaveSimulationAsHtml(scenario, learner, `${scenario.title.replace(/\s+/g, '_')}.html`)} className="bg-green-600 hover:bg-green-700 text-xs py-1 px-2">
                                <i className="fas fa-file-code mr-1"></i> Save as HTML
                            </Button>
                            <Button id="btn-copy-for-student" onClick={handleCopyToClipboard} className="bg-gray-600 hover:bg-gray-700 text-xs py-1 px-2">
                                {copyStatus === 'idle' ? '📋 Copy for Student' : '✅ Copied!'}
                            </Button>
                        </>
                    )}
                </div>
            </header>
            
            <div className="mt-4">
                <h4 className="font-semibold text-gray-800 mb-2">Dialogue & Voice Selection</h4>
                <div className="space-y-3 mb-4">
                    {Object.keys(characterVoices).map((name) => (
                        <div key={name} className="grid grid-cols-3 items-center gap-2 text-sm">
                            <label className="font-semibold text-gray-700 col-span-1">{name}'s Voice:</label>
                            <div className="col-span-2">
                                <SearchableVoiceSelect
                                    value={characterVoices[name] || ''}
                                    onChange={(voiceId) => handleVoiceChange(name, voiceId)}
                                />
                            </div>
                        </div>
                    ))}
                </div>
                
                {isEditing ? (
                    <div className="p-3 bg-gray-50 rounded-md border space-y-3 max-h-96 overflow-y-auto">
                        {editedDialogue.map((line, index) => (
                            <div key={index} className="flex gap-2 items-start bg-white p-2 rounded shadow-sm border border-gray-100">
                                <div className="w-1/4">
                                    <label className="text-[10px] font-bold text-gray-500 block">Speaker</label>
                                    <input 
                                        type="text" 
                                        value={line.speaker} 
                                        onChange={(e) => handleLineEdit(index, 'speaker', e.target.value)}
                                        className="w-full text-xs font-semibold border rounded p-1 bg-gray-50 text-black border-gray-300" 
                                    />
                                    <label className="text-[10px] font-bold text-gray-500 block mt-1">Emotion</label>
                                    <input 
                                        type="text" 
                                        value={line.emotion} 
                                        onChange={(e) => handleLineEdit(index, 'emotion', e.target.value)}
                                        className="w-full text-xs border rounded p-1 bg-gray-50 text-black border-gray-300" 
                                    />
                                </div>
                                <div className="w-3/4">
                                    <label className="text-[10px] font-bold text-gray-500 block">Dialogue Text</label>
                                    <textarea 
                                        value={line.line} 
                                        onChange={(e) => handleLineEdit(index, 'line', e.target.value)}
                                        className="w-full text-xs border rounded p-1 h-14 resize-y bg-white text-black border-gray-300"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-3 bg-gray-50 rounded-md border max-h-60 overflow-y-auto">
                        {(scenario?.dialogue || []).map((line, index) => (
                            <p key={index} className="text-sm mb-1">
                                <strong className="text-purple-700">{line.speaker}:</strong> {line.line} <em className="text-gray-500">({line.emotion})</em>
                            </p>
                        ))}
                    </div>
                )}
                
                {!isEditing && <DialoguePlayer scenario={scenario} characterVoices={characterVoices} />}
            </div>
            
            <details className="mt-6 text-sm">
                <summary className="cursor-pointer font-semibold text-lg text-gray-700 hover:text-purple-800">Discussion & Follow-up Questions</summary>
                <div className="mt-2 pl-4 border-l-2 border-gray-200 space-y-4">
                    <div>
                        <h5 className="font-semibold text-gray-800">Comprehension</h5>
                        <ul className="list-disc list-inside text-gray-600">
                            {(scenario?.discussionQuestions?.comprehension || []).map((q, i) => <li key={i}>{q}</li>)}
                        </ul>
                    </div>
                     <div>
                        <h5 className="font-semibold text-gray-800">Speaking Practice</h5>
                        <ul className="list-disc list-inside text-gray-600">
                            {(scenario?.discussionQuestions?.speaking || []).map((q, i) => <li key={i}>{q}</li>)}
                        </ul>
                    </div>
                     <div>
                        <h5 className="font-semibold text-gray-800">Synthesis</h5>
                        <ul className="list-disc list-inside text-gray-600">
                            {(scenario?.discussionQuestions?.synthesis || []).map((q, i) => <li key={i}>{q}</li>)}
                        </ul>
                    </div>
                </div>
            </details>
        </div>
    );
};

// --- Main Component ---
const SimulationsRenderer: FC<{
    content: SimulationScenario[] | undefined;
    learner: LearnerProfile;
    onUpdate?: (updatedContent: SimulationScenario[]) => void;
}> = ({ content, learner, onUpdate }) => {
    
    if (!content || !Array.isArray(content) || content.length === 0 || content[0]?.title?.includes("Error")) {
        return null;
    }

    const handleUpdateScenario = (index: number, updated: SimulationScenario) => {
        if (onUpdate) {
            const next = [...content];
            next[index] = updated;
            onUpdate(next);
        }
    };

    return (
        <div className="mt-6 p-6 border border-gray-300 rounded-lg bg-gray-50">
            {content.map((scenario, index) => (
                <SimulationCard 
                    key={index} 
                    scenario={scenario} 
                    learner={learner}
                    onUpdateScenario={(updated) => handleUpdateScenario(index, updated)} 
                />
            ))}
        </div>
    );
};

export default SimulationsRenderer;
