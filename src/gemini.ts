import axios from 'axios';
import { GEMINI_API_KEY, API_ENDPOINTS } from './config.js';

interface GeminiMessage {
  role: string;
  parts: Array<{ text: string }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
}

export async function getGeminiAnalysis(prompt: string): Promise<string> {
  try {
    const response = await axios.post<GeminiResponse>(
      `${API_ENDPOINTS.gemini}/models/gemini-exp-1206:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const geminiResponse = response.data.candidates[0]?.content?.parts[0]?.text;

    if (!geminiResponse) {
      throw new Error('No response from Gemini');
    }

    return geminiResponse;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Gemini API error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        config: error.config,
        raw_response: error.response?.data
      });
      throw error;
    }
    console.error('Error getting Gemini analysis:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}
