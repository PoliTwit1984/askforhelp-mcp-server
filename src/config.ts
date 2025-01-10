// API Keys
if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}
if (!process.env.PERPLEXITY_API_KEY) {
  throw new Error('PERPLEXITY_API_KEY environment variable is required');
}

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

// Stack Exchange API Configuration
export const STACK_EXCHANGE_CONFIG = {
  site: 'stackoverflow',
  pageSize: 3,
  filters: {
    // Default filter that includes basic fields
    question: 'default',
    // Default filter that includes basic fields
    answer: 'default',
  },
  timeout: 10000, // 10 seconds
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  perplexity: 'https://api.perplexity.ai/chat/completions',
  stackExchange: {
    base: 'https://api.stackexchange.com/2.3',
    search: '/search/advanced',
    answers: '/answers',
  },
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
} as const;

// Language Map for File Extensions
export type FileExtension = '.js' | '.ts' | '.jsx' | '.tsx' | '.py' | '.rb' | '.java' | '.go' | '.rs' | '.cpp' | '.c' | '.cs' | '.php' | '.swift' | '.kt' | '.scala' | '.html' | '.css' | '.scss' | '.sql';

export const LANGUAGE_MAP: Record<FileExtension, string> = {
  '.js': 'JavaScript',
  '.ts': 'TypeScript',
  '.jsx': 'React/JavaScript',
  '.tsx': 'React/TypeScript',
  '.py': 'Python',
  '.rb': 'Ruby',
  '.java': 'Java',
  '.go': 'Go',
  '.rs': 'Rust',
  '.cpp': 'C++',
  '.c': 'C',
  '.cs': 'C#',
  '.php': 'PHP',
  '.swift': 'Swift',
  '.kt': 'Kotlin',
  '.scala': 'Scala',
  '.html': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.sql': 'SQL',
};
