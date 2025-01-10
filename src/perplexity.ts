import axios from 'axios';
import { PERPLEXITY_API_KEY, API_ENDPOINTS } from './config.js';

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function getPerplexityInsights(
  error: string,
  language: string
): Promise<string> {
  try {
    const messages: PerplexityMessage[] = [
      {
        role: 'system',
        content: 'You are an expert software developer. Analyze the given error and programming language context to provide specific insights about common causes and solutions.',
      },
      {
        role: 'user',
        content: `Language: ${language}\nError: ${error}\n\nWhat are the most common causes of this error and their solutions?`,
      },
    ];

    const response = await axios.post<PerplexityResponse>(
      API_ENDPOINTS.perplexity,
      {
        model: 'mixtral-8x7b-instruct',
        messages,
      },
      {
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0]?.message.content ?? '';
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Perplexity API error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
    } else {
      console.error('Error getting Perplexity insights:', error);
    }
    return '';
  }
}
