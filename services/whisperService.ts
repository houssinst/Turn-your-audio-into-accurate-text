
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { TranscriptionResponse, Emotion } from "../types";

let transcriber: any = null;

/**
 * Transcribes audio locally using Whisper Tiny (via transformers.js).
 * Runs entirely in the browser, requiring no API key.
 */
export const transcribeLocally = async (
  audioFile: Blob | File,
  onProgress?: (progress: number) => void
): Promise<TranscriptionResponse> => {
  try {
    // Dynamic import of the library from node_modules
    const { pipeline, env } = await import('@xenova/transformers');

    // Configure env to allow local loading if needed, though default is fine for most cases
    env.allowLocalModels = false;
    env.useBrowserCache = true;

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

    return {
      summary: "Transcription generated locally using OpenAI Whisper (Tiny). Your data stayed on your device.",
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
    throw new Error("Local AI failed to initialize. Make sure you have enough disk space for the AI model (approx 40MB).");
  }
};

function formatTimestamp(seconds: number): string {
  if (isNaN(seconds) || seconds === null) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
