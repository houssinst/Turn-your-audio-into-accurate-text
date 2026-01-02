
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, AlertCircle, Zap } from 'lucide-react';
import Button from './Button';
import { AudioData } from '../types';

interface AudioRecorderProps {
  onAudioCaptured: (audioData: AudioData) => void;
  onTranscriptCaptured?: (transcript: string) => void;
  onLiveUpdate?: (text: { final: string; interim: string }) => void;
  disabled?: boolean;
  lang?: string;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ 
  onAudioCaptured, 
  onTranscriptCaptured, 
  onLiveUpdate,
  disabled,
  lang = 'en-US'
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>("");

  useEffect(() => {
    if (navigator.permissions && (navigator.permissions as any).query) {
      (navigator.permissions as any).query({ name: 'microphone' }).then((result: any) => {
        setPermissionStatus(result.state);
        result.onchange = () => setPermissionStatus(result.state);
      }).catch(() => {});
    }
  }, []);

  const startRecording = async () => {
    setError(null);
    finalTranscriptRef.current = "";
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermissionStatus('granted');
      
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = lang;
        
        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = "";
          let finalBatch = "";
          
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalBatch += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          
          if (finalBatch) {
            finalTranscriptRef.current += finalBatch + " ";
          }

          if (onLiveUpdate) {
            onLiveUpdate({ 
              final: finalTranscriptRef.current, 
              interim: interimTranscript 
            });
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.warn("Speech recognition error", event.error);
          if (event.error === 'network') {
            setError("Network connection lost. Recognition might be limited.");
          }
        };

        recognitionRef.current.start();
      } else {
        setError("Your browser does not support live transcription. Try Chrome or Edge.");
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/mp4') 
          ? 'audio/mp4' 
          : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          onAudioCaptured({ blob, base64, mimeType });
          
          if (onTranscriptCaptured && finalTranscriptRef.current) {
            onTranscriptCaptured(finalTranscriptRef.current);
          }
        };
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

    } catch (err: any) {
      console.error("Mic Error:", err);
      setError("Could not access microphone.");
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setDuration(0);
    }
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isArabic = lang.startsWith('ar');

  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className={`relative flex items-center justify-center w-28 h-28 mb-8 rounded-full transition-all duration-500 ${isRecording ? 'bg-red-50 dark:bg-red-900/20 ring-4 ring-red-500/30' : 'bg-indigo-50 dark:bg-indigo-900/30 ring-4 ring-indigo-500/10'}`}>
        {isRecording && <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-20 animate-ping"></span>}
        <div className={isRecording ? 'text-red-500 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'}>
          <Mic size={48} className={isRecording ? 'animate-pulse' : ''} />
        </div>
      </div>

      <div className="text-center mb-8">
        {isRecording ? (
          <div>
            <div className={`flex items-center justify-center gap-2 mb-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
              <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest">
                {isArabic ? "نسخ مباشر" : "Live Transcribing"}
              </h3>
            </div>
            <p className="text-5xl font-mono text-slate-900 dark:text-white tabular-nums">{formatTime(duration)}</p>
          </div>
        ) : (
          <div className="px-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
              {permissionStatus === 'denied' ? (isArabic ? 'تم رفض الوصول' : 'Access Denied') : (isArabic ? 'المحرك جاهز' : 'Native Engine Ready')}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-xs mx-auto">
              {isArabic 
                ? "تعرف على الكلام على الجهاز. زمن انتقال صفري وخصوصية تامة."
                : "On-device speech recognition. Zero latency, total privacy."
              }
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl mb-6 border border-red-100 dark:border-red-800">
          <AlertCircle size={16} className="mr-2" />
          {error}
        </div>
      )}

      {!isRecording ? (
        <Button 
          onClick={startRecording} 
          disabled={disabled}
          className="w-full max-w-xs py-4 text-lg rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none"
          icon={<Zap size={22} />}
        >
          {isArabic ? "بدء جلسة مباشرة" : "Start Live Session"}
        </Button>
      ) : (
        <Button 
          onClick={stopRecording} 
          variant="danger"
          icon={<Square size={20} fill="currentColor" />}
          className="w-full max-w-xs py-4 text-lg rounded-2xl shadow-xl shadow-red-200 dark:shadow-none"
        >
          {isArabic ? "إنهاء التسجيل" : "Finish Recording"}
        </Button>
      )}
    </div>
  );
};

export default AudioRecorder;
