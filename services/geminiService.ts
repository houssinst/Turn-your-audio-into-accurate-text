/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionSegment } from "../types";

// Explicitly declare process for environments where @types/node might not be indexed correctly by tsc
declare var process: any;

export const transcribeAudio = async (
  base64Audio: string,
  mimeType: string
): Promise<{ segments: TranscriptionSegment[]; summary: string }> => {
  // Access the API Key. Note: In Vite, this is replaced at build time via the define config.
  const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : undefined;

  if (!apiKey || apiKey === "") {
    throw new Error("API Key is missing. Please ensure the API_KEY environment variable is set during the build process.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    You are an expert audio transcription assistant.
    Process the provided audio file and generate a detailed transcription.
    
    Requirements:
    1. Identify distinct speakers (Speaker 1, Speaker 2, etc.).
    2. Provide accurate timestamps (Format: MM:SS).
    3. Detect the primary language of each segment.
    4. Provide English translation if the segment is not in English.
    5. Identify speaker emotion: Happy, Sad, Angry, or Neutral.
    6. Provide a brief summary of the entire audio.
  `;

  try {
    // Using gemini-2.5-flash-native-audio-preview-09-2025 as it is optimized for audio tasks
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-native-audio-preview-09-2025",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "A concise summary of the audio content.",
            },
            segments: {
              type: Type.ARRAY,
              description: "List of transcribed segments.",
              items: {
                type: Type.OBJECT,
                properties: {
                  speaker: { type: Type.STRING },
                  timestamp: { type: Type.STRING },
                  content: { type: Type.STRING },
                  language: { type: Type.STRING },
                  language_code: { type: Type.STRING },
                  translation: { type: Type.STRING },
                  emotion: { 
                    type: Type.STRING, 
                    description: "The emotion of the speaker.",
                    enum: ["Happy", "Sad", "Angry", "Neutral"]
                  },
                },
                required: ["speaker", "timestamp", "content", "language", "language_code", "emotion"],
              },
            },
          },
          required: ["summary", "segments"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("The model returned an empty response. The audio might be too short or contains no detectable speech.");
    }

    return JSON.parse(text);

  } catch (error: any) {
    console.error("Gemini Transcription Error:", error);
    
    // Bubble up a descriptive error message
    if (error.message?.includes('403')) {
      throw new Error("Permission denied (403). Your API Key might be invalid or doesn't have access to this model.");
    } else if (error.message?.includes('429')) {
      throw new Error("Rate limit exceeded (429). Please wait a moment before trying again.");
    } else if (error.message?.includes('400')) {
      throw new Error("Bad Request (400). This often means the audio format or size is not supported.");
    }
    
    throw error;
  }
};