import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { checkHealth } from '../services/api';

const HealthStatus: React.FC = () => {
  const { data: health, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: checkHealth,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-500">Checking...</span>
      </div>
    );
  }

  const status = health?.status || 'unknown';
  const statusColors = {
    operational: 'bg-green-500',
    degraded: 'bg-yellow-500',
    down: 'bg-red-500',
    unknown: 'bg-gray-400',
  };

  return (
    <div className="flex items-center space-x-2">
      <div
        className={`w-2 h-2 rounded-full ${
          statusColors[status as keyof typeof statusColors]
        }`}
      ></div>
      <span className="text-sm text-gray-700 capitalize">{status}</span>
      {health?.limits && (
        <span className="text-xs text-gray-500">
          ({health.limits.processedFiles}/{health.limits.maxFiles} docs)
        </span>
      )}
    </div>
  );
};

export default HealthStatus;