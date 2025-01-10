import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import { SecondOpinionArgs, FileContext } from './types.js';
import { API_ENDPOINTS } from './config.js';
import { searchStackOverflow } from './stackOverflow.js';
import { getPerplexityInsights } from './perplexity.js';
import { getGeminiAnalysis } from './gemini.js';
import { findRelevantFiles, saveResponseToMarkdown } from './fileUtils.js';

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

export class SecondOpinionServer {
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
      baseURL: API_ENDPOINTS.gemini,
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
        const geminiResponse = await getGeminiAnalysis(prompt);
        
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
