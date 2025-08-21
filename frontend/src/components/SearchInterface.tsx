import React, { useState, useCallback } from 'react';
import { searchDocuments } from '../services/api';
import SearchBar from './SearchBar';
import ResultsList from './ResultsList';
import AIResponse from './AIResponse';

const SearchInterface: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [aiResponse, setAIResponse] = useState<any>(null);
  const [useAI, setUseAI] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setAIResponse(null);

    try {
      const response = await searchDocuments(searchQuery, useAI);
      setResults(response.results || []);
      if (response.synthesis) {
        setAIResponse(response.synthesis);
      }
    } catch (err: any) {
      setError(err.message || 'Search failed. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [useAI]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Search Your Documents</h2>
        
        <SearchBar
          query={query}
          setQuery={setQuery}
          onSearch={handleSearch}
          loading={loading}
        />

        <div className="mt-4 flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useAI}
              onChange={(e) => setUseAI(e.target.checked)}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="text-sm text-gray-700">
              Use AI to synthesize answer
            </span>
          </label>
          
          <span className="text-xs text-gray-500">
            (Provides contextual answers using GPT-4)
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {!loading && aiResponse && (
        <AIResponse response={aiResponse} />
      )}

      {!loading && results.length > 0 && (
        <ResultsList results={results} />
      )}

      {!loading && query && results.length === 0 && !error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-700">
            No results found for "{query}". Try different keywords or add more documents.
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchInterface;