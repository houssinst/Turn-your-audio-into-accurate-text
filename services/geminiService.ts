
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionResponse } from "../types";

/**
 * Transcribes audio using Gemini 2.5 Native Audio model.
 * Optimized for natural language processing and speaker identification.
 */
export const transcribeAudio = async (
  base64Audio: string,
  mimeType: string
): Promise<TranscriptionResponse> => {
  // Use the API key from the environment. SDK requires { apiKey: ... } object.
  // Fix: Use process.env.API_KEY directly as per guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Analyze the provided audio recording and generate a professional transcript.
    
    Instructions:
    1. Summarize the overall content briefly.
    2. Transcribe the conversation accurately, capturing the dialogue word-for-word.
    3. Use speaker diarization (e.g., "Speaker 1", "Speaker 2").
    4. Provide timestamps for each segment (Format: MM:SS).
    5. Detect the language of each segment and provide an English translation if it is not English.
    6. Analyze the emotional tone (Happy, Sad, Angry, or Neutral) for each segment.

    Return the result strictly as valid JSON.
  `;

  // Clean the MIME type - ensure it's a standard IANA type the API expects.
  const cleanMimeType = mimeType.split(';')[0].toLowerCase();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-native-audio-preview-09-2025",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: cleanMimeType,
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
              description: "A summary of the audio content."
            },
            segments: {
              type: Type.ARRAY,
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
                    enum: ["Happy", "Sad", "Angry", "Neutral"]
                  },
                },
                required: ["speaker", "timestamp", "content", "language", "language_code", "emotion"]
              },
            },
          },
          required: ["summary", "segments"]
        },
      },
    });

    // Fix: Using the .text property directly as per guidelines.
    const text = response.text;
    if (!text) {
      throw new Error("The AI returned an empty response. The audio might be unsupported or too silent.");
    }

    return JSON.parse(text.trim()) as TranscriptionResponse;

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    if (error.status === 403) {
      throw new Error("Invalid API Key or permission error. Check your setup.");
    } else if (error.status === 429) {
      throw new Error("Quota exceeded. Please wait a moment before trying again.");
    } else if (error.status === 400) {
      throw new Error("The audio format is not supported or the file is corrupted.");
    }
    
    throw new Error(error.message || "An unexpected error occurred during transcription.");
  }
};
