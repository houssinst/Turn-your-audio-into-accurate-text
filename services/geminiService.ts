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
  // Use the API key from the environment
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Simplified and direct prompt for higher success rate
  const prompt = `
    Analyze the provided audio recording. 
    1. Summarize the content.
    2. Transcribe the conversation word-for-word.
    3. Identify different speakers (Speaker 1, Speaker 2, etc.).
    4. Provide timestamps in MM:SS format.
    5. Detect emotion for each speaker segment.
    6. Provide English translation for non-English parts.
    
    Output MUST be in the specified JSON format.
  `;

  // Clean the MIME type - some browsers send extended strings like 'audio/webm;codecs=opus'
  const cleanMimeType = mimeType.split(';')[0];

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
              description: "Brief summary of the audio content."
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

    const text = response.text;
    if (!text) {
      throw new Error("The AI model returned an empty transcript. The audio might be silent or too short.");
    }

    try {
      return JSON.parse(text.trim()) as TranscriptionResponse;
    } catch (parseError) {
      console.error("JSON Parsing failed for text:", text);
      throw new Error("Failed to read the transcription result. Please try recording a bit longer.");
    }

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    const status = error?.status;
    if (status === 403) {
      throw new Error("API Key Authentication failed. Please check your deployment settings.");
    } else if (status === 429) {
      throw new Error("Transcription rate limit reached. Please wait a moment.");
    } else if (status === 400) {
      throw new Error("The audio file format is not supported by the AI. Try a standard format like WAV or MP3.");
    }
    
    throw new Error(error.message || "Transcription failed due to a network or server error.");
  }
};