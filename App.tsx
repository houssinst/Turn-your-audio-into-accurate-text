
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { Mic, Upload, Sparkles, AlertTriangle, Moon, Sun, RotateCcw, Shield, Cpu, Zap } from 'lucide-react';
import AudioRecorder from './components/AudioRecorder';
import FileUploader from './components/FileUploader';
import TranscriptionDisplay from './components/TranscriptionDisplay';
import Button from './components/Button';
import { transcribeAudio } from './services/geminiService';
import { AudioData, TranscriptionResponse, AppState } from './types';

function App() {
  const [mode, setMode] = useState<'record' | 'upload'>('record');
  const [status, setStatus] = useState<AppState>('idle');
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [result, setResult] = useState<TranscriptionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  // For native recording, the transcript might come back directly from the recorder component
  const handleNativeTranscript = (transcript: string) => {
    setStatus('success');
    setResult({
      summary: "Transcript captured using your browser's native engine. Use 'AI Analysis' to generate summaries and emotions.",
      segments: [{
        speaker: "Speaker",
        timestamp: "Live",
        content: transcript,
        language: "Detected",
        language_code: "auto",
        emotion: undefined
      }]
    });
  };

  const handleAudioReady = (data: AudioData) => {
    setAudioData(data);
    setError(null);
    setResult(null);
    setStatus('idle');
  };

  const handleCloudTranscribe = async () => {
    if (!audioData) return;

    setStatus('processing');
    setError(null);
    
    try {
      const data = await transcribeAudio(audioData.base64, audioData.mimeType);
      setResult(data);
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Cloud processing failed.");
      setStatus('error');
    }
  };

  const handleReset = () => {
    setAudioData(null);
    setResult(null);
    setStatus('idle');
    setError(null);
  };

  const renderContent = () => {
    if (status === 'processing') {
      return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-12 text-center animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 border-4 border-indigo-100 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin"></div>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Analyzing Audio...</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Leveraging Gemini 3 Flash for high-quality diarization and summary.
          </p>
        </div>
      );
    }

    if (result && status === 'success') {
      return (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Transcript</h2>
            <Button onClick={handleReset} variant="secondary" icon={<RotateCcw size={16} />}>Clear</Button>
          </div>
          <TranscriptionDisplay data={result} />
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 animate-fade-in">
        {mode === 'record' ? (
          <AudioRecorder 
            onAudioCaptured={handleAudioReady} 
            onTranscriptCaptured={handleNativeTranscript}
          />
        ) : (
          <FileUploader onFileSelected={handleAudioReady} />
        )}

        {audioData && (
          <div className="mt-8 flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800">
            <Button onClick={handleCloudTranscribe} className="w-full sm:w-auto px-10 h-12 text-base" icon={<Sparkles size={18} />}>
              Generate AI Summary & Emotions
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 transition-colors duration-300">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/30">
              <Zap size={22} />
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">EchoScript</h1>
          </div>
          <button onClick={toggleDarkMode} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
            Transcribe <span className="text-indigo-600">Instantly.</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Zero-memory native engine for live speech, Gemini for professional files.
          </p>
        </div>

        {error && (
          <div className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5 flex items-start text-red-800 dark:text-red-400 animate-fade-in shadow-sm">
            <AlertTriangle className="mr-4 flex-shrink-0 mt-0.5 text-red-600" size={24} />
            <div className="flex-1">
              <h4 className="font-bold mb-1">Engine Error</h4>
              <p className="text-sm opacity-90">{error}</p>
              <button onClick={handleReset} className="mt-3 text-xs font-bold uppercase tracking-wider bg-red-100 dark:bg-red-900/40 px-3 py-1.5 rounded-lg">Try Again</button>
            </div>
          </div>
        )}

        {(status !== 'success' && status !== 'processing') && (
          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 inline-flex mb-8 w-full sm:w-auto">
            <button
                onClick={() => { setMode('record'); handleReset(); }}
                className={`flex-1 sm:flex-none flex items-center justify-center px-8 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'record' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
                <Mic size={18} className="mr-2" /> Live
            </button>
            <button
                onClick={() => { setMode('upload'); handleReset(); }}
                className={`flex-1 sm:flex-none flex items-center justify-center px-8 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'upload' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
                <Upload size={18} className="mr-2" /> Upload
            </button>
          </div>
        )}

        <div className="space-y-8">
          {renderContent()}
        </div>

        <div className="mt-20 flex flex-col items-center gap-6 text-center">
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 dark:bg-slate-900 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">
                <Shield size={14} className="text-indigo-600" /> Native Engine Protected
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm leading-relaxed">
              Recording uses your browser's native capabilities. No memory-heavy models are downloaded. AI Analysis is powered by Gemini 3 Flash.
            </p>
        </div>
      </main>
    </div>
  );
}

export default App;
