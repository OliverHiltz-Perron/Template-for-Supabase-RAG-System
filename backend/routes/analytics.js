const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

router.get('/queries', async (req, res) => {
  const { timeframe = '24h', limit = 100 } = req.query;
  
  // Calculate time filter
  const timeFilters = {
    '1h': new Date(Date.now() - 60 * 60 * 1000),
    '24h': new Date(Date.now() - 24 * 60 * 60 * 1000),
    '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  };
  
  const since = timeFilters[timeframe] || timeFilters['24h'];
  
  try {
    const { data, error } = await supabase
      .from('query_logs')
      .select('*')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    
    if (error) throw error;
    
    res.json({ queries: data || [] });
  } catch (error) {
    console.error('Analytics query error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/stats', async (req, res) => {
  const { timeframe = '24h' } = req.query;
  
  const timeFilters = {
    '1h': new Date(Date.now() - 60 * 60 * 1000),
    '24h': new Date(Date.now() - 24 * 60 * 60 * 1000),
    '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  };
  
  const since = timeFilters[timeframe] || timeFilters['24h'];
  
  try {
    // Get all queries in timeframe
    const { data: queries, error } = await supabase
      .from('query_logs')
      .select('query_text, result_count, response_time_ms, used_ai_synthesis, error_message')
      .gte('created_at', since.toISOString());
    
    if (error) throw error;
    
    // Calculate statistics
    const stats = {
      total_queries: queries.length,
      queries_with_results: queries.filter(q => q.result_count > 0).length,
      queries_with_no_results: queries.filter(q => q.result_count === 0 && !q.error_message).length,
      failed_queries: queries.filter(q => q.error_message).length,
      ai_synthesis_used: queries.filter(q => q.used_ai_synthesis).length,
      avg_response_time: queries.length > 0 
        ? Math.round(queries.reduce((sum, q) => sum + (q.response_time_ms || 0), 0) / queries.length)
        : 0,
      avg_results_per_query: queries.length > 0
        ? (queries.reduce((sum, q) => sum + (q.result_count || 0), 0) / queries.length).toFixed(1)
        : 0
    };
    
    // Find top queries
    const queryFrequency = {};
    queries.forEach(q => {
      const text = q.query_text.toLowerCase().trim();
      queryFrequency[text] = (queryFrequency[text] || 0) + 1;
    });
    
    const topQueries = Object.entries(queryFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));
    
    // Find queries with no results
    const noResultQueries = queries
      .filter(q => q.result_count === 0 && !q.error_message)
      .map(q => q.query_text)
      .filter((q, i, arr) => arr.indexOf(q) === i) // unique
      .slice(0, 10);
    
    res.json({
      timeframe,
      since: since.toISOString(),
      stats,
      top_queries: topQueries,
      queries_with_no_results: noResultQueries
    });
  } catch (error) {
    console.error('Analytics stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;