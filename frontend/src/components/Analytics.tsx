import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAnalytics } from '../services/api';

const Analytics: React.FC = () => {
  const [timeframe, setTimeframe] = useState('24h');

  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['analytics', timeframe],
    queryFn: () => getAnalytics(timeframe),
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Failed to load analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Query Analytics</h2>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Queries"
            value={analytics?.stats?.total_queries || 0}
            icon="search"
          />
          <StatCard
            title="Avg Response Time"
            value={`${analytics?.stats?.avg_response_time || 0}ms`}
            icon="clock"
          />
          <StatCard
            title="Success Rate"
            value={`${Math.round(
              ((analytics?.stats?.queries_with_results || 0) /
                (analytics?.stats?.total_queries || 1)) *
                100
            )}%`}
            icon="check"
          />
          <StatCard
            title="AI Usage"
            value={`${Math.round(
              ((analytics?.stats?.ai_synthesis_used || 0) /
                (analytics?.stats?.total_queries || 1)) *
                100
            )}%`}
            icon="ai"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Top Queries
            </h3>
            <div className="space-y-2">
              {analytics?.top_queries?.length > 0 ? (
                analytics.top_queries.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <span className="text-sm text-gray-700 truncate flex-1">
                      {item.query}
                    </span>
                    <span className="text-sm font-medium text-gray-500 ml-2">
                      {item.count}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No queries yet</p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Queries with No Results
            </h3>
            <div className="space-y-2">
              {analytics?.queries_with_no_results?.length > 0 ? (
                analytics.queries_with_no_results.map(
                  (query: string, index: number) => (
                    <div
                      key={index}
                      className="py-2 border-b last:border-0"
                    >
                      <span className="text-sm text-gray-700">{query}</span>
                    </div>
                  )
                )
              ) : (
                <p className="text-sm text-gray-500">
                  All queries returned results
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
  const icons = {
    search: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    clock: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    check: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    ai: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <span className="text-gray-400">
          {icons[icon as keyof typeof icons]}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
};

export default Analytics;