# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Template for Supabase RAG System - a complete pipeline for semantic search over markdown and PDF documents. The system handles document ingestion, chunking, embedding, storage, retrieval, and optional LLM synthesis. It's designed for immediate usability where users can fork the repo, add API keys, drop in documents, and have a working semantic search system within 30 minutes.

## Key Components to Implement

### Backend API (Express.js)
- `/api/process` - Document processing endpoint
- `/api/search` - Semantic search endpoint
- `/api/health` - Health check with PDF/LlamaParse validation
- `/api/analytics` - Query analytics endpoint
- Query logging middleware for all searches

### Document Processing Pipeline
- **Scripts folder** structure:
  - `setup.sh` - Main setup orchestrator
  - `process-documents.js` - Document processing logic
  - `create-tables.js` - Supabase table creation
  - `pdf-converter.js` - LlamaParse integration for PDFs
- **Processing flow**:
  1. Detect markdown and PDF files in `/docs`
  2. Convert PDFs via LlamaParse (if API key present)
  3. Chunk documents (500 tokens, 50 token overlap)
  4. Generate embeddings with OpenAI text-embedding-3-small
  5. Store in Supabase with pgvector

### Database Architecture (Supabase)
- `documents` table - Chunks with vector embeddings (1536 dimensions)
- `query_logs` table - Search analytics
- Indexes for performance on timestamps, query text, response times
- Materialized view for query analytics

### Frontend (React + Tailwind)
- Search component with debounced input
- Toggle for AI synthesis mode vs direct chunks
- Results display with source metadata
- Optional analytics dashboard
- Loading states and error boundaries

### Configuration System
- `.env` file for API keys (SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY, LLAMAPARSE_API_KEY)
- `config.json` for customizable parameters (max_file_count: 500 default)

## Development Commands

```bash
# Initial setup
npm install              # Install all dependencies
npm run setup           # Create Supabase tables and infrastructure

# Document processing
npm run process         # Process documents in /docs folder (markdown + PDFs)

# Development
npm run dev            # Start development server (frontend + backend)
npm run dev:frontend   # Start only frontend
npm run dev:backend    # Start only backend

# Production
npm run build          # Build for production
npm run start          # Start production server

# Testing
npm test               # Run test suite
npm run test:process   # Test document processing
npm run test:api       # Test API endpoints
```

## Architecture and Flow

### Document Processing Flow
1. **Input**: Markdown files (.md) and PDF files (.pdf) in `/docs` folder
2. **PDF Conversion**: LlamaParse API converts PDFs to markdown (cached in `.cache/pdf-conversions`)
3. **Chunking**: Semantic chunking with chunkipy (500 tokens max, 50 token overlap)
4. **Embedding**: OpenAI text-embedding-3-small (1536 dimensions) - hardcoded model
5. **Storage**: Supabase with pgvector extension
6. **Metadata**: Source file type, filename, page number (PDFs), position, context

### Search and Retrieval Flow
1. User query → Embed with text-embedding-3-small
2. Vector similarity search in Supabase (50 candidates → 10 final results)
3. Optional reranking (if configured with Jina API)
4. Optional LLM synthesis with GPT-4o-mini
5. Query logging for analytics
6. Response caching (5-minute window)

### File Structure
```
/
├── scripts/               # Setup and processing scripts
├── docs/                 # Document drop zone (markdown + PDFs)
├── frontend/             # React application
│   ├── src/
│   │   ├── components/   # Search, Results, Analytics
│   │   └── services/     # API client
│   └── public/
├── backend/              # Express API
│   ├── routes/          # API endpoints
│   ├── services/        # Processing, embedding, search
│   └── utils/           # Helpers and middleware
├── .env                 # API keys
├── config.json          # Configuration
└── setup.sh            # Main setup script
```

## Important Constraints and Notes

1. **Embedding Model**: Always use OpenAI text-embedding-3-small (1536 dimensions). This is hardcoded and not configurable.

2. **Database**: Supabase is the only supported vector database. The system won't work with other vector stores.

3. **File Limits**: Default max of 500 files (markdown + PDF combined). Configurable in `config.json` → `processing.max_file_count`.

4. **PDF Support**: Requires LlamaParse API key. System will prompt if PDFs detected without key.

5. **Rate Limiting**: Implements exponential backoff for OpenAI API calls. Batch size of 100 for embeddings.

6. **Caching**: 
   - PDF conversions cached to avoid re-processing
   - Query responses cached for 5 minutes

7. **No Real-time Updates**: Documents must be manually reprocessed after changes.

8. **No Authentication**: Single document set for all users, no access control.

9. **Query Logging**: All searches logged transparently for analytics (configurable).

## Testing Approach

- Validate API key configurations
- Test PDF conversion with sample documents
- Verify file count limit enforcement
- Check query logging captures all fields
- Test cache reuse for PDFs and queries
- Include sample PDFs for different document types (technical docs, reports, text-heavy)

## Common Tasks

### Add PDF Support
1. Get LlamaParse API key from https://cloud.llamaindex.ai/parse
2. Add to `.env`: `LLAMAPARSE_API_KEY=your_key_here`
3. System auto-detects and processes PDFs

### Increase File Limit
Edit `config.json`:
```json
{
  "processing": {
    "max_file_count": 1000
  }
}
```

### Enable Query Analytics
Analytics are enabled by default. Access at `/analytics` endpoint or React component.

### Disable LLM Synthesis
Edit `config.json`:
```json
{
  "llm": {
    "enabled": false
  }
}
```