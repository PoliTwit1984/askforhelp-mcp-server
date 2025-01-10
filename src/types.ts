export interface FileContext {
  path: string;
  content: string;
  language: string;
}

export interface SecondOpinionArgs {
  goal: string;
  error?: string;
  code?: string;
  solutionsTried?: string;
  filePath?: string;
}

export interface StackOverflowAnswer {
  answer_id: number;
  question_id: number;
  body: string;
  score: number;
  creation_date: number;
  link: string;
}

export interface StackOverflowQuestion {
  question_id: number;
  title: string;
  link: string;
  score: number;
  tags: string[];
  creation_date: number;
  accepted_answer_id: number;
}

export interface StackOverflowResponse<T> {
  items: T[];
  has_more: boolean;
  quota_max: number;
  quota_remaining: number;
  total: number;
}

export interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}
