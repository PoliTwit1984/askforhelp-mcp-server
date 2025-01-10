import axios from 'axios';
import { 
  StackOverflowAnswer, 
  StackOverflowQuestion, 
  StackOverflowResponse 
} from './types.js';
import { 
  STACK_EXCHANGE_CONFIG, 
  API_ENDPOINTS 
} from './config.js';

// Configure axios defaults for Stack Exchange API
const axiosInstance = axios.create({
  timeout: STACK_EXCHANGE_CONFIG.timeout,
});

function extractCodeBlocks(body: string): string[] {
  const codeBlockRegex = /<code>([\s\S]*?)<\/code>/g;
  const matches = [...body.matchAll(codeBlockRegex)];
  return matches.map(match => match[1].trim());
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export async function searchStackOverflow(query: string): Promise<string> {
  try {
    console.error('Searching Stack Overflow for:', query);
    
    // Common params for all requests
    const commonParams = {
      site: STACK_EXCHANGE_CONFIG.site,
    };
    
    // First, search for questions
    console.error('Making questions request...');
    const questionsResponse = await axiosInstance.get<StackOverflowResponse<StackOverflowQuestion>>(
      'https://api.stackexchange.com/2.3/search/advanced',
      {
        params: {
          ...commonParams,
          q: query,
          order: 'desc',
          sort: 'votes',
          accepted: true,
          pagesize: STACK_EXCHANGE_CONFIG.pageSize,
          filter: STACK_EXCHANGE_CONFIG.filters.question,
        },
      }
    );

    console.error('Stack Overflow questions response:', {
      has_more: questionsResponse.data.has_more,
      quota_max: questionsResponse.data.quota_max,
      quota_remaining: questionsResponse.data.quota_remaining,
      total: questionsResponse.data.total,
      items_count: questionsResponse.data.items?.length,
      raw_response: questionsResponse.data,
    });

    const questions = questionsResponse.data.items;
    if (!questions?.length) {
      console.error('No Stack Overflow questions found');
      return '';
    }

    // Fetch accepted answers
    const answerIds = questions.map((q: StackOverflowQuestion) => q.accepted_answer_id).filter(Boolean).join(';');
    if (!answerIds) {
      console.error('No answer IDs found');
      return '';
    }
    console.error('Fetching answers for IDs:', answerIds);

    const answersResponse = await axiosInstance.get<StackOverflowResponse<StackOverflowAnswer>>(
      `https://api.stackexchange.com/2.3/answers/${answerIds}`,
      {
        params: {
          ...commonParams,
          filter: STACK_EXCHANGE_CONFIG.filters.answer,
        },
      }
    );

    console.error('Stack Overflow answers response:', {
      has_more: answersResponse.data.has_more,
      quota_max: answersResponse.data.quota_max,
      quota_remaining: answersResponse.data.quota_remaining,
      total: answersResponse.data.total,
      items_count: answersResponse.data.items?.length,
      raw_response: answersResponse.data,
    });

    const answers = answersResponse.data.items;
    if (!answers?.length) {
      console.error('No answers found');
      return '';
    }

    const answersMap = new Map(answers.map((a: StackOverflowAnswer) => [a.answer_id, a]));

    // Format the results
    const results = questions.map((question: StackOverflowQuestion) => {
      const answer = answersMap.get(question.accepted_answer_id);
      if (!answer) {
        console.error('No answer found for question:', question.title);
        return '';
      }

      const codeBlocks = extractCodeBlocks(answer.body || '');
      console.error('Found code blocks:', codeBlocks.length);

      const codeSection = codeBlocks.length
        ? '\nCode Snippets:\n' + codeBlocks.map(code => '```\n' + code + '\n```').join('\n')
        : '';

      return `Question: ${question.title || 'Untitled'}
Score: ${question.score || 0} | Tags: ${(question.tags || []).join(', ')} | Posted: ${formatDate(question.creation_date || 0)}
${question.link || ''}

Accepted Answer (Score: ${answer.score || 0} | Posted: ${formatDate(answer.creation_date || 0)}):
${(answer.body || '').replace(/<[^>]+>/g, '')}${codeSection}
`;
    }).filter(Boolean).join('\n---\n\n');

    return results || 'No relevant Stack Overflow results found.';
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Stack Overflow API error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        config: error.config,
      });
    } else {
      console.error('Error searching Stack Overflow:', error);
    }
    return '';
  }
}
