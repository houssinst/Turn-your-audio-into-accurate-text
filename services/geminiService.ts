/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionResponse } from "../types";

/**
 * Transcribes audio using Gemini 2.5 Native Audio model.
 */
export const transcribeAudio = async (
  base64Audio: string,
  mimeType: string
): Promise<TranscriptionResponse> => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("Cloud Engine Error: No API Key found in environment variables. Please add 'API_KEY' to your environment secrets or use 'Local Engine'.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Analyze the provided audio recording and generate a professional transcript.
    
    Instructions:
    1. Summarize the content concisely in the 'summary' field.
    2. Identify and label speakers (e.g., Speaker 1, Speaker 2).
    3. Provide timestamps in MM:SS format for each dialogue segment.
    4. Detect the primary language of each segment and translate to English if needed.
    5. Categorize the emotion as Happy, Sad, Angry, or Neutral.

    Output format MUST be strictly JSON.
  `;

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
            summary: { type: Type.STRING },
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

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("Cloud Engine returned an empty response.");
    }

    return JSON.parse(textOutput.trim()) as TranscriptionResponse;

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.status === 403) {
      throw new Error("Cloud Engine: Invalid API Key. Please verify your credentials.");
    }
    throw new Error(error.message || "Cloud Engine failed to process audio.");
  }
};