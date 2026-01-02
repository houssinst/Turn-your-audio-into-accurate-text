/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { Mic, Upload, Sparkles, AlertTriangle, Moon, Sun, RotateCcw, Shield, Cloud, Cpu, Info } from 'lucide-react';
import AudioRecorder from './components/AudioRecorder';
import FileUploader from './components/FileUploader';
import TranscriptionDisplay from './components/TranscriptionDisplay';
import Button from './components/Button';
import { transcribeAudio } from './services/geminiService';
import { transcribeLocally } from './services/whisperService';
import { AudioData, TranscriptionResponse, AppState, EngineType } from './types';

function App() {
  const [mode, setMode] = useState<'record' | 'upload'>('record');
  const [engine, setEngine] = useState<EngineType>('local');
  const [status, setStatus] = useState<AppState>('idle');
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [result, setResult] = useState<TranscriptionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
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

  const handleAudioReady = (data: AudioData) => {
    setAudioData(data);
    setError(null);
    setResult(null);
    setStatus('idle');
  };

  const handleTranscribe = async () => {
    if (!audioData) return;

    setError(null);
    
    try {
      if (engine === 'local') {
        setStatus('loading_model');
        const data = await transcribeLocally(audioData.blob, (p) => setProgress(p));
        setResult(data);
      } else {
        setStatus('processing');
        const data = await transcribeAudio(audioData.base64, audioData.mimeType);
        setResult(data);
      }
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Transcription failed.");
      setStatus('error');
    }
  };

  const handleReset = () => {
    setAudioData(null);
    setResult(null);
    setStatus('idle');
    setError(null);
    setProgress(0);
  };

  const renderContent = () => {
    if (status === 'loading_model' || status === 'processing') {
      return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-12 text-center animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-100 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin"></div>
              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                <Sparkles size={24} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
              </div>
            </div>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            {status === 'loading_model' ? 'Warming up AI Engine...' : 'Analyzing Audio...'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            {status === 'loading_model' 
              ? 'Downloading the Whisper AI model to your browser. This happens once.' 
              : 'Our cloud engine is processing speaker diarization and emotions.'}
          </p>
          {status === 'loading_model' && progress > 0 && (
            <div className="w-full max-w-xs mx-auto bg-slate-100 dark:bg-slate-800 rounded-full h-2.5">
              <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
              <p className="text-[10px] mt-2 font-bold uppercase tracking-widest text-slate-400">{Math.round(progress)}% Downloaded</p>
            </div>
          )}
        </div>
      );
    }

    if (result && status === 'success') {
      return (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Results</h2>
            <Button onClick={handleReset} variant="secondary">Start Over</Button>
          </div>
          <TranscriptionDisplay data={result} />
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 animate-fade-in">
        <div className="mb-6">
           <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <button 
                onClick={() => setEngine('local')}
                className={`flex-1 flex items-start p-4 rounded-xl border-2 transition-all ${engine === 'local' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}
              >
                <Cpu className={`mt-1 mr-3 ${engine === 'local' ? 'text-indigo-600' : 'text-slate-400'}`} size={20} />
                <div className="text-left">
                  <div className="font-bold text-sm">Local Engine (Whisper)</div>
                  <div className="text-xs text-slate-500">Free, Private, No Key Required</div>
                </div>
              </button>
              <button 
                onClick={() => setEngine('cloud')}
                className={`flex-1 flex items-start p-4 rounded-xl border-2 transition-all ${engine === 'cloud' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}
              >
                <Cloud className={`mt-1 mr-3 ${engine === 'cloud' ? 'text-indigo-600' : 'text-slate-400'}`} size={20} />
                <div className="text-left">
                  <div className="font-bold text-sm">Cloud Engine (Gemini)</div>
                  <div className="text-xs text-slate-500">Diarization, Emotions, Summary</div>
                </div>
              </button>
           </div>
        </div>

        {mode === 'record' ? <AudioRecorder onAudioCaptured={handleAudioReady} /> : <FileUploader onFileSelected={handleAudioReady} />}

        {audioData && (
          <div className="mt-8 flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800">
            <Button onClick={handleTranscribe} className="w-full sm:w-auto px-10 h-12" icon={<Sparkles size={18} />}>
              Generate Transcript
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
              <Sparkles size={22} />
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">EchoScript <span className="text-indigo-600 dark:text-indigo-400">AI</span></h1>
          </div>
          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-100 dark:border-green-900">
              <Shield size={12} className="mr-1.5" /> Private Mode Ready
            </div>
            <button onClick={toggleDarkMode} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
            Transcribe anything, <span className="text-indigo-600">anywhere.</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Professional AI transcription that respects your privacy. No data leaves your device in Local Mode.
          </p>
        </div>

        {error && (
          <div className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5 flex items-start text-red-800 dark:text-red-400 animate-fade-in shadow-sm">
            <AlertTriangle className="mr-4 flex-shrink-0 mt-0.5 text-red-600" size={24} />
            <div className="flex-1">
              <h4 className="font-bold mb-1">Engine Error</h4>
              <p className="text-sm opacity-90">{error}</p>
              <div className="mt-4 flex gap-3">
                <button onClick={handleReset} className="text-xs font-bold uppercase tracking-wider bg-red-100 dark:bg-red-900/40 px-3 py-1.5 rounded-lg">Try Again</button>
                {engine === 'cloud' && <button onClick={() => setEngine('local')} className="text-xs font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg">Switch to Local (No Key Needed)</button>}
              </div>
            </div>
          </div>
        )}

        {(status !== 'success' && status !== 'processing' && status !== 'loading_model') && (
          <div className="bg-white dark:bg-slate-900 p-1 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 inline-flex mb-8 w-full sm:w-auto">
            <button
                onClick={() => { setMode('record'); handleReset(); }}
                className={`flex-1 sm:flex-none flex items-center justify-center px-8 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'record' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
                <Mic size={18} className="mr-2" /> Record
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

        <div className="mt-20 flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600">
                <Shield size={12} /> Privacy Guaranteed
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-md leading-relaxed">
              EchoScript Local uses OpenAI's Whisper model running entirely in your browser. 
              No audio data or transcripts are ever uploaded to a server when using the Local Engine.
            </p>
        </div>
      </main>
    </div>
  );
}

export default App;