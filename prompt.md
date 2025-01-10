# Second Opinion MCP Server - Development Guide

## Overview

This MCP server provides enhanced coding assistance by combining multiple AI and knowledge sources:
1. Google's Gemini AI for primary analysis
2. Stack Overflow for real-world solutions
3. Perplexity AI for additional insights

## Current State

The server is functional with:
- Working Gemini AI integration
- Basic Stack Overflow integration (with known issues)
- Perplexity integration
- File context gathering
- Language detection
- Code snippet extraction

## Active Development Areas

### Stack Overflow Integration
- Currently using anonymous access (300 requests/day limit)
- Default filter for basic fields
- Issues with timeouts and response parsing
- See errors.md for detailed status

### Response Format
The server combines insights from all sources into a structured response:
1. Main solution from Gemini AI
2. Related Stack Overflow questions/answers
3. Additional context from Perplexity
4. Code snippets and examples
5. Best practices and considerations

### Configuration
Key settings in config.ts:
- API endpoints
- Timeouts
- Filter parameters
- Language mappings

## Development Guidelines

1. **Error Handling**
   - Log detailed error information
   - Provide fallbacks when a source fails
   - Keep the response useful even with partial data

2. **API Integration**
   - Respect rate limits
   - Handle compression correctly
   - Validate response data
   - Add retries for transient failures

3. **Code Quality**
   - Maintain TypeScript types
   - Add JSDoc comments
   - Follow existing patterns
   - Add error logging

4. **Testing**
   - Test with various error messages
   - Verify multi-source integration
   - Check rate limit handling
   - Validate response format

## Next Steps

1. Improve Stack Overflow integration:
   - Implement proper API key handling
   - Create optimal filter
   - Add request retries
   - Implement caching

2. Enhance response quality:
   - Better source integration
   - Improved code extraction
   - More detailed best practices
   - Performance considerations

3. Add features:
   - Response caching
   - Request queuing
   - More language support
   - Custom filter creation

## Resources

- [Stack Exchange API Docs](https://api.stackexchange.com/docs)
- [Gemini AI Docs](https://ai.google.dev/docs)
- [Perplexity API Docs](https://docs.perplexity.ai)
- [MCP SDK Docs](https://modelcontextprotocol.github.io/typescript-sdk/)
