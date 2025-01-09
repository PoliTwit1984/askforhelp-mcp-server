# Second Opinion MCP Server

An MCP server that provides AI-powered assistance for coding problems using Google's Gemini AI, enhanced with Perplexity insights and Stack Overflow references.

## Features

### Multi-AI Analysis
- Primary insights from Google's Gemini AI
- Additional analysis from Perplexity AI
- Relevant Stack Overflow references

### Automatic Context Gathering
- File content analysis
- Related file discovery through git grep
- Language detection
- Smart file searching

### Response Archiving
- Automatically saves responses as markdown files
- Organizes by timestamp and query
- Includes full context (goal, error, code, solutions tried)
- Creates a searchable knowledge base

## Usage

The server provides a single tool `get_second_opinion` that accepts:

```typescript
{
  goal: string;           // Required: What you're trying to accomplish
  error?: string;         // Optional: Any error messages
  code?: string;          // Optional: Relevant code context
  solutionsTried?: string; // Optional: Previous attempts
  filePath?: string;      // Optional: Path to file for automatic context gathering
}
```

### Example Query

Here's a real example of using the server to solve a React useEffect cleanup issue:

```typescript
use_mcp_tool({
  server_name: "second-opinion",
  tool_name: "get_second_opinion",
  arguments: {
    goal: "Fix a React useEffect cleanup issue",
    error: "Warning: Can't perform a React state update on an unmounted component. This is a no-op, but it indicates a memory leak in your application.",
    code: `function DataFetcher() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('https://api.example.com/data')
      .then(res => res.json())
      .then(json => setData(json));
  }, []);

  return <div>{data ? JSON.stringify(data) : 'Loading...'}</div>;
}`,
    solutionsTried: "I tried adding a return function to useEffect but still getting the warning sometimes"
  }
})
```

### Example Response

The server combines insights from multiple sources to provide a comprehensive solution:

#### Perplexity AI Analysis
```
Common causes for this warning in React:
1. Asynchronous operations continuing after component unmount
2. Missing or incorrect cleanup in useEffect
3. State updates on unmounted components
4. Race conditions with multiple async operations

The warning typically occurs when async operations like API calls or timers try to update state after the component is no longer in the DOM.
```

#### Stack Overflow References
```
Related discussions:
1. "React setState warning - Can't perform a React state update on an unmounted component"
   Shows patterns for proper cleanup with useEffect and async operations

2. "How to cancel fetch requests in useEffect cleanup"
   Demonstrates using AbortController for proper fetch cleanup

3. "Best practices for handling async operations in React components"
   Covers patterns for managing component lifecycle with async operations
```

#### Gemini AI Solution
The solution provided by Gemini AI (shown above) includes:
1. Detailed explanation of the problem
2. Code example with proper cleanup implementation
3. Multiple approaches (isMounted flag, AbortController)
4. Performance considerations
5. Testing strategies
6. Alternative approaches using different libraries

Each response is automatically saved as a markdown file in the `responses` directory for future reference.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the server:
```bash
npm run build
```

3. Add to your MCP settings file:
```json
{
  "mcpServers": {
    "second-opinion": {
      "command": "node",
      "args": ["/path/to/second-opinion-server/build/index.js"],
      "env": {
        "GEMINI_API_KEY": "your-gemini-api-key",
        "PERPLEXITY_API_KEY": "your-perplexity-api-key"
      }
    }
  }
}
```

## Requirements

- Node.js >= 18.20.4
- TypeScript
- Git (for related file discovery feature)
