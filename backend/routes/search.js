const express = require('express');
const router = express.Router();
const { SearchService } = require('../services/searchService');
const { QueryLogger } = require('../services/queryLogger');
const NodeCache = require('node-cache');

const searchService = new SearchService();
const queryLogger = new QueryLogger();
const cache = new NodeCache({ stdTTL: 300 }); // 5 minute cache

router.post('/', async (req, res) => {
  const startTime = Date.now();
  const { query, useAI = false, limit = 10 } = req.body;

  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: 'Query is required' });
  }

  // Check cache
  const cacheKey = `${query}-${useAI}-${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    // Log cached response
    await queryLogger.logQuery({
      query_text: query,
      result_count: cached.results.length,
      used_ai_synthesis: useAI,
      response_time_ms: Date.now() - startTime,
      retrieved_chunk_ids: cached.results.map(r => r.id),
      cached: true
    });
    return res.json(cached);
  }

  try {
    // Perform search
    const results = await searchService.search(query, limit);
    
    let response = { results };
    
    // Optional AI synthesis
    if (useAI && results.length > 0) {
      const synthesis = await searchService.synthesizeAnswer(query, results);
      response.synthesis = synthesis;
    }

    // Cache response
    cache.set(cacheKey, response);

    // Log query
    await queryLogger.logQuery({
      query_text: query,
      result_count: results.length,
      used_ai_synthesis: useAI,
      response_time_ms: Date.now() - startTime,
      retrieved_chunk_ids: results.map(r => r.id)
    });

    res.json(response);
  } catch (error) {
    console.error('Search error:', error);
    
    // Log failed query
    await queryLogger.logQuery({
      query_text: query,
      result_count: 0,
      used_ai_synthesis: useAI,
      response_time_ms: Date.now() - startTime,
      error_message: error.message
    });

    res.status(500).json({
      error: 'Search failed',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/suggestions', async (req, res) => {
  const { prefix } = req.query;
  
  try {
    const suggestions = await searchService.getSuggestions(prefix);
    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

module.exports = router;