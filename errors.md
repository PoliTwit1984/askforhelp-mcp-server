# Known Issues and Workarounds

## Stack Overflow API Integration

### Issues

1. **Request Timeouts**
   - Problem: Requests to Stack Exchange API occasionally timeout after 60 seconds
   - Current Solution: Added 10-second timeout in config.ts and improved error handling
   - Status: Partially resolved, monitoring for further issues

2. **API Key Authentication**
   - Problem: Stack Exchange API key validation failing with error "key doesn't match a known application"
   - Solution: Removed key requirement and using anonymous access with rate limiting
   - Impact: Limited to 300 requests per day, but sufficient for current usage

3. **Response Compression**
   - Problem: Initial attempts to handle gzip compression caused parsing errors
   - Solution: Removed custom compression handling, letting axios handle it automatically
   - Status: Resolved

4. **Filter Parameters**
   - Problem: Custom filters (!-*jbN-o8P3E5, !)Q29lpdRHRtkkxQ) not returning expected fields
   - Solution: Using default filter which includes basic fields needed
   - Status: Working but could be optimized

### Monitoring

The following debug logs have been added to help monitor these issues:

1. Request logging:
```typescript
console.error('Making questions request...');
console.error('Fetching answers for IDs:', answerIds);
```

2. Response validation:
```typescript
console.error('Stack Overflow questions response:', {
  has_more: questionsResponse.data.has_more,
  quota_max: questionsResponse.data.quota_max,
  quota_remaining: questionsResponse.data.quota_remaining,
  total: questionsResponse.data.total,
  items_count: questionsResponse.data.items?.length,
  raw_response: questionsResponse.data,
});
```

3. Error details:
```typescript
console.error('Stack Overflow API error:', {
  status: error.response?.status,
  statusText: error.response?.statusText,
  data: error.response?.data,
  message: error.message,
  config: error.config,
});
```

### Future Improvements

1. Implement retry logic for failed requests
2. Create custom filter that includes only needed fields
3. Add proper Stack Exchange API key registration
4. Implement caching for frequently accessed questions
5. Add request queue to handle rate limiting more gracefully
