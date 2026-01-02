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
  // Initialize AI using the environment variable. 
  // Ensure your deployment includes API_KEY in the environment settings.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

    // Access the text property directly (it's a getter, not a method)
    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("Empty response from AI. Try a longer audio segment.");
    }

    return JSON.parse(textOutput.trim()) as TranscriptionResponse;

  } catch (error: any) {
    console.error("Transcription API Error:", error);
    
    if (error.status === 403) {
      throw new Error("Authentication failed. Please verify that the API key is correctly set in your environment variables.");
    } else if (error.status === 429) {
      throw new Error("Rate limit exceeded. Please wait a few moments.");
    }
    
    throw new Error(error.message || "Failed to process audio. Please try again with a different file.");
  }
};