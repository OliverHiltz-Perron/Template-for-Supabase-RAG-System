import React from 'react';

interface Result {
  id: number;
  content: string;
  metadata?: any;
  source_file: string;
  source_type: string;
  chunk_index: number;
  similarity: number;
}

interface ResultsListProps {
  results: Result[];
}

const ResultsList: React.FC<ResultsListProps> = ({ results }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Search Results ({results.length})
      </h3>
      
      <div className="space-y-3">
        {results.map((result) => (
          <div
            key={result.id}
            className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">
                  {result.source_file}
                </span>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                  {result.source_type}
                </span>
                <span className="text-xs text-gray-500">
                  Chunk #{result.chunk_index + 1}
                </span>
              </div>
              <span className="text-xs font-medium text-green-600">
                {(result.similarity * 100).toFixed(1)}% match
              </span>
            </div>
            
            <div className="text-sm text-gray-700 leading-relaxed">
              <p className="line-clamp-4">
                {result.content}
              </p>
            </div>
            
            {result.metadata && Object.keys(result.metadata).length > 0 && (
              <div className="mt-2 pt-2 border-t">
                <details className="text-xs text-gray-500">
                  <summary className="cursor-pointer hover:text-gray-700">
                    Metadata
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-50 rounded overflow-x-auto">
                    {JSON.stringify(result.metadata, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultsList;