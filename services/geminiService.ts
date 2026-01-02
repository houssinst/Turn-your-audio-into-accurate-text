/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionSegment } from "../types";

export const transcribeAudio = async (
  base64Audio: string,
  mimeType: string
): Promise<{ segments: TranscriptionSegment[]; summary: string }> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please configure process.env.API_KEY.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    You are an expert audio transcription assistant.
    Process the provided audio file and generate a detailed transcription.
    
    Requirements:
    1. Identify distinct speakers.
    2. Provide accurate timestamps (Format: MM:SS).
    3. Detect the primary language of each segment.
    4. Provide English translation if the segment is not in English.
    5. Identify speaker emotion: Happy, Sad, Angry, or Neutral.
    6. Provide a brief summary of the entire audio.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
                  translation:  { type: Type.STRING },
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
    if (!text) throw new Error("No response text received from Gemini.");

    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Transcription Error:", error);
    throw error;
  }
};