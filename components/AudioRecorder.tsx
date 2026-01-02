/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, AlertCircle, Settings, ShieldCheck } from 'lucide-react';
import Button from './Button';
import { AudioData } from '../types';

interface AudioRecorderProps {
  onAudioCaptured: (audioData: AudioData) => void;
  disabled?: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onAudioCaptured, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [error, setError] = useState<{ message: string; type: 'permission' | 'other' } | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initial permission check (if supported by browser)
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as PermissionName }).then((result) => {
        setPermissionStatus(result.state === 'granted' ? 'granted' : result.state === 'denied' ? 'denied' : 'prompt');
        result.onchange = () => {
          setPermissionStatus(result.state === 'granted' ? 'granted' : result.state === 'denied' ? 'denied' : 'prompt');
        };
      }).catch(() => {
        // Fallback for browsers that don't support permission query for microphone
      });
    }
  }, []);

  const requestPermissionAndStart = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionStatus('granted');
      streamRef.current = stream;
      
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
      console.error("Mic error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionStatus('denied');
        setError({ 
          message: "Microphone access was denied. Please check your browser's site settings or your system's privacy panel.",
          type: 'permission'
        });
      } else {
        setError({ 
          message: "Failed to access microphone. Ensure it is connected and not in use by another app.",
          type: 'other'
        });
      }
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
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
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-800 border-2 border-dashed border-indigo-100 dark:border-slate-700 rounded-2xl transition-colors duration-300">
      <div className={`relative flex items-center justify-center w-24 h-24 mb-6 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-50 dark:bg-red-900/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'bg-indigo-50 dark:bg-indigo-900/30'}`}>
        {isRecording && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-20 animate-ping"></span>
        )}
        <div className={isRecording ? 'text-red-500 dark:text-red-400' : 'text-indigo-500 dark:text-indigo-400'}>
          <Mic size={40} className={isRecording ? 'animate-pulse' : ''} />
        </div>
      </div>

      <div className="text-center mb-6">
        {isRecording ? (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Recording...</h3>
            <p className="text-4xl font-mono text-slate-900 dark:text-white mt-2 tabular-nums">{formatTime(duration)}</p>
          </div>
        ) : (
          <div className="px-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
              {permissionStatus === 'denied' ? 'Access Denied' : 'Ready to Record'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-xs mx-auto">
              {permissionStatus === 'denied' 
                ? 'Please enable microphone access in your browser settings to continue.' 
                : 'Tap below to start recording. You may be prompted to allow microphone access.'}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className={`flex flex-col items-center text-center px-4 py-3 rounded-xl mb-6 text-sm ${error.type === 'permission' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800'}`}>
          <div className="flex items-center mb-1 font-bold">
            {error.type === 'permission' ? <Settings size={14} className="mr-2" /> : <AlertCircle size={14} className="mr-2" />}
            {error.type === 'permission' ? "Permission Required" : "Audio Error"}
          </div>
          <p>{error.message}</p>
        </div>
      )}

      {!isRecording ? (
        <Button 
          onClick={requestPermissionAndStart} 
          disabled={disabled}
          className="w-full max-w-xs h-12 shadow-indigo-200 dark:shadow-none"
          icon={permissionStatus === 'granted' ? <Mic size={18} /> : <ShieldCheck size={18} />}
        >
          {permissionStatus === 'granted' ? 'Start Recording' : 'Allow Mic & Start'}
        </Button>
      ) : (
        <Button 
          onClick={stopRecording} 
          variant="danger"
          icon={<Square size={16} fill="currentColor" />}
          className="w-full max-w-xs h-12"
        >
          Stop & Transcribe
        </Button>
      )}
      
      {!isRecording && permissionStatus === 'prompt' && (
        <p className="mt-4 text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">
          Works on iOS, Android, and Desktop
        </p>
      )}
    </div>
  );
};

export default AudioRecorder;