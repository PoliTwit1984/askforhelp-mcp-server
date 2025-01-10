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

**Example Input:**
```json
{
  "goal": "Fix React useEffect cleanup error",
  "error": "React Hook useEffect has a missing dependency: 'socket'. Either include it in the dependency array, or remove the dependency array  react-hooks/exhaustive-deps",
  "code": "useEffect(() => {\n  socket.on('message', handleMessage);\n  return () => socket.off('message');\n}, []);",
  "solutionsTried": "I tried adding socket to the dependency array but then it causes infinite re-renders"
}
```

**Example Response:**

## Understanding the Problem

The core issue lies in how React's `useEffect` hook manages side effects and their dependencies. When you provide an empty dependency array (`[]`), you're telling React that the effect should only run once when the component mounts and that the cleanup function should run when the component unmounts.

However, in your code, the `socket` object is used within the effect. This creates a closure where the `handleMessage` function and the cleanup function (`socket.off('message')`) implicitly depend on the current value of `socket`. If `socket` ever changes (e.g., due to a reconnection or reinitialization), your effect will be using an outdated `socket` instance.

### Common Issues
- **Stale Closures:** The event handler (`handleMessage`) might be working with an old `socket` object
- **Incorrect Cleanup:** The `socket.off('message')` might not remove the intended event listener
- **Memory Leaks:** Failed cleanup can lead to memory leaks and unexpected behavior

## Solutions

### 1. Using useRef for Stable References

```typescript
import React, { useEffect, useRef } from 'react';

function MyComponent({ socket }) {
  const socketRef = useRef(socket);

  useEffect(() => {
    const currentSocket = socketRef.current;
    currentSocket.on('message', handleMessage);
    return () => {
      currentSocket.off('message');
    };
  }, []); // Empty dependency array is now safe
}
```

**Why This Works:**
- `useRef` creates a mutable object that persists across renders
- The ref object itself doesn't change, preventing effect re-runs
- You can access the latest socket value via the ref

### 2. Using useCallback for Handlers

```typescript
import React, { useEffect, useRef, useCallback } from 'react';

function MyComponent({ socket, someProp }) {
  const socketRef = useRef(socket);

  const handleMessage = useCallback((message) => {
    // Do something with the message and potentially someProp
    console.log(message, someProp);
  }, [someProp]); // Include dependencies of handleMessage

  useEffect(() => {
    const currentSocket = socketRef.current;
    currentSocket.on('message', handleMessage);
    return () => {
      currentSocket.off('message', handleMessage);
    };
  }, [handleMessage]); // Depend on the memoized handler
}
```

### 3. Managing Socket Lifecycle Inside useEffect

```typescript
import React, { useEffect, useState } from 'react';

function MyComponent() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const socket = new WebSocket('your_websocket_url');

    const handleMessage = (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    };

    socket.on('message', handleMessage);

    return () => {
      socket.off('message', handleMessage);
      socket.close();
    };
  }, []); // Empty array is correct - socket lifecycle managed within
}
```

### 4. Custom Hook Solution

```typescript
function useSocket(url) {
  const [messages, setMessages] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = new WebSocket(url);
    socketRef.current = socket;

    const handleMessage = (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    };

    socket.on('message', handleMessage);

    return () => {
      socket.off('message', handleMessage);
      socket.close();
    };
  }, [url]);

  const sendMessage = useCallback((message) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(message);
    }
  }, []);

  return { messages, sendMessage };
}
```

## Best Practices

1. **Dependency Management**
   - Use `useRef` for stable references
   - Memoize handlers with `useCallback`
   - Consider socket lifecycle management

2. **Performance Optimization**
   - Minimize unnecessary re-renders
   - Handle high-volume messages efficiently
   - Use appropriate cleanup patterns

3. **Error Handling**
   - Handle connection errors gracefully
   - Implement reconnection logic if needed
   - Clean up resources properly

4. **Testing Considerations**
   - Mock WebSocket connections in tests
   - Verify event listener cleanup
   - Test error scenarios

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
