## **Revised Plan of Action: Template for Supabase RAG System**

### **Core Philosophy**

This template prioritizes immediate usability over complex features. Someone should fork this repository, add three API keys, drop in their markdown files, and have a working semantic search system within 30 minutes. Every design decision flows from this constraint.

### **Scope and Limitations**

#### **What This Template DOES**

This template provides a complete pipeline for semantic search over markdown and PDF documents. It handles document ingestion, chunking, embedding, storage, retrieval, and optional LLM synthesis. The system works with markdown files directly and PDF files through LlamaParse conversion. It automatically creates and manages all necessary database infrastructure in Supabase, including query logging tables for analytics. The React frontend provides both direct chunk retrieval and AI-synthesized answers from your documents.

The template supports documents of any size, automatically handling large files through intelligent chunking. It manages rate limits for all external APIs transparently. The system recovers gracefully from partial failures, continuing to process what it can. All components are designed to work with default settings, requiring zero configuration beyond API keys.

#### **What This Template DOES NOT Do**

This template processes only markdown and PDF files. Other formats like DOCX, HTML, or TXT require manual conversion to markdown. The PDF processing depends entirely on LlamaParse \- without a LlamaParse API key, PDFs cannot be processed. The system does not implement custom PDF parsing logic or OCR capabilities beyond what LlamaParse provides.

The template does not include user authentication or multi-tenancy. Every deployment serves a single set of documents to all users. Query logs are stored but not associated with specific users. If you need user-specific document collections or access control, you must implement this yourself. The template assumes public read access to all indexed content.

This is not a real-time system. Documents must be processed through the embedding pipeline before they become searchable. The template does not watch for document updates \- if you modify a markdown or PDF file, you must manually rerun the processing script. There is no automatic synchronization or incremental updates.

The template does not provide a chat interface or conversation memory. Each search is independent with no context carried between queries. If you need conversational search or follow-up questions, this requires additional implementation. The LLM synthesis mode answers based solely on retrieved chunks, not previous interactions.

#### **Technical Boundaries**

The template uses exclusively OpenAI's text-embedding-3-small model with 1536 dimensions. This is hardcoded and not configurable. The embedding model choice is optimized for quality and cost balance, and changing it would require modifying the database schema and reprocessing all documents.

Supabase is the only supported vector database. The template will not work with Pinecone, Weaviate, Qdrant, or other vector stores without significant modification. The pgvector implementation is tightly coupled to the retrieval logic.

The chunk size is limited to what works well with text-embedding-3-small. While configurable, extreme values (under 100 tokens or over 2000 tokens) will degrade search quality. The template does not include logic to automatically determine optimal chunk sizes for your specific content.

The frontend is a React application with basic Tailwind styling. It is not a production-ready UI with comprehensive responsive design, accessibility features, or advanced error handling. The template provides functional search, not a polished user experience.

#### **Data and Scale Limitations**

The template enforces a configurable maximum file count (defaulting to 500 files) to prevent accidental overuse of API quotas. This limit applies to the combined total of markdown and PDF files. Processing stops when this limit is reached, and users must explicitly increase the limit in config.json to process more documents.

Each document is processed independently. The template does not understand relationships between documents, cross-references, or hierarchical structures. If your files link to each other or build upon shared concepts, these relationships are lost during chunking.

The system stores only text content. Images, diagrams, and other media in PDFs are processed by LlamaParse but may lose fidelity. Complex PDF layouts, forms, or embedded objects might not convert cleanly to searchable text. If visual content is critical to understanding your documents, manual review of the LlamaParse output is recommended.

### **Project Structure and Initial Setup**

The repository structure follows a linear setup flow with intelligent file detection. When users clone the repository, they'll find a setup.sh script at the root that orchestrates the entire process. The structure deliberately separates concerns: a scripts folder contains all setup and processing logic, a docs folder serves as the drop zone for both markdown and PDF files, and a frontend folder houses a React application.

The configuration lives in two places. Environment variables in .env handle sensitive API keys (including the optional LLAMAPARSE_API_KEY), while config.json manages all customizable parameters with sensible defaults. The config file includes a max_file_count parameter set to 500 by default, preventing accidental processing of entire hard drives while being sufficient for most documentation sets.

### **Document Detection and PDF Processing**

The document processing pipeline now includes intelligent file type detection. When the processing script runs, it scans the docs directory for both .md and .pdf files. If PDF files are detected and no LlamaParse API key is configured, the system prompts the user:

PDF files detected in /docs folder:  
\- technical-spec.pdf (2.3 MB)  
\- user-guide.pdf (1.1 MB)  
\- api-reference.pdf (3.7 MB)

To process PDF files, you need a LlamaParse API key.  
Get one at: https://cloud.llamaindex.ai/parse

Would you like to:  
1\. Add LlamaParse API key now  
2\. Skip PDF files and process only markdown  
3\. Cancel and add key to .env file manually

Choice:

If the user provides a LlamaParse key, the system validates it with a test request before proceeding. PDF files are processed through LlamaParse with optimized settings for technical documentation, preserving code blocks, tables, and formatting where possible. The converted markdown is cached locally to avoid reprocessing PDFs unnecessarily.

### **Chunking and Embeddings Pipeline**

After PDF conversion, all documents (original markdown and converted PDFs) flow through the same pipeline. The system uses chunkipy for semantic chunking with defaults optimized for text-embedding-3-small: 500 tokens per chunk with 50 token overlaps.

The embedding process exclusively uses text-embedding-3-small. The configuration file no longer offers model selection \- this choice is hardcoded to ensure consistency and predictable costs. The system processes embeddings in batches of 100, implementing exponential backoff for rate limit handling.

Each chunk maintains rich metadata including source file type (markdown or PDF), original filename, page number (for PDFs), position within document, and surrounding context. This metadata proves essential for users to understand whether results come from original markdown or converted PDFs.

The processing script enforces the max_file_count limit, showing clear feedback:

Processing documents (max: 500 files)  
✓ 127 markdown files processed  
✓ 45 PDF files converted and processed  
⚠ Reached file limit. 23 files skipped.  
 To process more files, increase max_file_count in config.json

### **Supabase Database Architecture with Query Logging**

The Supabase setup creates additional infrastructure for comprehensive query logging. Beyond the documents table for chunks and vectors, the system establishes a query_logs table that captures every search interaction. This table stores query text, timestamp, result count, whether AI synthesis was used, response time in milliseconds, and the IDs of retrieved chunks.

The query logging happens transparently in the API layer. Every search request, regardless of success or failure, creates a log entry. Failed searches log error details for debugging. The system also creates a materialized view for query analytics, showing popular queries, average response times, and queries with no results.

The setup script creates indexes on the query_logs table for efficient retrieval:

CREATE INDEX idx_query_logs_timestamp ON query_logs(created_at DESC);  
CREATE INDEX idx_query_logs_query_text ON query_logs USING gin(to_tsvector('english', query_text));  
CREATE INDEX idx_query_logs_response_time ON query_logs(response_time_ms);

These indexes enable quick analysis of search patterns, performance monitoring, and identification of content gaps where users search for information not in the documents.

### **React Frontend Search Interface**

The frontend is built with React (via Create React App for simplicity) and Tailwind CSS. The main search component maintains local state for query input, search results, and UI preferences. The component structure follows React best practices with clear separation between presentational and container components.

The search interface implements debounced input to avoid excessive API calls while typing. When a user submits a query, the React app sends it to the backend API, which handles the entire retrieval pipeline. The frontend displays loading states, error boundaries, and progressive result rendering.

The query logging integrates seamlessly with the React frontend. Each search triggers a log entry, but the logging happens server-side to prevent tampering. The frontend can optionally display "trending searches" or "recent queries" by fetching aggregated data from the query_logs table, though this feature is disabled by default for privacy.

The AI Summary toggle is implemented as a React state variable that triggers different rendering logic:

const ResultDisplay \= ({ results, aiMode, query }) \=\> {  
 if (aiMode) {  
 return \<StreamingAIResponse chunks={results} query={query} /\>;  
 }  
 return \<ChunkCards chunks={results} /\>;  
};

### **Configuration and Customization System**

The config.json file now includes PDF processing and file limit controls:

{  
 "required": {  
 "supabase_url": "YOUR_SUPABASE_URL",  
 "supabase_anon_key": "YOUR_ANON_KEY",  
 "openai_api_key": "YOUR_OPENAI_KEY"  
 },  
 "optional": {  
 "llamaparse_api_key": "YOUR_LLAMAPARSE_KEY",  
 "processing": {  
 "max_file_count": 500,  
 "pdf_conversion": {  
 "enabled": "auto", // auto-detect based on key presence  
 "preserve_tables": true,  
 "preserve_code_blocks": true  
 }  
 },  
 "embeddings": {  
 "model": "text-embedding-3-small", // Not configurable, shown for clarity  
 "dimensions": 1536, // Not configurable, shown for clarity  
 "batch_size": 100  
 },  
 "chunking": {  
 "method": "semantic",  
 "max_tokens": 500,  
 "overlap_tokens": 50  
 },  
 "retrieval": {  
 "initial_candidates": 50,  
 "final_results": 10,  
 "reranker": {  
 "enabled": false,  
 "api_key": "",  
 "model": "jina-reranker-v2-base-multilingual"  
 }  
 },  
 "llm": {  
 "enabled": true,  
 "model": "gpt-4o-mini",  
 "max_tokens": 1000,  
 "temperature": 0.7  
 },  
 "logging": {  
 "query_logging": true,  
 "log_failed_queries": true,  
 "log_response_times": true,  
 "anonymous_analytics": false  
 }  
 }  
}

### **Query Analytics Dashboard**

While not required for the 30-minute setup, the template includes a simple analytics component that can be enabled in the React app. This component fetches aggregated query data and displays:

- Most frequent queries in the last 24 hours/week/month
- Queries with no results (content gaps)
- Average response times
- Search volume over time
- PDF vs markdown source distribution in results

The analytics respect user privacy by default, storing only query text and metadata, not IP addresses or user identifiers. Organizations can extend this for more detailed analytics if needed.

### **Setup Automation and Health Checks**

The health check endpoint now validates PDF processing capabilities:

app.get('/api/health', async (req, res) \=\> {  
 const checks \= {  
 supabase: await checkSupabaseConnection(),  
 openai: await validateOpenAIKey(),  
 embeddings: await testEmbedding(),  
 queryLogging: await testQueryLogging(),  
 pdfProcessing: await checkLlamaParseKey(),  
 fileCount: await getProcessedFileCount()  
 };

res.json({  
 status: checks.supabase && checks.openai ? 'operational' : 'degraded',  
 checks,  
 limits: {  
 maxFiles: config.processing.max_file_count,  
 processedFiles: checks.fileCount,  
 remainingCapacity: config.processing.max_file_count \- checks.fileCount  
 }  
 });  
});

### **Documentation and README Structure**

The README now includes a clear section on PDF support:

\#\# File Format Support

\#\#\# Markdown Files (.md)  
Drop your markdown files in the \`/docs\` folder. They'll be processed automatically.

\#\#\# PDF Files (.pdf)  
PDF support requires a LlamaParse API key (free tier available):  
1\. Get your key at https://cloud.llamaindex.ai/parse  
2\. Add to \`.env\`: \`LLAMAPARSE_API_KEY=your_key_here\`  
3\. Run \`npm run process\`

The system will prompt you if PDFs are detected without a configured key.

\#\#\# File Limits  
\- Default: 500 files maximum (markdown \+ PDF combined)  
\- Customize in \`config.json\` → \`processing.max_file_count\`  
\- Processing stops at limit to prevent unexpected API costs

### **Performance Optimizations**

The system now includes PDF conversion caching. Converted PDFs are stored in a `.cache/pdf-conversions` directory with hash-based filenames. If a PDF hasn't changed (same hash), the cached markdown is used instead of calling LlamaParse again. This dramatically reduces processing time and API costs for repeated runs.

Query response caching is implemented at the API level. Identical queries within a 5-minute window return cached results, reducing load on both OpenAI and Supabase. The cache is invalidated when new documents are processed.

### **Testing and Validation**

The test suite now includes PDF processing validation:

- Verify LlamaParse key validation
- Test PDF to markdown conversion quality
- Ensure file count limits are enforced
- Validate query logging captures all required fields
- Test that cached PDF conversions are reused appropriately

The repository includes sample PDFs demonstrating different document types: technical documentation with code blocks, reports with tables and charts, and text-heavy documents with minimal formatting. These samples help users understand what to expect from PDF conversion quality.

This revised template ensures users can process both markdown and PDF documents within the 30-minute setup time, while maintaining cost control through file limits and providing valuable insights through query logging. The system remains simple for basic use while offering clear upgrade paths for users who need to process more documents or analyze search patterns.

## This should be updated on github as you go. Create clear concise commits to keep track of what you have done.
