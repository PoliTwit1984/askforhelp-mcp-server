# Second Opinion MCP Server

An MCP server that provides AI-powered assistance for coding problems by combining insights from:
- Google's Gemini AI
- Stack Overflow accepted answers
- Perplexity AI analysis

## Features

- Get detailed solutions for coding problems with context from multiple sources
- Automatic language detection from file extensions
- Code snippet extraction and formatting
- Markdown report generation for solutions
- Git-aware file context gathering

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the server:
```bash
npm run build
```

3. Configure environment variables in MCP settings:
```json
{
  "mcpServers": {
    "second-opinion": {
      "command": "node",
      "args": ["/path/to/second-opinion-server/build/index.js"],
      "env": {
        "GEMINI_API_KEY": "your-gemini-api-key",
        "PERPLEXITY_API_KEY": "your-perplexity-api-key",
        "STACK_EXCHANGE_KEY": "your-stack-exchange-key"
      }
    }
  }
}
```

Required environment variables:
- `GEMINI_API_KEY`: Google's Gemini AI API key
- `PERPLEXITY_API_KEY`: Perplexity AI API key
- `STACK_EXCHANGE_KEY`: Stack Exchange API key (optional, uses anonymous access if not provided)

## Usage

The server provides a single tool:

### get_second_opinion

Get AI-powered insights and solutions for coding problems.

**Input Schema:**
```json
{
  "goal": "string (required) - What you're trying to accomplish",
  "error": "string (optional) - Any error messages you're seeing",
  "code": "string (optional) - Relevant code context",
  "solutionsTried": "string (optional) - What solutions you've already tried",
  "filePath": "string (optional) - Path to the file with the issue"
}
```

**Example:**
```json
{
  "goal": "Fix TypeScript error in React component",
  "error": "Type '{ children: ReactNode; onClick: () => void; }' is not assignable to type 'IntrinsicAttributes'",
  "code": "interface Props {\n  onClick: () => void;\n}\n\nfunction Button({ children, onClick }: Props) {\n  return <button onClick={onClick}>{children}</button>;\n}",
  "solutionsTried": "Tried adding children to Props interface"
}
```

## Project Structure

```
src/
├── config.ts        # Configuration and API settings
├── fileUtils.ts     # File operations and language detection
├── index.ts         # Entry point
├── perplexity.ts   # Perplexity AI integration
├── server.ts       # MCP server implementation
├── stackOverflow.ts # Stack Overflow API integration
└── types.ts        # TypeScript interfaces
```

## Known Issues

See [errors.md](./errors.md) for current issues and workarounds.
