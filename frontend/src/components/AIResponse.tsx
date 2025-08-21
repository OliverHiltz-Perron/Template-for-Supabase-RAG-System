import React from 'react';

interface AIResponseProps {
  response: {
    answer: string;
    model: string;
    chunks_used: number;
  };
}

const AIResponse: React.FC<AIResponseProps> = ({ response }) => {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-200 p-6">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            AI-Generated Answer
          </h3>
          <div className="prose prose-sm max-w-none text-gray-700">
            <p className="whitespace-pre-wrap">{response.answer}</p>
          </div>
          <div className="mt-4 flex items-center space-x-4 text-xs text-gray-500">
            <span>Model: {response.model}</span>
            <span>•</span>
            <span>Based on {response.chunks_used} document chunks</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIResponse;