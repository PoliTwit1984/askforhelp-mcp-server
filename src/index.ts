#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosError } from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

const GEMINI_API_KEY = 'AIzaSyAFR_iXqYj2V-9xEQTwep77OU1Xi0ZIlfc';
const PERPLEXITY_API_KEY = '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';

interface FileContext {
  path: string;
  content: string;
  language: string;
}

interface SecondOpinionArgs {
  goal: string;
  error?: string;
  code?: string;
  solutionsTried?: string;
  filePath?: string;
}

interface StackOverflowAnswer {
  answer_id: number;
  body: string;
  score: number;
  creation_date: number;
  link: string;
}

interface StackOverflowQuestion {
  title: string;
  link: string;
  score: number;
  tags: string[];
  creation_date: number;
  accepted_answer_id: number;
}

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

async function searchStackOverflow(query: string): Promise<string> {
  try {
    // First, search for questions
    const questionsResponse = await axios.get(
      'https://api.stackexchange.com/2.3/search/advanced',
      {
        params: {
          q: query,
          site: 'stackoverflow',
          order: 'desc',
          sort: 'votes',
          accepted: 'True',
          pagesize: 3,
          filter: '!9Z(-wwYGT' // Include question body, tags, and other fields
        },
      }
    );

    const questions = questionsResponse.data.items as StackOverflowQuestion[];
    if (!questions.length) return '';

    // Fetch accepted answers for these questions
    const answerIds = questions.map(q => q.accepted_answer_id).join(';');
    const answersResponse = await axios.get(
      `https://api.stackexchange.com/2.3/answers/${answerIds}`,
      {
        params: {
          site: 'stackoverflow',
          filter: '!9Z(-wzu0T' // Include answer body and other fields
        },
      }
    );

    const answers = answersResponse.data.items as StackOverflowAnswer[];
    const answersMap = new Map(answers.map(a => [a.answer_id, a]));

    // Format the results
    const results = questions.map(question => {
      const answer = answersMap.get(question.accepted_answer_id);
      if (!answer) return '';

      const codeBlocks = extractCodeBlocks(answer.body);
      const codeSection = codeBlocks.length
        ? '\nCode Snippets:\n' + codeBlocks.map(code => '```\n' + code + '\n```').join('\n')
        : '';

      return `Question: ${question.title}
Score: ${question.score} | Tags: ${question.tags.join(', ')} | Posted: ${formatDate(question.creation_date)}
${question.link}

Accepted Answer (Score: ${answer.score} | Posted: ${formatDate(answer.creation_date)}):
${answer.body.replace(/<[^>]+>/g, '')}${codeSection}
`;
    }).join('\n---\n\n');

    return results;
  } catch (error) {
    console.error('Error searching Stack Overflow:', error);
    return '';
  }
}

function isValidSecondOpinionArgs(args: unknown): args is SecondOpinionArgs {
  if (!args || typeof args !== 'object') return false;
  
  const { goal, error, code, solutionsTried, filePath } = args as any;
  
  return (
    typeof goal === 'string' &&
    (error === undefined || typeof error === 'string') &&
    (code === undefined || typeof code === 'string') &&
    (solutionsTried === undefined || typeof solutionsTried === 'string') &&
    (filePath === undefined || typeof filePath === 'string')
  );
}

async function saveResponseToMarkdown(
  args: SecondOpinionArgs,
  response: string,
  language: string
): Promise<string> {
  try {
    // Create responses directory if it doesn't exist
    const responsesDir = path.join(process.cwd(), 'responses');
    await fs.mkdir(responsesDir, { recursive: true });

    // Generate a filename based on the goal
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedGoal = args.goal
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 50);
    const filename = `${timestamp}-${sanitizedGoal}.md`;
    const filepath = path.join(responsesDir, filename);

    // Create the markdown content
    const markdown = `# ${args.goal}

## Context
${args.error ? `\n### Error\n\`\`\`\n${args.error}\n\`\`\`` : ''}
${args.code ? `\n### Code\n\`\`\`${language}\n${args.code}\n\`\`\`` : ''}
${args.solutionsTried ? `\n### Solutions Tried\n${args.solutionsTried}` : ''}
${args.filePath ? `\n### File Path\n\`${args.filePath}\`` : ''}

## Solution
${response}

---
Generated by Second Opinion MCP Server on ${new Date().toLocaleString()}
`;

    // Write the markdown file
    await fs.writeFile(filepath, markdown, 'utf-8');
    return filepath;
  } catch (error) {
    console.error('Error saving response to markdown:', error);
    return '';
  }
}

async function detectFileLanguage(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const languageMap: { [key: string]: string } = {
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
  return languageMap[ext] || 'Unknown';
}

async function findRelevantFiles(
  currentFile: string,
  errorMessage?: string
): Promise<FileContext[]> {
  const fileContexts: FileContext[] = [];
  const baseDir = path.dirname(currentFile);

  try {
    // Get the content and language of the current file
    const content = await fs.readFile(currentFile, 'utf-8');
    const language = await detectFileLanguage(currentFile);
    fileContexts.push({
      path: currentFile,
      content,
      language,
    });

    // If there's an error message, use git grep to find related files
    if (errorMessage) {
      const searchTerms = errorMessage
        .split(/[\s,.:]+/)
        .filter((term) => term.length > 3)
        .join('|');
      
      try {
        const { stdout } = await execAsync(
          `cd "${baseDir}" && git grep -l -E "${searchTerms}"`,
          { maxBuffer: 10 * 1024 * 1024 } // 10MB buffer
        );

        const relatedFiles = stdout.split('\n').filter(Boolean);
        for (const file of relatedFiles.slice(0, 5)) { // Limit to 5 related files
          if (file !== currentFile) {
            const content = await fs.readFile(path.join(baseDir, file), 'utf-8');
            const language = await detectFileLanguage(file);
            fileContexts.push({
              path: file,
              content,
              language,
            });
          }
        }
      } catch (error) {
        // Git grep failed, fallback to searching common related files
        const currentExt = path.extname(currentFile);
        const files = await fs.readdir(baseDir);
        for (const file of files) {
          if (path.extname(file) === currentExt && file !== path.basename(currentFile)) {
            const filePath = path.join(baseDir, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const language = await detectFileLanguage(filePath);
            fileContexts.push({
              path: file,
              content,
              language,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error finding relevant files:', error);
  }

  return fileContexts;
}

async function getPerplexityInsights(
  error: string,
  language: string
): Promise<string> {
  try {
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'mixtral-8x7b-instruct',
        messages: [
          {
            role: 'system',
            content: 'You are an expert software developer. Analyze the given error and programming language context to provide specific insights about common causes and solutions.',
          },
          {
            role: 'user',
            content: `Language: ${language}\nError: ${error}\n\nWhat are the most common causes of this error and their solutions?`,
          },
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error: unknown) {
    console.error('Error getting Perplexity insights:', error);
    return '';
  }
}

class SecondOpinionServer {
  private server: Server;
  private axiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: 'second-opinion-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.axiosInstance = axios.create({
      baseURL: 'https://generativelanguage.googleapis.com/v1beta',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupToolHandlers();

    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_second_opinion',
          description:
            "Get a second opinion on a coding problem using Google's Gemini AI, enhanced with Perplexity insights and Stack Overflow references",
          inputSchema: {
            type: 'object',
            properties: {
              goal: {
                type: 'string',
                description: 'What the developer is trying to accomplish',
              },
              error: {
                type: 'string',
                description: "Any error messages they're seeing",
              },
              code: {
                type: 'string',
                description: 'Relevant code context',
              },
              solutionsTried: {
                type: 'string',
                description: "What solutions they've already tried",
              },
              filePath: {
                type: 'string',
                description: 'Path to the file with the issue (for automatic context gathering)',
              },
            },
            required: ['goal'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      if (request.params.name !== 'get_second_opinion') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      if (!isValidSecondOpinionArgs(request.params.arguments)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Invalid get_second_opinion arguments'
        );
      }

      const { goal, error, code, solutionsTried, filePath } = request.params.arguments;

      // Gather additional context
      let fileContexts: FileContext[] = [];
      let perplexityInsights = '';
      let stackOverflowResults = '';
      let language = 'Unknown';

      if (filePath) {
        fileContexts = await findRelevantFiles(filePath, error);
        if (fileContexts.length > 0) {
          language = fileContexts[0].language;
        }
      }

      if (error) {
        perplexityInsights = await getPerplexityInsights(error, language);
        stackOverflowResults = await searchStackOverflow(`${error} ${language}`);
      }

      const prompt = `
        I'm a developer seeking a second opinion on a coding problem. Here's what I'm trying to accomplish:

        ${goal}

        ${
          error
            ? `I'm encountering the following error:

        ${error}

        Perplexity AI Analysis:
        ${perplexityInsights}

        Related Stack Overflow Discussions:
        ${stackOverflowResults}`
            : ''
        }

        ${
          code
            ? `Here's the relevant code:

        \`\`\`${language}
        ${code}
        \`\`\``
            : ''
        }

        ${
          fileContexts.length > 0
            ? `Related files and their contents:

        ${fileContexts
          .map(
            (ctx) => `File: ${ctx.path} (${ctx.language})
        \`\`\`${ctx.language}
        ${ctx.content}
        \`\`\`
        `
          )
          .join('\n')}`
            : ''
        }

        ${
          solutionsTried
            ? `I've already tried these solutions:

        ${solutionsTried}`
            : ''
        }

        Based on the ${language} context and best practices, could you provide insights and suggestions to help move forward? Please be specific and detailed in your response, considering:
        1. Common pitfalls in ${language} development
        2. Best practices for this type of implementation
        3. Performance considerations
        4. Testing strategies
        5. Alternative approaches
      `;

      try {
        const response = await this.axiosInstance.post(
          `/models/gemini-exp-1206:generateContent?key=${GEMINI_API_KEY}`,
          {
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }],
              },
            ],
          }
        );

        const geminiResponse =
          response.data.candidates[0]?.content?.parts[0]?.text;

        if (!geminiResponse) {
          throw new Error('No response from Gemini');
        }

        // Save the response to a markdown file
        const markdownPath = await saveResponseToMarkdown(
          request.params.arguments,
          geminiResponse,
          language
        );

        return {
          content: [
            {
              type: 'text',
              text: geminiResponse + (markdownPath ? `\n\nResponse saved to: ${markdownPath}` : ''),
            },
          ],
        };
      } catch (error) {
        if (axios.isAxiosError(error)) {
          return {
            content: [
              {
                type: 'text',
                text: `Gemini API error: ${
                  error.response?.data.error?.message ?? error.message
                }`,
              },
            ],
            isError: true,
          };
        }
        throw error;
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Second Opinion MCP server running on stdio');
  }
}

const server = new SecondOpinionServer();
server.run().catch(console.error);
