
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Upload, Sparkles, AlertTriangle, Moon, Sun, RotateCcw, Shield, Zap, History, Globe } from 'lucide-react';
import AudioRecorder from './components/AudioRecorder';
import FileUploader from './components/FileUploader';
import TranscriptionDisplay from './components/TranscriptionDisplay';
import Button from './components/Button';
import { transcribeAudio } from './services/geminiService';
import { AudioData, TranscriptionResponse, AppState } from './types';

function App() {
  const [mode, setMode] = useState<'record' | 'upload'>('record');
  const [selectedLang, setSelectedLang] = useState<'en-US' | 'ar-SA'>('en-US');
  const [status, setStatus] = useState<AppState>('idle');
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [result, setResult] = useState<TranscriptionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<{ final: string; interim: string }>({ final: '', interim: '' });
  
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll the live transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [liveTranscript]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const handleLiveUpdate = (text: { final: string; interim: string }) => {
    setLiveTranscript(text);
    if (status !== 'recording') setStatus('recording');
  };

  const handleNativeTranscript = (transcript: string) => {
    setStatus('success');
    setResult({
      summary: selectedLang === 'ar-SA' 
        ? "تم التقاط النص مباشرة باستخدام معالجة الكلام الأصلية. استخدم الذكاء الاصطناعي لتحسينه وتحليله."
        : "Transcript captured live using native speech processing. Use AI to refine and analyze.",
      segments: [{
        speaker: selectedLang === 'ar-SA' ? "متحدث" : "Speaker",
        timestamp: "00:00",
        content: transcript,
        language: selectedLang === 'ar-SA' ? "Arabic" : "English",
        language_code: selectedLang === 'ar-SA' ? "ar" : "en",
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
      const data = await transcribeAudio(audioData.base64, audioData.mimeType, selectedLang);
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
    setLiveTranscript({ final: '', interim: '' });
  };

  const isRTL = selectedLang === 'ar-SA';

  const renderContent = () => {
    if (status === 'processing') {
      return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-12 text-center animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 border-4 border-indigo-100 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin"></div>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-tight">
            {isRTL ? "تحسين بالذكاء الاصطناعي" : "AI Enhancement"}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {isRTL ? "...تلخيص وتحليل المشاعر عبر Gemini" : "Summarizing and analyzing speaker sentiments via Gemini..."}
          </p>
        </div>
      );
    }

    if (result && status === 'success') {
      return (
        <div className="animate-fade-in">
          <div className={`flex justify-between items-center mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <History className="text-indigo-600" size={20} />
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                {isRTL ? "النتائج" : "Results"}
              </h2>
            </div>
            <Button onClick={handleReset} variant="secondary" icon={<RotateCcw size={16} />}>
              {isRTL ? "جلسة جديدة" : "New Session"}
            </Button>
          </div>
          <TranscriptionDisplay data={result} />
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 animate-fade-in transition-all">
        {mode === 'record' ? (
          <div className="space-y-6">
            <div className="flex justify-center mb-4">
              <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl inline-flex">
                <button 
                  onClick={() => setSelectedLang('en-US')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedLang === 'en-US' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500'}`}
                >
                  English
                </button>
                <button 
                  onClick={() => setSelectedLang('ar-SA')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedLang === 'ar-SA' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500'}`}
                >
                  العربية
                </button>
              </div>
            </div>

            <AudioRecorder 
              onAudioCaptured={handleAudioReady} 
              onTranscriptCaptured={handleNativeTranscript}
              onLiveUpdate={handleLiveUpdate}
              lang={selectedLang}
            />
            
            {/* Live Visual Transcript Box */}
            {(liveTranscript.final || liveTranscript.interim) && (
              <div className="mt-8 animate-fade-in">
                <div className={`flex items-center justify-between mb-3 px-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">
                    {isRTL ? "نسخ مباشر" : "Real-Time Transcription"}
                  </span>
                  {status === 'recording' && <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>}
                </div>
                <div 
                  ref={scrollRef}
                  className="bg-slate-50 dark:bg-slate-950 rounded-xl p-5 border border-slate-100 dark:border-slate-800 min-h-[120px] max-h-[250px] overflow-y-auto shadow-inner"
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  <p className={`text-slate-800 dark:text-slate-200 leading-relaxed ${isRTL ? 'text-lg' : 'text-sm'}`}>
                    <span className="font-medium">{liveTranscript.final}</span>
                    <span className="text-slate-400 dark:text-slate-500 italic transition-all duration-300">
                      {liveTranscript.interim}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <FileUploader onFileSelected={handleAudioReady} />
        )}

        {audioData && (
          <div className={`mt-8 flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button onClick={handleCloudTranscribe} className="w-full sm:w-auto px-10 h-12 text-base shadow-indigo-200 dark:shadow-none" icon={<Sparkles size={18} />}>
              {isRTL ? "تحليل متقدم بالذكاء الاصطناعي" : "Advanced AI Analysis"}
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
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight leading-tight uppercase">
            {isRTL ? <>نسخ <span className="text-indigo-600">مباشر.</span></> : <>Live <span className="text-indigo-600">Transcribe.</span></>}
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            {isRTL 
              ? "استمتع بتجربة تعرف على الكلام بسرعة البرق واستهلاك صفر للذاكرة، مع الحفاظ على خصوصية بياناتك على جهازك."
              : "Experience lightning-fast, zero-memory speech recognition that stays on your device."
            }
          </p>
        </div>

        {error && (
          <div className={`mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5 flex items-start text-red-800 dark:text-red-400 animate-fade-in shadow-sm ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
            <AlertTriangle className={`${isRTL ? 'ml-4' : 'mr-4'} flex-shrink-0 mt-0.5 text-red-600`} size={24} />
            <div className="flex-1">
              <h4 className="font-bold mb-1 uppercase tracking-tight">{isRTL ? "رسالة النظام" : "System Message"}</h4>
              <p className="text-sm opacity-90">{error}</p>
              <button onClick={handleReset} className="mt-3 text-xs font-bold uppercase tracking-wider bg-red-100 dark:bg-red-900/40 px-3 py-1.5 rounded-lg">
                {isRTL ? "تجاهل" : "Dismiss"}
              </button>
            </div>
          </div>
        )}

        {(status !== 'success' && status !== 'processing') && (
          <div className={`bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 inline-flex mb-8 w-full sm:w-auto ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
                onClick={() => { setMode('record'); handleReset(); }}
                className={`flex-1 sm:flex-none flex items-center justify-center px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'record' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
                <Mic size={16} className={`${isRTL ? 'ml-2' : 'mr-2'}`} /> {isRTL ? "الوضع المباشر" : "Live Mode"}
            </button>
            <button
                onClick={() => { setMode('upload'); handleReset(); }}
                className={`flex-1 sm:flex-none flex items-center justify-center px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'upload' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
                <Upload size={16} className={`${isRTL ? 'ml-2' : 'mr-2'}`} /> {isRTL ? "وضع الملفات" : "File Mode"}
            </button>
          </div>
        )}

        <div className="space-y-8">
          {renderContent()}
        </div>

        <div className="mt-20 flex flex-col items-center gap-6 text-center">
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 dark:bg-slate-900 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">
                <Shield size={14} className="text-indigo-600" /> {isRTL ? "محرك محلي خاص" : "Private Native Engine"}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm leading-relaxed">
              {isRTL 
                ? "يستخدم النسخ تقنية Web Speech الموجودة في جهازك. لن يغادر صوتك متصفحك أبداً إلا إذا اخترت \"تحليل متقدم بالذكاء الاصطناعي\"."
                : "Transcription uses on-device Web Speech technology. Your audio never leaves this browser tab unless you choose \"Advanced AI Analysis\"."
              }
            </p>
        </div>
      </main>
    </div>
  );
}

export default App;
