// API Keys
export const GEMINI_API_KEY = 'AIzaSyAFR_iXqYj2V-9xEQTwep77OU1Xi0ZIlfc';
export const PERPLEXITY_API_KEY = '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';

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
export const LANGUAGE_MAP: { [key: string]: string } = {
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
} as const;
