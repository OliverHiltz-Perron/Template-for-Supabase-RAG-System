const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
const config = require('../../config.json');

router.get('/', async (req, res) => {
  const checks = {
    supabase: false,
    openai: false,
    embeddings: false,
    queryLogging: false,
    pdfProcessing: false,
    fileCount: 0
  };

  // Check Supabase connection
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    const { count, error } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true });
    
    if (!error) {
      checks.supabase = true;
      checks.fileCount = count || 0;
    }
  } catch (error) {
    console.error('Supabase check failed:', error);
  }

  // Check OpenAI
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    await openai.models.list();
    checks.openai = true;
    
    // Test embedding
    const embeddingTest = await openai.embeddings.create({
      model: config.embeddings.model,
      input: 'test'
    });
    if (embeddingTest.data && embeddingTest.data.length > 0) {
      checks.embeddings = true;
    }
  } catch (error) {
    console.error('OpenAI check failed:', error);
  }

  // Check query logging
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    const { error } = await supabase
      .from('query_logs')
      .select('id')
      .limit(1);
    
    if (!error) {
      checks.queryLogging = true;
    }
  } catch (error) {
    console.error('Query logging check failed:', error);
  }

  // Check LlamaParse
  checks.pdfProcessing = !!process.env.LLAMAPARSE_API_KEY;

  const status = checks.supabase && checks.openai ? 'operational' : 'degraded';

  res.json({
    status,
    checks,
    limits: {
      maxFiles: config.processing.max_file_count,
      processedFiles: checks.fileCount,
      remainingCapacity: Math.max(0, config.processing.max_file_count - checks.fileCount)
    },
    configuration: {
      embeddingModel: config.embeddings.model,
      chunkSize: config.chunking.max_tokens,
      llmEnabled: config.llm.enabled,
      llmModel: config.llm.model
    }
  });
});

module.exports = router;