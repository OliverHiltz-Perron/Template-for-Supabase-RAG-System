# Getting Started with the Supabase RAG System

This document serves as a sample for testing the RAG system. It contains information about how to use and configure the system.

## Overview

The Supabase RAG System is a powerful tool for semantic search over your documentation. It combines the capabilities of:

- **Supabase**: For vector storage and retrieval
- **OpenAI**: For generating embeddings and AI responses
- **React**: For a modern, responsive user interface

## Key Features

### Semantic Search
Unlike traditional keyword search, semantic search understands the meaning and context of your queries. For example:
- Searching for "how to start the server" will find relevant content even if the exact phrase doesn't appear
- Related concepts are automatically included in results
- Context from surrounding text improves accuracy

### Document Processing
The system can process multiple document types:
- Markdown files for technical documentation
- PDF files for reports and presentations
- Automatic chunking for optimal retrieval
- Metadata preservation for source tracking

### AI-Powered Synthesis
When enabled, the AI synthesis feature:
- Combines information from multiple sources
- Generates coherent, contextual answers
- Cites the specific chunks used
- Maintains accuracy by only using retrieved content

## Configuration Options

### Chunking Strategy
The system uses semantic chunking with configurable parameters:
- `max_tokens`: Maximum size of each chunk (default: 500)
- `overlap_tokens`: Overlap between chunks for context (default: 50)

### Embedding Model
The system uses OpenAI's `text-embedding-3-small` model:
- 1536 dimensions for high accuracy
- Optimized for cost and performance
- Suitable for most documentation types

### Search Parameters
You can configure:
- Number of initial candidates to retrieve
- Final results to return
- Optional reranking for improved relevance
- AI synthesis toggle

## Best Practices

1. **Document Organization**: Structure your documents with clear headings and sections
2. **File Naming**: Use descriptive file names that indicate content
3. **Regular Updates**: Reprocess documents when making significant changes
4. **Query Formulation**: Use natural language questions for best results

## Common Use Cases

- **Technical Documentation**: Search through API docs, guides, and references
- **Knowledge Base**: Build a searchable repository of company knowledge
- **Research Papers**: Find relevant information across academic documents
- **Support Documentation**: Help users find answers quickly

## Troubleshooting Tips

If you're not getting good search results:
1. Check that documents were processed successfully
2. Verify your search query is clear and specific
3. Try enabling AI synthesis for more comprehensive answers
4. Review the chunk size settings for your content type

## Performance Considerations

The system is optimized for:
- Documents up to 500 files (configurable)
- Real-time search with sub-second response times
- Concurrent processing of multiple documents
- Caching for improved performance

This sample document demonstrates the type of content that works well with the RAG system. Add your own documents to the `/docs` folder to build your searchable knowledge base!