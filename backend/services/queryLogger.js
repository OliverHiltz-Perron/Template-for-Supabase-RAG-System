const { createClient } = require('@supabase/supabase-js');
const config = require('../../config.json');

class QueryLogger {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  }

  async logQuery(queryData) {
    if (!config.logging.query_logging) {
      return;
    }

    // Don't log failed queries if disabled
    if (queryData.error_message && !config.logging.log_failed_queries) {
      return;
    }

    try {
      const logEntry = {
        query_text: queryData.query_text,
        result_count: queryData.result_count || 0,
        used_ai_synthesis: queryData.used_ai_synthesis || false,
        response_time_ms: queryData.response_time_ms || 0,
        retrieved_chunk_ids: queryData.retrieved_chunk_ids || [],
        error_message: queryData.error_message || null
      };

      const { error } = await this.supabase
        .from('query_logs')
        .insert([logEntry]);

      if (error) {
        console.error('Failed to log query:', error);
      }
    } catch (error) {
      console.error('Query logging error:', error);
      // Don't throw - logging failures shouldn't break the app
    }
  }

  async getQueryStats(timeframeDays = 7) {
    const since = new Date();
    since.setDate(since.getDate() - timeframeDays);

    try {
      const { data, error } = await this.supabase
        .from('query_logs')
        .select('*')
        .gte('created_at', since.toISOString());

      if (error) throw error;

      return this.calculateStats(data || []);
    } catch (error) {
      console.error('Failed to get query stats:', error);
      return null;
    }
  }

  calculateStats(queries) {
    if (queries.length === 0) {
      return {
        total: 0,
        avgResponseTime: 0,
        successRate: 0,
        aiUsageRate: 0
      };
    }

    const successful = queries.filter(q => !q.error_message);
    const withAI = queries.filter(q => q.used_ai_synthesis);
    const totalResponseTime = queries.reduce((sum, q) => sum + (q.response_time_ms || 0), 0);

    return {
      total: queries.length,
      avgResponseTime: Math.round(totalResponseTime / queries.length),
      successRate: (successful.length / queries.length) * 100,
      aiUsageRate: (withAI.length / queries.length) * 100,
      avgResultCount: successful.reduce((sum, q) => sum + q.result_count, 0) / successful.length
    };
  }
}

module.exports = { QueryLogger };