/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionResponse } from "../types";

/**
 * Transcribes audio using Gemini 2.5 Native Audio model.
 * It identifies speakers, timestamps, and emotional sentiment.
 */
export const transcribeAudio = async (
  base64Audio: string,
  mimeType: string
): Promise<TranscriptionResponse> => {
  // Use process.env.API_KEY directly as required by the Gemini SDK guidelines.
  // The client is created inside the function to ensure the latest API key is used.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Analyze this audio file and return a JSON object with a 'summary' string and an array of 'segments'.
    Each segment must include: 'speaker' (e.g. "Speaker 1"), 'timestamp' (MM:SS), 'content' (the transcribed text), 
    'language', 'language_code', and 'emotion' (Happy, Sad, Angry, or Neutral).
    If a segment is not in English, provide an English 'translation'.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-native-audio-preview-09-2025",
      contents: {
        parts: [
          {
            inlineData: {
              // Extract base MIME type (e.g., audio/webm) for the API
              mimeType: mimeType.split(';')[0],
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
              description: "A comprehensive summary of the conversation or audio content."
            },
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  speaker: { 
                    type: Type.STRING,
                    description: "Identifier for the person speaking."
                  },
                  timestamp: { 
                    type: Type.STRING,
                    description: "The start time of this segment in MM:SS format."
                  },
                  content: { 
                    type: Type.STRING,
                    description: "The exact transcription of the spoken words."
                  },
                  language: { 
                    type: Type.STRING,
                    description: "The primary language spoken in this segment."
                  },
                  language_code: { 
                    type: Type.STRING,
                    description: "The ISO 639-1 code for the language (e.g., 'en')."
                  },
                  translation: { 
                    type: Type.STRING,
                    description: "An English translation of the content, if needed."
                  },
                  emotion: { 
                    type: Type.STRING,
                    description: "One of: Happy, Sad, Angry, Neutral."
                  },
                },
                required: ["speaker", "timestamp", "content", "language", "language_code", "emotion"],
                propertyOrdering: ["speaker", "timestamp", "content", "language", "language_code", "emotion", "translation"]
              },
            },
          },
          required: ["summary", "segments"],
          propertyOrdering: ["summary", "segments"]
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("The AI model returned an empty response. The audio might be unsupported or too short.");
    }

    try {
      return JSON.parse(text.trim()) as TranscriptionResponse;
    } catch (parseError) {
      console.error("JSON Parse Error:", text);
      throw new Error("Failed to interpret the transcription format. Please try again.");
    }

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    const message = error.message || "";
    if (message.includes('403')) {
      throw new Error("Authentication failed: Ensure your Gemini API Key is valid and project billing is active.");
    } else if (message.includes('429')) {
      throw new Error("Rate limit exceeded: Please wait a minute before starting another transcription.");
    } else if (message.includes('400')) {
      throw new Error("Invalid request: Check if the audio file is corrupted or in an unsupported format.");
    }
    
    throw new Error(`Transcription process failed: ${message || "An unexpected error occurred."}`);
  }
};
