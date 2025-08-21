# Supabase RAG System - Complete Setup Guide

This guide will walk you through setting up the Supabase RAG System from an empty Supabase project to a fully functional semantic search system.

## Prerequisites

Before starting, ensure you have:
- Node.js 16+ installed
- A Supabase account (free tier is sufficient)
- An OpenAI API key
- (Optional) A LlamaParse API key for PDF support

## Step 1: Create a New Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Fill in:
   - Project name: `rag-system` (or your choice)
   - Database Password: Choose a strong password
   - Region: Select closest to your users
4. Click "Create new project" and wait for setup (~2 minutes)

## Step 2: Get Your Supabase Credentials

Once your project is ready:

1. Go to **Settings → API**
2. Copy these values:
   - **Project URL**: `https://[your-project-id].supabase.co`
   - **Anon/Public Key**: A long string starting with `eyJ...`

## Step 3: Get Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Navigate to **API Keys**
3. Click "Create new secret key"
4. Copy the key (starts with `sk-...`)

## Step 4: (Optional) Get LlamaParse API Key for PDFs

1. Go to [LlamaParse Cloud](https://cloud.llamaindex.ai/parse)
2. Sign up/Login
3. Navigate to API Keys
4. Create and copy your API key

## Step 5: Clone and Configure the Repository

```bash
# Clone the repository
git clone <repository-url>
cd supabase-rag-template

# Copy environment template
cp .env.example .env
```

## Step 6: Configure Environment Variables

Edit `.env` and add your keys:

```env
# Required
SUPABASE_URL=https://[your-project-id].supabase.co
SUPABASE_ANON_KEY=eyJ...your-anon-key...
OPENAI_API_KEY=sk-...your-openai-key...

# Optional
LLAMAPARSE_API_KEY=llp_...your-llamaparse-key...
```

## Step 7: Install Dependencies

```bash
# Install all dependencies
npm install
```

## Step 8: Set Up Supabase Database

### Option A: Automated Setup (Recommended)

1. Run the setup script:
```bash
npm run setup
```

2. The script will detect that tables don't exist and provide you with SQL to run

3. Copy the SQL from `scripts/supabase-setup.sql` or from the console output

### Option B: Manual Setup

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor → New Query**
3. Copy the entire contents of `scripts/supabase-setup.sql`
4. Paste into the SQL editor
5. Click **Run**

You should see:
- Multiple "CREATE" success messages
- Final message: "Setup Complete! Found 3 tables ready for use."

## Step 9: Verify Database Setup

Run the setup script again to verify:

```bash
npm run setup
```

You should see:
```
✅ Database tables found!
✅ Documents table: OK (0 documents)
✅ Query logs table: OK (0 logs)
✅ Processing status table: OK (0 records)
✅ Vector search function: OK
✅ OpenAI API key: Valid
✅ Embedding generation: OK (1536 dimensions)

Setup Status: READY
```

## Step 10: Add Your Documents

Place your documents in the `/docs` folder:

```bash
# Create docs folder if it doesn't exist
mkdir -p docs

# Copy your markdown files
cp /path/to/your/*.md docs/

# Copy your PDF files (if you have LlamaParse key)
cp /path/to/your/*.pdf docs/
```

The system includes sample documents to test with:
- `docs/sample-getting-started.md`
- `docs/sample-api-reference.md`

## Step 11: Process Documents

Convert your documents into searchable embeddings:

```bash
npm run process
```

You'll see:
```
Processing: sample-getting-started.md
  ✓ sample-getting-started.md - 5 chunks created
Processing: sample-api-reference.md
  ✓ sample-api-reference.md - 8 chunks created

✅ Processing complete!
   Processed 2 files
```

## Step 12: Start the Application

```bash
npm run dev
```

This starts:
- Backend API on http://localhost:3001
- Frontend on http://localhost:3000

## Step 13: Test the System

1. Open http://localhost:3000 in your browser
2. Try searching for:
   - "how to configure"
   - "API endpoints"
   - "chunking strategy"
3. Toggle "Use AI to synthesize answer" for AI-generated responses

## Troubleshooting

### "relation 'documents' does not exist"

The database tables haven't been created. Run the SQL setup script in Supabase.

### "Invalid API Key"

Double-check your API keys in `.env`. Ensure there are no extra spaces or quotes.

### "No results found"

1. Verify documents were processed: `npm run process`
2. Check Supabase Dashboard → Table Editor → documents (should have rows)
3. Try a simpler search query

### "Rate limit exceeded"

Reduce `batch_size` in `config.json` from 100 to 50:
```json
{
  "embeddings": {
    "batch_size": 50
  }
}
```

### PDF files not processing

Ensure you have a LlamaParse API key in `.env`:
```env
LLAMAPARSE_API_KEY=llp_your_key_here
```

## Configuration Options

Edit `config.json` to customize:

- **max_file_count**: Increase from 500 if you have more documents
- **chunk_size**: Adjust between 300-800 tokens based on your content
- **llm.model**: Change from `gpt-4o-mini` to `gpt-4` for better quality
- **retrieval.final_results**: Increase for more search results

## Production Deployment

For production use:

1. **Enable Row Level Security (RLS)** in Supabase:
```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_logs ENABLE ROW LEVEL SECURITY;
```

2. **Set up authentication** if needed

3. **Use environment variables** for all sensitive data

4. **Enable CORS** for your domain in Supabase settings

5. **Set up monitoring** for API usage and costs

## Next Steps

- Add more documents to build your knowledge base
- Customize the React UI for your brand
- Implement authentication if needed
- Set up automated document updates
- Monitor query analytics to improve content

## Support

- Check the [README](README.md) for additional information
- Review error messages in the browser console
- Check API health: http://localhost:3001/api/health
- Open an issue on GitHub for bugs

## Quick Command Reference

```bash
# Initial setup
npm install              # Install dependencies
npm run setup           # Verify database setup

# Document management
npm run process         # Process documents in /docs

# Development
npm run dev            # Start both frontend and backend
npm run dev:backend    # Start only backend
npm run dev:frontend   # Start only frontend

# Production
npm run build          # Build for production
npm run start          # Start production server
```

Your Supabase RAG System is now ready! 🎉