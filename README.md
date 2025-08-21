# Supabase RAG Template

A complete, production-ready template for building a Retrieval-Augmented Generation (RAG) system using Supabase, OpenAI, and React. Go from zero to semantic search in 30 minutes.

## Features

- **Document Processing**: Supports both Markdown (.md) and PDF files
- **Semantic Search**: Vector similarity search using OpenAI embeddings
- **AI Synthesis**: Optional GPT-4 powered answer generation
- **Query Analytics**: Built-in query logging and analytics dashboard
- **Caching**: Intelligent caching for PDFs and search results
- **Rate Limiting**: Automatic rate limit handling with exponential backoff
- **React UI**: Clean, responsive search interface with Tailwind CSS

## Quick Start

### Prerequisites

- Node.js 16+ installed
- Supabase account (free tier works)
- OpenAI API key
- (Optional) LlamaParse API key for PDF support

### 30-Minute Setup

1. **Clone and Install**
```bash
git clone <this-repo>
cd supabase-rag-template
npm install
```

2. **Configure API Keys**
```bash
cp .env.example .env
```

Edit `.env` and add your keys:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
LLAMAPARSE_API_KEY=your_llamaparse_key  # Optional, for PDFs
```

3. **Setup Database**

Run the setup script:
```bash
chmod +x setup.sh
./setup.sh
```

Then, go to your Supabase Dashboard → SQL Editor and run the SQL commands displayed by the setup script. These will:
- Enable the vector extension
- Create the documents and query_logs tables
- Set up necessary indexes
- Create the similarity search function

4. **Add Your Documents**

Place your `.md` and `.pdf` files in the `/docs` folder:
```bash
cp your-documents/*.md docs/
cp your-documents/*.pdf docs/  # If you have PDF support
```

5. **Process Documents**
```bash
npm run process
```

6. **Start the Application**
```bash
npm run dev
```

Visit http://localhost:3000 to start searching!

## File Format Support

### Markdown Files (.md)
Drop your markdown files in the `/docs` folder. They'll be processed automatically.

### PDF Files (.pdf)
PDF support requires a LlamaParse API key (free tier available):
1. Get your key at https://cloud.llamaindex.ai/parse
2. Add to `.env`: `LLAMAPARSE_API_KEY=your_key_here`
3. Run `npm run process`

The system will prompt you if PDFs are detected without a configured key.

### File Limits
- Default: 500 files maximum (markdown + PDF combined)
- Customize in `config.json` → `processing.max_file_count`
- Processing stops at limit to prevent unexpected API costs

## Configuration

Edit `config.json` to customize:

```json
{
  "processing": {
    "max_file_count": 500,        // Maximum files to process
    "pdf_conversion": {
      "enabled": "auto",           // Auto-detect based on API key
      "preserve_tables": true,
      "preserve_code_blocks": true
    }
  },
  "chunking": {
    "max_tokens": 500,             // Chunk size in tokens
    "overlap_tokens": 50           // Overlap between chunks
  },
  "llm": {
    "enabled": true,               // Enable AI synthesis
    "model": "gpt-4o-mini",       // OpenAI model to use
    "temperature": 0.7
  }
}
```

## API Endpoints

### Search
```
POST /api/search
{
  "query": "your search query",
  "useAI": false,  // Set to true for AI synthesis
  "limit": 10
}
```

### Health Check
```
GET /api/health
```

### Analytics
```
GET /api/analytics/stats?timeframe=24h
```

## Project Structure

```
/
├── scripts/               # Setup and processing scripts
├── docs/                 # Your documents go here
├── backend/              # Express API server
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   └── server.js        # Main server file
├── frontend/            # React application
│   ├── src/
│   │   ├── components/  # UI components
│   │   └── services/    # API client
│   └── public/
├── .env                 # Your API keys
├── config.json          # Configuration
└── setup.sh            # Setup script
```

## Development Commands

```bash
npm run setup          # Initial database setup
npm run process        # Process documents
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm test              # Run tests
```

## Troubleshooting

### "Table 'documents' does not exist"
Run the SQL commands from the setup script in your Supabase SQL editor.

### PDF files not processing
Ensure you have a valid LlamaParse API key in your `.env` file.

### Rate limit errors
The system automatically handles rate limits. If persistent, reduce `batch_size` in config.json.

### No search results
1. Verify documents were processed successfully
2. Check that embeddings were generated (look for success messages)
3. Ensure your Supabase tables have data

## Performance Tips

1. **Batch Processing**: Documents are processed in parallel (5 at a time by default)
2. **Caching**: PDF conversions are cached to avoid reprocessing
3. **Query Caching**: Identical queries within 5 minutes return cached results
4. **Optimal Chunk Size**: Default 500 tokens works well for most content

## Security Notes

- Never commit your `.env` file
- Use Supabase Row Level Security (RLS) for production
- API rate limiting is enabled by default
- Query logs don't store user information by default

## Limitations

- Embedding model is fixed to `text-embedding-3-small` (1536 dimensions)
- Supabase is the only supported vector database
- No real-time document updates (manual reprocessing required)
- No built-in authentication (single document set for all users)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this template for your projects!