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
  // Match both inline <code> and block-level <pre><code> tags
  const codeBlockRegex = /(?:<pre>)?<code>([\s\S]*?)<\/code>(?:<\/pre>)?/g;
  const matches = [...body.matchAll(codeBlockRegex)];
  return matches.map(match => {
    // Clean up HTML entities and common formatting issues
    return match[1]
      .trim()
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  });
}

function stripHtml(html: string): string {
  // More comprehensive HTML stripping while preserving formatting
  return html
    .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, '\n```\n$1\n```\n') // Preserve code blocks
    .replace(/<code>(.*?)<\/code>/g, '`$1`') // Preserve inline code
    .replace(/<br\s*\/?>/g, '\n') // Convert breaks to newlines
    .replace(/<\/p>/g, '\n\n') // Convert paragraph ends to double newlines
    .replace(/<[^>]+>/g, '') // Remove remaining tags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
    .trim();
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

    // Fetch both accepted and top-voted answers
    const questionIds = questions.map((q: StackOverflowQuestion) => q.question_id).join(';');
    console.error('Fetching answers for questions:', questionIds);

    const answersResponse = await axiosInstance.get<StackOverflowResponse<StackOverflowAnswer>>(
      `${API_ENDPOINTS.stackExchange.base}/questions/${questionIds}/answers`,
      {
        params: {
          ...commonParams,
          filter: STACK_EXCHANGE_CONFIG.filters.answer,
          sort: 'votes',
          pagesize: 3, // Get top 3 answers per question
          order: 'desc',
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
      // Get all answers for this question
      const questionAnswers = answers.filter((a: StackOverflowAnswer) => a.question_id === question.question_id)
        .sort((a: StackOverflowAnswer, b: StackOverflowAnswer) => (b.score || 0) - (a.score || 0));

      if (!questionAnswers.length) {
        console.error('No answers found for question:', question.title);
        return '';
      }

      // Format answers, highlighting the accepted one if it exists
      const formattedAnswers = questionAnswers.map((answer: StackOverflowAnswer) => {
        const isAccepted = answer.answer_id === question.accepted_answer_id;
        const codeBlocks = extractCodeBlocks(answer.body || '');
        const codeSection = codeBlocks.length
          ? '\nCode Snippets:\n' + codeBlocks.map(code => '```\n' + code + '\n```').join('\n')
          : '';

        return `${isAccepted ? '✓ Accepted Answer' : 'Answer'} (Score: ${answer.score || 0} | Posted: ${formatDate(answer.creation_date || 0)}):
${stripHtml(answer.body || '')}${codeSection}`;
      }).join('\n\n---\n\n');

      return `Question: ${question.title || 'Untitled'}
Score: ${question.score || 0} | Tags: ${(question.tags || []).join(', ')} | Posted: ${formatDate(question.creation_date || 0)}
${question.link || ''}

${formattedAnswers}`;
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
    return 'Error fetching Stack Overflow results. This might be due to rate limiting or network issues. Please try again later.';
  }
}
