# API Reference

This document provides a comprehensive reference for the Supabase RAG System API.

## Base URL

```
http://localhost:3001/api
```

## Authentication

Currently, the API does not require authentication. In production, you should implement proper authentication mechanisms.

## Endpoints

### Search Documents

Perform a semantic search across all indexed documents.

**Endpoint:** `POST /search`

**Request Body:**
```json
{
  "query": "string",      // Required: The search query
  "useAI": boolean,       // Optional: Enable AI synthesis (default: false)
  "limit": number         // Optional: Maximum results to return (default: 10)
}
```

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "content": "string",
      "metadata": {},
      "source_file": "string",
      "source_type": "markdown|pdf",
      "chunk_index": 0,
      "similarity": 0.95
    }
  ],
  "synthesis": {           // Only if useAI is true
    "answer": "string",
    "model": "gpt-4o-mini",
    "chunks_used": 5
  }
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I configure chunking?",
    "useAI": true,
    "limit": 5
  }'
```

### Health Check

Check the health status of the system and its dependencies.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "operational|degraded|down",
  "checks": {
    "supabase": true,
    "openai": true,
    "embeddings": true,
    "queryLogging": true,
    "pdfProcessing": false,
    "fileCount": 42
  },
  "limits": {
    "maxFiles": 500,
    "processedFiles": 42,
    "remainingCapacity": 458
  },
  "configuration": {
    "embeddingModel": "text-embedding-3-small",
    "chunkSize": 500,
    "llmEnabled": true,
    "llmModel": "gpt-4o-mini"
  }
}
```

### Analytics - Query Statistics

Get aggregated statistics about search queries.

**Endpoint:** `GET /analytics/stats`

**Query Parameters:**
- `timeframe`: One of `1h`, `24h`, `7d`, `30d` (default: `24h`)

**Response:**
```json
{
  "timeframe": "24h",
  "since": "2024-01-01T00:00:00Z",
  "stats": {
    "total_queries": 150,
    "queries_with_results": 140,
    "queries_with_no_results": 8,
    "failed_queries": 2,
    "ai_synthesis_used": 75,
    "avg_response_time": 234,
    "avg_results_per_query": "7.5"
  },
  "top_queries": [
    {
      "query": "how to configure",
      "count": 15
    }
  ],
  "queries_with_no_results": [
    "obscure technical term",
    "non-existent feature"
  ]
}
```

### Search Suggestions

Get search suggestions based on a prefix (autocomplete).

**Endpoint:** `GET /search/suggestions`

**Query Parameters:**
- `prefix`: The search prefix (minimum 2 characters)

**Response:**
```json
{
  "suggestions": [
    "how to configure chunking",
    "how to configure embeddings",
    "how to configure llm"
  ]
}
```

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": "Error type",
  "message": "Detailed error message"  // Only in development mode
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

## Rate Limiting

The API implements rate limiting:
- **Limit:** 100 requests per minute per IP
- **Window:** 1 minute sliding window
- **Headers:** Rate limit info included in response headers

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200000
```

## Webhooks

Currently not implemented. Future versions may include webhooks for:
- Document processing completion
- Search query events
- System health changes

## SDKs and Client Libraries

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Search documents
const search = async (query: string, useAI: boolean = false) => {
  const response = await client.post('/search', {
    query,
    useAI,
    limit: 10
  });
  return response.data;
};
```

### Python

```python
import requests

class RAGClient:
    def __init__(self, base_url="http://localhost:3001/api"):
        self.base_url = base_url
        
    def search(self, query, use_ai=False, limit=10):
        response = requests.post(
            f"{self.base_url}/search",
            json={
                "query": query,
                "useAI": use_ai,
                "limit": limit
            }
        )
        return response.json()
```

## Testing the API

You can test the API using tools like:
- **curl**: Command-line tool for making HTTP requests
- **Postman**: GUI tool for API testing
- **Thunder Client**: VS Code extension for API testing

## API Versioning

The current API version is v1 (implicit). Future versions will include version in the URL path (e.g., `/api/v2/search`).

## Support

For issues or questions about the API:
1. Check the troubleshooting section in the README
2. Review the error message details
3. Check the health endpoint for system status
4. Open an issue on GitHub