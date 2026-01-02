/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, AlertCircle, Settings } from 'lucide-react';
import Button from './Button';
import { AudioData } from '../types';

interface AudioRecorderProps {
  onAudioCaptured: (audioData: AudioData) => void;
  disabled?: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onAudioCaptured, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<{ message: string; type: 'permission' | 'other' } | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Select best supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/mp4') 
          ? 'audio/mp4' 
          : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const base64 = base64String.split(',')[1];
          
          onAudioCaptured({
            blob,
            base64,
            mimeType: mimeType
          });
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
      console.error("Microphone access error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError({ 
          message: "Microphone permission denied. Please enable microphone access in your browser settings to record audio.",
          type: 'permission'
        });
      } else {
        setError({ 
          message: "Could not access microphone. Please check your connection and try again.",
          type: 'other'
        });
      }
    }
  }, [onAudioCaptured]);

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
      <div className={`relative flex items-center justify-center w-24 h-24 mb-6 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-50 dark:bg-red-900/20' : 'bg-indigo-50 dark:bg-indigo-900/30'}`}>
        {isRecording && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-20 animate-ping"></span>
        )}
        {isRecording ? (
            <div className="text-red-500 dark:text-red-400">
                <Mic size={40} className="animate-pulse" />
            </div>
        ) : (
            <div className="text-indigo-500 dark:text-indigo-400">
                <Mic size={40} />
            </div>
        )}
      </div>

      <div className="text-center mb-6">
        {isRecording ? (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Recording...</h3>
            <p className="text-3xl font-mono text-slate-600 dark:text-slate-300 mt-2">{formatTime(duration)}</p>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Start Recording</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 px-4 text-center">
              Tap the button to start. You will be asked for microphone permission.
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className={`flex flex-col items-center text-center px-4 py-3 rounded-xl mb-6 text-sm ${error.type === 'permission' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800'}`}>
          <div className="flex items-center mb-2 font-bold">
            {error.type === 'permission' ? <Settings size={16} className="mr-2" /> : <AlertCircle size={16} className="mr-2" />}
            {error.type === 'permission' ? "Permission Required" : "Error"}
          </div>
          <p className="leading-relaxed">{error.message}</p>
          {error.type === 'permission' && (
             <p className="mt-2 text-xs opacity-80 italic">
               Check your browser address bar or system settings.
             </p>
          )}
        </div>
      )}

      {!isRecording ? (
        <Button 
          onClick={startRecording} 
          disabled={disabled}
          className="w-full max-w-xs h-12"
        >
          {error?.type === 'permission' ? 'Try Enabling Again' : 'Enable Microphone & Start'}
        </Button>
      ) : (
        <Button 
          onClick={stopRecording} 
          variant="danger"
          icon={<Square size={16} fill="currentColor" />}
          className="w-full max-w-xs h-12"
        >
          Stop & Process
        </Button>
      )}
    </div>
  );
};

export default AudioRecorder;