/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export enum Emotion {
  Happy = 'Happy',
  Sad = 'Sad',
  Angry = 'Angry',
  Neutral = 'Neutral'
}

export interface TranscriptionSegment {
  speaker: string;
  timestamp: string;
  content: string;
  language: string;
  language_code: string;
  translation?: string;
  emotion?: Emotion;
}

export interface TranscriptionResponse {
  summary: string;
  segments: TranscriptionSegment[];
}

/**
 * AppState covers all possible UI states. 
 * 'processing' is essential for showing the loading indicator during Gemini API calls.
 */
export type AppState = 'idle' | 'recording' | 'processing' | 'success' | 'error';

export interface AudioData {
  blob: Blob | File;
  base64: string;
  mimeType: string;
}
