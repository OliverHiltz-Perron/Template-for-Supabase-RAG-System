import React, { useState } from 'react';
import SearchInterface from './components/SearchInterface';
import HealthStatus from './components/HealthStatus';
import Analytics from './components/Analytics';

function App() {
  const [showAnalytics, setShowAnalytics] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Supabase RAG Search
            </h1>
            <div className="flex items-center space-x-4">
              <HealthStatus />
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {showAnalytics ? 'Hide' : 'Show'} Analytics
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showAnalytics ? (
          <Analytics />
        ) : (
          <SearchInterface />
        )}
      </main>

      <footer className="mt-16 border-t bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-sm text-gray-500">
            Powered by Supabase, OpenAI, and React
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;