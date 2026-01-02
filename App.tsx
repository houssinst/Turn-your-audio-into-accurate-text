/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { Mic, Upload, Sparkles, AlertTriangle, Moon, Sun, RotateCcw } from 'lucide-react';
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

  const handleAudioReady = (data: AudioData) => {
    setAudioData(data);
    setError(null);
    setResult(null);
    setStatus('idle');
  };

  const handleTranscribe = async () => {
    if (!audioData) return;

    setStatus('processing');
    setError(null);

    try {
      const data = await transcribeAudio(audioData.base64, audioData.mimeType);
      setResult(data);
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during transcription.");
      setStatus('error');
    }
  };

  const handleReset = () => {
    setAudioData(null);
    setResult(null);
    setStatus('idle');
    setError(null);
  };

  // Improved rendering logic to solve TS narrowing issues (TS2367)
  const renderMainSection = () => {
    if (status === 'processing') {
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
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Analyzing Audio...</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Our AI is identifying speakers and processing timestamps. This takes just a few seconds.
          </p>
        </div>
      );
    }

    if (result && status === 'success') {
      return (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Transcription Results</h2>
            <Button onClick={handleReset} variant="secondary">Start Over</Button>
          </div>
          <TranscriptionDisplay data={result} />
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 animate-fade-in">
        {mode === 'record' ? (
          <AudioRecorder onAudioCaptured={handleAudioReady} />
        ) : (
          <FileUploader onFileSelected={handleAudioReady} />
        )}

        {audioData && (
          <div className="mt-6 flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800">
            <Button 
              onClick={handleTranscribe} 
              className="w-full sm:w-auto"
              icon={<Sparkles size={16} />}
            >
              Generate Transcript
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-500/30">
              <Sparkles size={20} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">
              EchoScript AI
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
              Powered by Gemini Native Audio
            </div>
            <button
              onClick={toggleDarkMode}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
            Professional Transcription for Everyone
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Upload files or record directly. Get accurate speaker identification, timestamps, and emotional analysis instantly.
          </p>
        </div>

        {error && (
          <div className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5 flex items-start text-red-800 dark:text-red-400 shadow-sm animate-fade-in">
            <AlertTriangle className="mr-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-500" size={24} />
            <div className="flex-1">
              <h4 className="font-bold mb-1">Transcription Error</h4>
              <p className="text-sm leading-relaxed opacity-90">{error}</p>
              <button 
                onClick={handleReset}
                className="mt-3 flex items-center text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-300 hover:underline"
              >
                <RotateCcw size={12} className="mr-1" />
                Reset & Try Again
              </button>
            </div>
          </div>
        )}

        {status !== 'success' && status !== 'processing' && (
          <div className="bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 inline-flex mb-8 w-full sm:w-auto">
            <button
                onClick={() => { setMode('record'); handleReset(); }}
                className={`flex-1 sm:flex-none flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'record' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
            >
                <Mic size={16} className="mr-2" />
                Record
            </button>
            <button
                onClick={() => { setMode('upload'); handleReset(); }}
                className={`flex-1 sm:flex-none flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'upload' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
            >
                <Upload size={16} className="mr-2" />
                Upload
            </button>
          </div>
        )}

        <div className="space-y-8">
          {renderMainSection()}
        </div>

        <div className="mt-16 text-center text-xs text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed border-t border-slate-200 dark:border-slate-800 pt-8 transition-colors duration-300">
            <p className="mb-2">
            Usage of AI services is subject to the provider's <a href="https://policies.google.com/terms/generative-ai/use-policy" target="_blank" rel="noopener noreferrer" className="underline">Prohibited Use Policy</a>.
            </p>
        </div>
      </main>
    </div>
  );
}

export default App;