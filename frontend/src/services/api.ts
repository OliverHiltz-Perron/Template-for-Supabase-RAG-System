import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface SearchResponse {
  results: Array<{
    id: number;
    content: string;
    metadata?: any;
    source_file: string;
    source_type: string;
    chunk_index: number;
    similarity: number;
  }>;
  synthesis?: {
    answer: string;
    model: string;
    chunks_used: number;
  };
}

export const searchDocuments = async (
  query: string,
  useAI: boolean = false,
  limit: number = 10
): Promise<SearchResponse> => {
  const response = await api.post('/search', {
    query,
    useAI,
    limit,
  });
  return response.data;
};

export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const getAnalytics = async (timeframe: string = '24h') => {
  const response = await api.get('/analytics/stats', {
    params: { timeframe },
  });
  return response.data;
};

export const getSuggestions = async (prefix: string) => {
  const response = await api.get('/search/suggestions', {
    params: { prefix },
  });
  return response.data.suggestions;
};