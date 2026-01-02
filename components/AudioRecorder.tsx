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
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Check permission state if possible
    if (navigator.permissions && (navigator.permissions as any).query) {
      (navigator.permissions as any).query({ name: 'microphone' }).then((result: any) => {
        setPermissionStatus(result.state);
        result.onchange = () => setPermissionStatus(result.state);
      }).catch(() => {});
    }
  }, []);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermissionStatus('granted');
      
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
      console.error("Mic Error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionStatus('denied');
        setError("Microphone access denied. Please check your browser settings.");
      } else {
        setError("Could not access microphone. Ensure it is connected and not used by another app.");
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
    <div className="flex flex-col items-center justify-center py-6">
      <div className={`relative flex items-center justify-center w-28 h-28 mb-8 rounded-full transition-all duration-500 ${isRecording ? 'bg-red-50 dark:bg-red-900/20 ring-4 ring-red-500/30' : 'bg-indigo-50 dark:bg-indigo-900/30 ring-4 ring-indigo-500/10'}`}>
        {isRecording && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-20 animate-ping"></span>
        )}
        <div className={isRecording ? 'text-red-500 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'}>
          <Mic size={48} className={isRecording ? 'animate-pulse' : ''} />
        </div>
      </div>

      <div className="text-center mb-8">
        {isRecording ? (
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-wider">Recording</h3>
            <p className="text-5xl font-mono text-slate-900 dark:text-white mt-3 tabular-nums">{formatTime(duration)}</p>
          </div>
        ) : (
          <div className="px-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
              {permissionStatus === 'denied' ? 'Access Denied' : 'Ready'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-xs mx-auto">
              {permissionStatus === 'denied' 
                ? 'Please enable microphone access in your browser or device settings.' 
                : 'Tap to start recording. Perfect for meetings, interviews, or voice notes.'}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl mb-6 border border-red-100 dark:border-red-800">
          <AlertCircle size={16} className="mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      {!isRecording ? (
        <Button 
          onClick={startRecording} 
          disabled={disabled}
          className="w-full max-w-xs py-4 text-lg rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none"
          icon={permissionStatus === 'granted' ? <Mic size={22} /> : <ShieldCheck size={22} />}
        >
          {permissionStatus === 'granted' ? 'Start Recording' : 'Allow Mic & Start'}
        </Button>
      ) : (
        <Button 
          onClick={stopRecording} 
          variant="danger"
          icon={<Square size={20} fill="currentColor" />}
          className="w-full max-w-xs py-4 text-lg rounded-2xl shadow-xl shadow-red-200 dark:shadow-none"
        >
          Finish Recording
        </Button>
      )}
    </div>
  );
};

export default AudioRecorder;