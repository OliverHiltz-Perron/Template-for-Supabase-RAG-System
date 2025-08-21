const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
const config = require('../../config.json');

class SearchService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async search(query, limit = 10) {
    // Generate embedding for query
    const queryEmbedding = await this.generateQueryEmbedding(query);
    
    // Search using Supabase RPC function
    const { data, error } = await this.supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_count: config.retrieval.initial_candidates
    });

    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }

    // Apply reranking if enabled
    let results = data || [];
    if (config.retrieval.reranker.enabled && process.env.JINA_API_KEY) {
      results = await this.rerankResults(query, results);
    }

    // Return top results
    return results.slice(0, Math.min(limit, config.retrieval.final_results));
  }

  async generateQueryEmbedding(query) {
    try {
      const response = await this.openai.embeddings.create({
        model: config.embeddings.model,
        input: query
      });
      
      return response.data[0].embedding;
    } catch (error) {
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  async rerankResults(query, results) {
    // Placeholder for Jina reranking implementation
    // In production, this would call the Jina API
    console.log('Reranking enabled but not implemented in this template');
    return results;
  }

  async synthesizeAnswer(query, chunks) {
    if (!config.llm.enabled) {
      return null;
    }

    const context = chunks
      .map(chunk => chunk.content)
      .join('\n\n---\n\n');

    const systemPrompt = `You are a helpful assistant that answers questions based on the provided context.
Only use information from the context to answer. If the context doesn't contain relevant information, say so.
Be concise and accurate in your response.`;

    const userPrompt = `Context:\n${context}\n\nQuestion: ${query}\n\nAnswer:`;

    try {
      const response = await this.openai.chat.completions.create({
        model: config.llm.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: config.llm.max_tokens,
        temperature: config.llm.temperature
      });

      return {
        answer: response.choices[0].message.content,
        model: config.llm.model,
        chunks_used: chunks.length
      };
    } catch (error) {
      console.error('LLM synthesis error:', error);
      return null;
    }
  }

  async getSuggestions(prefix) {
    if (!prefix || prefix.length < 2) {
      return [];
    }

    // Get recent successful queries that match the prefix
    const { data, error } = await this.supabase
      .from('query_logs')
      .select('query_text')
      .ilike('query_text', `${prefix}%`)
      .gt('result_count', 0)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Suggestions error:', error);
      return [];
    }

    // Return unique suggestions
    const unique = [...new Set(data.map(item => item.query_text))];
    return unique.slice(0, 5);
  }
}

module.exports = { SearchService };