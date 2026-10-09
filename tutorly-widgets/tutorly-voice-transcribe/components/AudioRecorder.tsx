/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, AlertCircle, Monitor, Settings, Zap, Volume2, UserCheck, HelpCircle } from 'lucide-react';
import Button from './Button';
import { AudioData } from '../types';
import { trimSilence, createMixedSpeechStream } from '../services/audioHelper';

interface AudioRecorderProps {
  onAudioCaptured: (audioData: AudioData, dualData?: { learnerBlob: Blob; learnerRawBase64: string }) => void;
  disabled?: boolean;
}

export type RecordSource = 'mic' | 'tab' | 'mixed' | 'separated';

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onAudioCaptured, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recordSource, setRecordSource] = useState<RecordSource>('mixed');
  const [enableSilenceTrim, setEnableSilenceTrim] = useState(true);
  const [trimmingStatus, setTrimmingStatus] = useState<string | null>(null);
  const [micParticipant, setMicParticipant] = useState<'tutor' | 'learner'>('tutor');
  
  // Streams and Recorders
  const micStreamRef = useRef<MediaStream | null>(null);
  const tabStreamRef = useRef<MediaStream | null>(null);
  const mixedStreamRef = useRef<MediaStream | null>(null);
  
  const tutorRecorderRef = useRef<MediaRecorder | null>(null);
  const learnerRecorderRef = useRef<MediaRecorder | null>(null);
  const mixedRecorderRef = useRef<MediaRecorder | null>(null);

  const tutorChunksRef = useRef<Blob[]>([]);
  const learnerChunksRef = useRef<Blob[]>([]);
  const mixedChunksRef = useRef<Blob[]>([]);
  
  const timerRef = useRef<number | null>(null);

  // Stop recording if active and close all tracks
  const stopAllMedia = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    [micStreamRef, tabStreamRef, mixedStreamRef].forEach(ref => {
      if (ref.current) {
        ref.current.getTracks().forEach(track => track.stop());
        ref.current = null;
      }
    });

    setIsRecording(false);
    setDuration(0);
  }, []);

  // Stop Trigger
  const stopRecording = useCallback(() => {
    if (!isRecording) return;

    if (tutorRecorderRef.current && tutorRecorderRef.current.state !== 'inactive') {
      tutorRecorderRef.current.stop();
    }
    if (learnerRecorderRef.current && learnerRecorderRef.current.state !== 'inactive') {
      learnerRecorderRef.current.stop();
    }
    if (mixedRecorderRef.current && mixedRecorderRef.current.state !== 'inactive') {
      mixedRecorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [isRecording]);

  // Start Trigger
  const startRecording = useCallback(async () => {
    setError(null);
    setTrimmingStatus(null);
    tutorChunksRef.current = [];
    learnerChunksRef.current = [];
    mixedChunksRef.current = [];

    try {
      let micStream: MediaStream | null = null;
      let tabStream: MediaStream | null = null;

      // 1. Capture Mic if needed
      if (recordSource === 'mic' || recordSource === 'mixed' || recordSource === 'separated') {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = micStream;
        } catch (err) {
          throw new Error("Could not access microphone. Please permit microphone access.");
        }
      }

      // 2. Capture Screenshare/Tab audio if needed
      if (recordSource === 'tab' || recordSource === 'mixed' || recordSource === 'separated') {
        try {
          tabStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              width: 320,
              height: 240,
              frameRate: 5
            }, // Required for screen capture popup but low impact
            audio: {
              channelCount: 2,
              echoCancellation: false,
              noiseSuppression: false,
            }
          });
          tabStreamRef.current = tabStream;

          // Verify they actually selected 'share tab audio'
          if (tabStream.getAudioTracks().length === 0) {
            stopAllMedia();
            throw new Error("You selected screen sharing but did not check the 'Share System Audio' / 'Share tab audio' option. This option is required to capture system/learner sound.");
          }
        } catch (err: any) {
          if (err.name === 'NotAllowedError') {
            stopAllMedia();
            return; // Cancelled by user
          }
          throw new Error("Failed to capture tab audio. Make sure you share a Chrome tab with the 'Share tab audio' checkbox enabled.");
        }
      }

      // 3. Setup Recording depending on mode
      const activeTime = Date.now();

      if (recordSource === 'mic') {
        // Microphone Only
        if (!micStream) return;
        const rec = new MediaRecorder(micStream);
        tutorRecorderRef.current = rec;
        rec.ondataavailable = (e) => { if (e.data.size > 0) tutorChunksRef.current.push(e.data); };
        
        rec.onstop = async () => {
          let finalBlob = new Blob(tutorChunksRef.current, { type: 'audio/webm' });
          if (enableSilenceTrim) {
            setTrimmingStatus("Trimming initial silences...");
            finalBlob = await trimSilence(finalBlob);
            setTrimmingStatus(null);
          }
          
          const reader = new FileReader();
          reader.readAsDataURL(finalBlob);
          reader.onloadend = () => {
            const rawBase64 = (reader.result as string).split(',')[1];
            onAudioCaptured({
              blob: finalBlob,
              base64: rawBase64,
              mimeType: finalBlob.type,
              duration: duration,
              micAssignment: micParticipant,
              tabAssignment: micParticipant === 'tutor' ? 'learner' : 'tutor'
            });
            stopAllMedia();
          };
        };

        rec.start();
      } 
      else if (recordSource === 'tab') {
        // Tab Audio Only
        if (!tabStream) return;
        const audioOnlyStream = new MediaStream(tabStream.getAudioTracks());
        const rec = new MediaRecorder(audioOnlyStream);
        learnerRecorderRef.current = rec;
        rec.ondataavailable = (e) => { if (e.data.size > 0) learnerChunksRef.current.push(e.data); };
        
        rec.onstop = async () => {
          let finalBlob = new Blob(learnerChunksRef.current, { type: 'audio/webm' });
          if (enableSilenceTrim) {
            setTrimmingStatus("Trimming initial silences...");
            finalBlob = await trimSilence(finalBlob);
            setTrimmingStatus(null);
          }
          
          const reader = new FileReader();
          reader.readAsDataURL(finalBlob);
          reader.onloadend = () => {
            const rawBase64 = (reader.result as string).split(',')[1];
            onAudioCaptured({
              blob: finalBlob,
              base64: rawBase64,
              mimeType: finalBlob.type,
              duration: duration,
              micAssignment: micParticipant,
              tabAssignment: micParticipant === 'tutor' ? 'learner' : 'tutor'
            });
            stopAllMedia();
          };
        };

        rec.start();
      }
      else if (recordSource === 'mixed') {
        // Mix Microphone + Tab Streams
        if (!micStream || !tabStream) return;
        const { mixedStream } = await createMixedSpeechStream(micStream, tabStream);
        mixedStreamRef.current = mixedStream;

        const rec = new MediaRecorder(mixedStream);
        mixedRecorderRef.current = rec;
        rec.ondataavailable = (e) => { if (e.data.size > 0) mixedChunksRef.current.push(e.data); };
        
        rec.onstop = async () => {
          let finalBlob = new Blob(mixedChunksRef.current, { type: 'audio/webm' });
          if (enableSilenceTrim) {
            setTrimmingStatus("Trimming initial silences...");
            finalBlob = await trimSilence(finalBlob);
            setTrimmingStatus(null);
          }
          
          const reader = new FileReader();
          reader.readAsDataURL(finalBlob);
          reader.onloadend = () => {
            const rawBase64 = (reader.result as string).split(',')[1];
            onAudioCaptured({
              blob: finalBlob,
              base64: rawBase64,
              mimeType: finalBlob.type,
              duration: duration,
              micAssignment: micParticipant,
              tabAssignment: micParticipant === 'tutor' ? 'learner' : 'tutor'
            });
            stopAllMedia();
          };
        };

        rec.start();
      }
      else if (recordSource === 'separated') {
        // Record both as separate files simultaneously (Mic: Tutor, Tab: Learner)
        if (!micStream || !tabStream) return;
        
        const recTutor = new MediaRecorder(micStream);
        tutorRecorderRef.current = recTutor;
        recTutor.ondataavailable = (e) => { if (e.data.size > 0) tutorChunksRef.current.push(e.data); };

        const audioOnlyTabStream = new MediaStream(tabStream.getAudioTracks());
        const recLearner = new MediaRecorder(audioOnlyTabStream);
        learnerRecorderRef.current = recLearner;
        recLearner.ondataavailable = (e) => { if (e.data.size > 0) learnerChunksRef.current.push(e.data); };

        // Handle dual stopping completion
        let tutorDone = false;
        let learnerDone = false;
        let tutorBlob: Blob | null = null;
        let learnerBlob: Blob | null = null;

        const checkDualFinish = () => {
          if (tutorDone && learnerDone && tutorBlob && learnerBlob) {
            const tutorReader = new FileReader();
            tutorReader.readAsDataURL(tutorBlob);
            tutorReader.onloadend = () => {
              const tutorBase64 = (tutorReader.result as string).split(',')[1];
              
              const learnerReader = new FileReader();
              // @ts-ignore
              learnerReader.readAsDataURL(learnerBlob);
              learnerReader.onloadend = () => {
                const learnerBase64 = (learnerReader.result as string).split(',')[1];
                
                onAudioCaptured(
                  {
                    blob: tutorBlob!,
                    base64: tutorBase64,
                    mimeType: tutorBlob!.type,
                    duration: duration,
                    micAssignment: micParticipant,
                    tabAssignment: micParticipant === 'tutor' ? 'learner' : 'tutor'
                  },
                  {
                    // @ts-ignore
                    blob: learnerBlob!,
                    base64: learnerBase64
                  }
                );
                stopAllMedia();
              };
            };
          }
        };

        recTutor.onstop = async () => {
          tutorBlob = new Blob(tutorChunksRef.current, { type: 'audio/webm' });
          if (enableSilenceTrim) {
            tutorBlob = await trimSilence(tutorBlob);
          }
          tutorDone = true;
          checkDualFinish();
        };

        recLearner.onstop = async () => {
          learnerBlob = new Blob(learnerChunksRef.current, { type: 'audio/webm' });
          if (enableSilenceTrim) {
            learnerBlob = await trimSilence(learnerBlob);
          }
          learnerDone = true;
          checkDualFinish();
        };

        recTutor.start();
        recLearner.start();
      }

      setIsRecording(true);
      timerRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - activeTime) / 1000));
      }, 1000);

    } catch (err: any) {
      console.error("Error setting up recorders:", err);
      setError(err.message || "An unexpected audio capture issue occurred. Try changing the source mode.");
      stopAllMedia();
    }
  }, [recordSource, enableSilenceTrim, onAudioCaptured, stopAllMedia, duration, micParticipant]);

  // Handle global key shortcuts: Ctrl+Shift+R → start/stop recording
  useEffect(() => {
    const handleGlobalShortcut = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'R') {
        e.preventDefault();
        if (isRecording) {
          stopRecording();
        } else {
          startRecording();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalShortcut);
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcut);
    };
  }, [isRecording, startRecording, stopRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col p-6 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors duration-300">
      
      {/* Configuration Header */}
      {!isRecording && (
        <div className="mb-6 space-y-4">
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
            <Settings size={16} />
            <span>Transcription Source Settings</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'mic', label: '🎤 Microphone Only', desc: 'Captures tutor / teacher speaking only.' },
              { id: 'tab', label: '🖥️ System Tab Audio Only', desc: 'Captures system/learner audio from a shared Chrome tab.' },
              { id: 'mixed', label: '🎛️ Microphone + Tab mixed', desc: 'Mixes voice and system audio into a unified recording.' },
              { id: 'separated', label: '👥 Dual Recording (Tutor & Learner)', desc: 'Records voice (tutor) & tab (learner) as two separate streams.' }
            ].map((mode) => (
              <div
                key={mode.id}
                onClick={() => setRecordSource(mode.id as RecordSource)}
                className={`flex flex-col text-left p-3.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
                  recordSource === mode.id
                    ? 'border-indigo-600 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/20 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-100/50 dark:border-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-850'
                }`}
              >
                <span className="font-semibold text-slate-800 dark:text-slate-100">{mode.label}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-normal">{mode.desc}</span>
                
                {/* Visual Pill Toggles for Stream Assignment */}
                <div className="mt-3 pt-2 border-t border-dashed border-slate-200 dark:border-slate-750 flex flex-wrap items-center justify-between text-xs gap-2 w-full">
                  <span className="text-[9px] text-slate-400 dark:text-slate-505 font-bold uppercase">
                    Setup Roles:
                  </span>
                  
                  {mode.id === 'mic' && (
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border dark:border-slate-800 gap-0.5 inline-flex">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setMicParticipant('tutor'); }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${micParticipant === 'tutor' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        🎙️ Mic=Tutor
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setMicParticipant('learner'); }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${micParticipant === 'learner' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        🎙️ Mic=Learner
                      </button>
                    </div>
                  )}

                  {mode.id === 'tab' && (
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border dark:border-slate-800 gap-0.5 inline-flex">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setMicParticipant('learner'); }} // tab is tutor if mic is learner
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${micParticipant === 'learner' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        💻 Tab=Tutor
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setMicParticipant('tutor'); }} // tab is learner if mic is tutor
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${micParticipant === 'tutor' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        💻 Tab=Learner
                      </button>
                    </div>
                  )}

                  {(mode.id === 'mixed' || mode.id === 'separated') && (
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border dark:border-slate-800 gap-0.5 inline-flex">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setMicParticipant('tutor'); }}
                        className={`px-1 rounded text-[9px] font-bold transition-all ${micParticipant === 'tutor' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400'}`}
                      >
                        🎙️Mic=Tutor,💻Tab=Student
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setMicParticipant('learner'); }}
                        className={`px-1 rounded text-[9px] font-bold transition-all ${micParticipant === 'learner' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400'}`}
                      >
                        🎙️Mic=Student,💻Tab=Tutor
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Silence Trimming Checklist option */}
          <div className="flex items-center space-x-3 pt-2">
            <label className="relative flex items-center cursor-pointer select-none">
              <input 
                type="checkbox"
                checked={enableSilenceTrim}
                onChange={(e) => setEnableSilenceTrim(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
              <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-350">
                Silence Trimming <span className="text-xs text-slate-400 font-normal">(Auto-removes pauses & silence gaps)</span>
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Recording Stage Layout */}
      <div className="flex flex-col items-center justify-center py-6 bg-white dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
        
        <div className={`relative flex items-center justify-center w-20 h-20 mb-4 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-50 dark:bg-red-950/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
          {isRecording && (
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 dark:bg-red-500 opacity-20 animate-ping"></span>
          )}
          {isRecording ? (
            <div className="text-red-500 dark:text-red-400">
              <Volume2 size={36} className="animate-pulse" />
            </div>
          ) : (
            <div className="text-slate-400 dark:text-slate-500">
              <Mic size={36} />
            </div>
          )}
        </div>

        <div className="text-center mb-5">
          {isRecording ? (
            <div>
              <div className="flex items-center justify-center space-x-1.5 text-red-600 dark:text-red-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <span>Recording Spoken Audio ({recordSource === 'separated' ? 'Dual Source' : recordSource})</span>
              </div>
              <p className="text-3xl font-mono text-slate-800 dark:text-slate-100 font-semibold mt-2">{formatTime(duration)}</p>
              {recordSource === 'separated' && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">Microphone details: Tutor Track | Tab details: Learner Track</p>
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Session Workspace Recording</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto px-4">
                {recordSource === 'mixed' || recordSource === 'separated' 
                  ? 'Click "Share Screen & Record" to select your target Chrome tab and start voice monitoring.' 
                  : 'Click "Start Recording" to toggle device audio sensors directly.'}
              </p>
            </div>
          )}
        </div>

        {trimmingStatus && (
          <div className="flex items-center text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 px-4 py-2 rounded-lg mb-4 text-xs animate-pulse">
            <Zap size={14} className="mr-2" />
            {trimmingStatus}
          </div>
        )}

        {error && (
          <div className="flex items-start text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-4 py-3 rounded-lg mb-4 text-xs max-w-md mx-4">
            <AlertCircle size={14} className="mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full max-w-xs">
          {!isRecording ? (
            <Button 
              onClick={startRecording}
              disabled={disabled || !!trimmingStatus}
              className="w-full text-sm py-2.5 flex items-center justify-center space-x-2"
              icon={recordSource === 'mixed' || recordSource === 'separated' || recordSource === 'tab' ? <Monitor size={16} /> : <Mic size={16} />}
            >
              <span>{recordSource === 'mixed' || recordSource === 'separated' || recordSource === 'tab' ? 'Share Tab & Record Voice' : 'Start Recording'}</span>
            </Button>
          ) : (
            <Button 
              onClick={stopRecording} 
              variant="danger"
              icon={<Square size={14} fill="currentColor" />}
              className="w-full text-sm py-2.5 flex items-center justify-center space-x-2"
            >
              <span>Stop Recording</span>
            </Button>
          )}
        </div>

        <div className="mt-4 text-[10px] text-slate-400 dark:text-slate-500">
          Tip: Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-650 font-semibold">Ctrl+Shift+R</kbd> anywhere to start/stop.
        </div>
      </div>
    </div>
  );
};

export default AudioRecorder;
