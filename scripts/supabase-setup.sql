-- ================================================
-- Supabase RAG System - Complete Database Setup
-- ================================================
-- Run this entire script in your Supabase SQL Editor
-- This will set up everything needed for the RAG system

-- ================================================
-- 1. Enable Required Extensions
-- ================================================

-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- Enable pg_trgm for text search improvements
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

-- ================================================
-- 2. Create Main Tables
-- ================================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS query_logs CASCADE;
DROP TABLE IF EXISTS processing_status CASCADE;

-- Create documents table for storing chunks and embeddings
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(1536),
  source_file TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('markdown', 'pdf', 'other')),
  chunk_index INTEGER NOT NULL DEFAULT 0,
  total_chunks INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create query_logs table for analytics
CREATE TABLE query_logs (
  id SERIAL PRIMARY KEY,
  query_text TEXT NOT NULL,
  result_count INTEGER DEFAULT 0,
  used_ai_synthesis BOOLEAN DEFAULT FALSE,
  response_time_ms INTEGER,
  retrieved_chunk_ids INTEGER[],
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create processing_status table to track document processing
CREATE TABLE processing_status (
  id SERIAL PRIMARY KEY,
  file_name TEXT NOT NULL UNIQUE,
  file_type TEXT,
  file_size_bytes BIGINT,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  chunks_created INTEGER DEFAULT 0,
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ================================================
-- 3. Create Indexes for Performance
-- ================================================

-- Vector similarity search index (using ivfflat)
CREATE INDEX idx_documents_embedding 
  ON documents 
  USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);

-- Text search indexes
CREATE INDEX idx_documents_content_gin 
  ON documents 
  USING gin(to_tsvector('english', content));

-- Standard indexes
CREATE INDEX idx_documents_source_file ON documents(source_file);
CREATE INDEX idx_documents_source_type ON documents(source_type);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_chunk_index ON documents(source_file, chunk_index);

-- Query logs indexes
CREATE INDEX idx_query_logs_timestamp ON query_logs(created_at DESC);
CREATE INDEX idx_query_logs_query_text ON query_logs USING gin(to_tsvector('english', query_text));
CREATE INDEX idx_query_logs_response_time ON query_logs(response_time_ms);
CREATE INDEX idx_query_logs_result_count ON query_logs(result_count);

-- Processing status indexes
CREATE INDEX idx_processing_status_file_name ON processing_status(file_name);
CREATE INDEX idx_processing_status_status ON processing_status(status);
CREATE INDEX idx_processing_status_created_at ON processing_status(created_at DESC);

-- ================================================
-- 4. Create Core Functions
-- ================================================

-- Main similarity search function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  filter jsonb DEFAULT '{}'::jsonb
) RETURNS TABLE (
  id int,
  content text,
  metadata jsonb,
  source_file text,
  source_type text,
  chunk_index int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    d.source_file,
    d.source_type,
    d.chunk_index,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE 
    -- Apply source_type filter if provided
    CASE 
      WHEN filter ? 'source_type' THEN d.source_type = filter->>'source_type'
      ELSE TRUE
    END
    AND
    -- Apply source_file filter if provided
    CASE 
      WHEN filter ? 'source_file' THEN d.source_file = filter->>'source_file'
      ELSE TRUE
    END
    AND
    -- Ensure embedding exists
    d.embedding IS NOT NULL
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Hybrid search function (combines vector and keyword search)
CREATE OR REPLACE FUNCTION hybrid_search(
  query_embedding vector(1536),
  query_text text,
  match_count int DEFAULT 10,
  vector_weight float DEFAULT 0.7
) RETURNS TABLE (
  id int,
  content text,
  metadata jsonb,
  source_file text,
  source_type text,
  chunk_index int,
  similarity float,
  keyword_rank float,
  combined_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT
      d.id,
      1 - (d.embedding <=> query_embedding) AS vec_similarity
    FROM documents d
    WHERE d.embedding IS NOT NULL
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  keyword_search AS (
    SELECT
      d.id,
      ts_rank_cd(to_tsvector('english', d.content), plainto_tsquery('english', query_text)) AS text_rank
    FROM documents d
    WHERE to_tsvector('english', d.content) @@ plainto_tsquery('english', query_text)
    ORDER BY text_rank DESC
    LIMIT match_count * 2
  ),
  combined AS (
    SELECT
      COALESCE(v.id, k.id) AS id,
      COALESCE(v.vec_similarity, 0) AS vec_similarity,
      COALESCE(k.text_rank, 0) AS text_rank,
      (COALESCE(v.vec_similarity, 0) * vector_weight + 
       COALESCE(k.text_rank, 0) * (1 - vector_weight)) AS combined_score
    FROM vector_search v
    FULL OUTER JOIN keyword_search k ON v.id = k.id
  )
  SELECT
    d.id,
    d.content,
    d.metadata,
    d.source_file,
    d.source_type,
    d.chunk_index,
    c.vec_similarity AS similarity,
    c.text_rank AS keyword_rank,
    c.combined_score
  FROM combined c
  JOIN documents d ON c.id = d.id
  ORDER BY c.combined_score DESC
  LIMIT match_count;
END;
$$;

-- Function to get document statistics
CREATE OR REPLACE FUNCTION get_document_stats()
RETURNS TABLE (
  total_documents bigint,
  total_chunks bigint,
  unique_files bigint,
  avg_chunk_size float,
  source_type_breakdown jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT source_file) AS total_documents,
    COUNT(*) AS total_chunks,
    COUNT(DISTINCT source_file) AS unique_files,
    AVG(LENGTH(content))::float AS avg_chunk_size,
    jsonb_object_agg(
      source_type_counts.source_type,
      source_type_counts.count
    ) AS source_type_breakdown
  FROM documents,
  LATERAL (
    SELECT source_type, COUNT(*) as count
    FROM documents
    GROUP BY source_type
  ) AS source_type_counts
  GROUP BY source_type_counts.source_type, source_type_counts.count;
END;
$$;

-- Function to get query analytics
CREATE OR REPLACE FUNCTION get_query_analytics(
  time_window interval DEFAULT '24 hours'::interval
)
RETURNS TABLE (
  total_queries bigint,
  successful_queries bigint,
  failed_queries bigint,
  avg_response_time float,
  avg_results_per_query float,
  ai_synthesis_usage_rate float,
  no_results_rate float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_queries,
    COUNT(CASE WHEN error_message IS NULL THEN 1 END) AS successful_queries,
    COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) AS failed_queries,
    AVG(response_time_ms)::float AS avg_response_time,
    AVG(result_count)::float AS avg_results_per_query,
    (COUNT(CASE WHEN used_ai_synthesis THEN 1 END)::float / NULLIF(COUNT(*), 0)) AS ai_synthesis_usage_rate,
    (COUNT(CASE WHEN result_count = 0 AND error_message IS NULL THEN 1 END)::float / NULLIF(COUNT(*), 0)) AS no_results_rate
  FROM query_logs
  WHERE created_at >= NOW() - time_window;
END;
$$;

-- Function to find similar documents to a given document
CREATE OR REPLACE FUNCTION find_similar_documents(
  document_id int,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id int,
  content text,
  source_file text,
  similarity float
)
LANGUAGE plpgsql
AS $$
DECLARE
  target_embedding vector(1536);
BEGIN
  -- Get the embedding of the target document
  SELECT embedding INTO target_embedding
  FROM documents
  WHERE documents.id = document_id;
  
  IF target_embedding IS NULL THEN
    RAISE EXCEPTION 'Document % not found or has no embedding', document_id;
  END IF;
  
  -- Find similar documents
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.source_file,
    1 - (d.embedding <=> target_embedding) AS similarity
  FROM documents d
  WHERE d.id != document_id
    AND d.embedding IS NOT NULL
  ORDER BY d.embedding <=> target_embedding
  LIMIT match_count;
END;
$$;

-- ================================================
-- 5. Create Views for Analytics
-- ================================================

-- View for popular queries
CREATE OR REPLACE VIEW popular_queries AS
SELECT 
  query_text,
  COUNT(*) as query_count,
  AVG(response_time_ms) as avg_response_time,
  AVG(result_count) as avg_results,
  MAX(created_at) as last_queried
FROM query_logs
WHERE error_message IS NULL
GROUP BY query_text
ORDER BY query_count DESC;

-- View for queries with no results
CREATE OR REPLACE VIEW no_result_queries AS
SELECT 
  query_text,
  COUNT(*) as attempt_count,
  MAX(created_at) as last_attempted
FROM query_logs
WHERE result_count = 0 
  AND error_message IS NULL
GROUP BY query_text
ORDER BY attempt_count DESC;

-- View for document coverage
CREATE OR REPLACE VIEW document_coverage AS
SELECT 
  source_file,
  source_type,
  COUNT(*) as chunk_count,
  MIN(chunk_index) as first_chunk,
  MAX(chunk_index) as last_chunk,
  AVG(LENGTH(content)) as avg_chunk_size,
  MIN(created_at) as indexed_at
FROM documents
GROUP BY source_file, source_type
ORDER BY source_file;

-- ================================================
-- 6. Create Triggers
-- ================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at 
  BEFORE UPDATE ON documents 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 7. Row Level Security (RLS) Setup
-- ================================================

-- Enable RLS on tables (disabled by default for development)
-- Uncomment these lines for production with proper authentication

-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE query_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE processing_status ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (customize based on your auth setup)
-- CREATE POLICY "Documents are viewable by everyone" 
--   ON documents FOR SELECT 
--   USING (true);

-- CREATE POLICY "Query logs are viewable by everyone" 
--   ON query_logs FOR SELECT 
--   USING (true);

-- CREATE POLICY "Anyone can insert query logs" 
--   ON query_logs FOR INSERT 
--   WITH CHECK (true);

-- ================================================
-- 8. Initial Data and Testing
-- ================================================

-- Insert a test record to verify setup
INSERT INTO processing_status (file_name, file_type, status)
VALUES ('setup_test.md', 'markdown', 'completed')
ON CONFLICT (file_name) DO NOTHING;

-- ================================================
-- 9. Grants for API Access
-- ================================================

-- Grant necessary permissions to the anon and authenticated roles
-- These are required for the Supabase client to work

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ================================================
-- 10. Verification Queries
-- ================================================

-- Run these to verify the setup was successful
DO $$
BEGIN
  RAISE NOTICE 'Setup completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - documents (for storing chunks and embeddings)';
  RAISE NOTICE '  - query_logs (for search analytics)';
  RAISE NOTICE '  - processing_status (for tracking document processing)';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - match_documents() - Main similarity search';
  RAISE NOTICE '  - hybrid_search() - Combined vector and keyword search';
  RAISE NOTICE '  - get_document_stats() - Document statistics';
  RAISE NOTICE '  - get_query_analytics() - Query analytics';
  RAISE NOTICE '  - find_similar_documents() - Find similar documents';
  RAISE NOTICE '';
  RAISE NOTICE 'Views created:';
  RAISE NOTICE '  - popular_queries';
  RAISE NOTICE '  - no_result_queries';
  RAISE NOTICE '  - document_coverage';
  RAISE NOTICE '';
  RAISE NOTICE 'Your Supabase RAG system is ready to use!';
END $$;

-- Final check: Display table information
SELECT 
  'Setup Complete! Found ' || COUNT(*) || ' tables ready for use.' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('documents', 'query_logs', 'processing_status');