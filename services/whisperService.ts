/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { TranscriptionResponse, Emotion } from "../types";

let transcriber: any = null;

/**
 * Transcribes audio locally using Whisper Tiny (via transformers.js).
 * Requires no API key and runs entirely in the browser.
 */
export const transcribeLocally = async (
  audioFile: Blob | File,
  onProgress?: (progress: number) => void
): Promise<TranscriptionResponse> => {
  try {
    // Dynamic import to keep main bundle light
    const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');

    if (!transcriber) {
      transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
        progress_callback: (info: any) => {
          if (info.status === 'progress' && onProgress) {
            onProgress(info.progress);
          }
        }
      });
    }

    // Convert audio to 16k mono float32 for Whisper
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Convert to mono if needed
    let float32Data = audioBuffer.getChannelData(0);
    if (audioBuffer.numberOfChannels > 1) {
      const channel2 = audioBuffer.getChannelData(1);
      const mono = new Float32Array(float32Data.length);
      for (let i = 0; i < float32Data.length; i++) {
        mono[i] = (float32Data[i] + channel2[i]) / 2;
      }
      float32Data = mono;
    }

    const result = await transcriber(float32Data, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true
    });

    // Format Whisper output to match our app's TranscriptionResponse type
    return {
      summary: "Transcription generated locally using Whisper AI. No data was sent to the cloud.",
      segments: result.chunks.map((chunk: any) => ({
        speaker: "Speaker",
        timestamp: formatTimestamp(chunk.timestamp[0]),
        content: chunk.text.trim(),
        language: "English",
        language_code: "en",
        emotion: Emotion.Neutral
      }))
    };
  } catch (error: any) {
    console.error("Local Transcription Error:", error);
    throw new Error("Could not initialize local AI. Ensure your browser is up to date and you have a stable connection for the first load.");
  }
};

function formatTimestamp(seconds: number): string {
  if (isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}