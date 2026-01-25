import { useQuery } from '@tanstack/react-query';
import { fetchDashboardMetrics, isCloudApiConfigured } from '@/lib/cloudApi';

export const metricsKeys = {
  all: ['metrics'] as const,
  dashboard: () => [...metricsKeys.all, 'dashboard'] as const,
};

export function useDashboardMetrics() {
  return useQuery({
    queryKey: metricsKeys.dashboard(),
    queryFn: fetchDashboardMetrics,
    enabled: isCloudApiConfigured(),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}
