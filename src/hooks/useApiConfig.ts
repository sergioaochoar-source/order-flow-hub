import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl, setApiBaseUrl, isApiConfigured } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

export function useApiConfig() {
  const [apiUrl, setApiUrl] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const savedUrl = getApiBaseUrl();
    setApiUrl(savedUrl);
    setIsConfigured(isApiConfigured());
  }, []);

  const saveApiUrl = useCallback((url: string) => {
    // Remove trailing slash if present
    const cleanUrl = url.replace(/\/+$/, '');
    setApiBaseUrl(cleanUrl);
    setApiUrl(cleanUrl);
    setIsConfigured(cleanUrl.length > 0);
    
    // Invalidate all queries to refetch with new URL
    queryClient.invalidateQueries();
  }, [queryClient]);

  const clearApiUrl = useCallback(() => {
    setApiBaseUrl('');
    setApiUrl('');
    setIsConfigured(false);
    queryClient.clear();
  }, [queryClient]);

  return {
    apiUrl,
    isConfigured,
    saveApiUrl,
    clearApiUrl,
  };
}
