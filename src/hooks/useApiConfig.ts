import { useState, useEffect, useCallback } from 'react';
import { 
  getApiBaseUrl, 
  setApiBaseUrl, 
  getApiToken,
  setApiToken,
  getShippedOrderStatus,
  setShippedOrderStatus,
  isApiConfigured,
  clearApiConfig 
} from '@/lib/api';
import { OrderStatus } from '@/types/order';
import { useQueryClient } from '@tanstack/react-query';

export function useApiConfig() {
  const [apiUrl, setApiUrlState] = useState('');
  const [apiToken, setApiTokenState] = useState('');
  const [shippedStatus, setShippedStatusState] = useState<OrderStatus>('completed');
  const [configured, setConfigured] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setApiUrlState(getApiBaseUrl());
    setApiTokenState(getApiToken());
    setShippedStatusState(getShippedOrderStatus());
    setConfigured(isApiConfigured());
  }, []);

  const saveApiUrl = useCallback((url: string) => {
    const cleanUrl = url.replace(/\/+$/, '');
    setApiBaseUrl(cleanUrl);
    setApiUrlState(cleanUrl);
    setConfigured(cleanUrl.length > 0);
    queryClient.invalidateQueries();
  }, [queryClient]);

  const saveApiToken = useCallback((token: string) => {
    setApiToken(token);
    setApiTokenState(token);
    queryClient.invalidateQueries();
  }, [queryClient]);

  const saveShippedStatus = useCallback((status: OrderStatus) => {
    setShippedOrderStatus(status);
    setShippedStatusState(status);
  }, []);

  const clearAll = useCallback(() => {
    clearApiConfig();
    setApiUrlState('');
    setApiTokenState('');
    setConfigured(false);
    queryClient.clear();
  }, [queryClient]);

  return {
    apiUrl,
    apiToken,
    shippedStatus,
    isConfigured: configured,
    saveApiUrl,
    saveApiToken,
    saveShippedStatus,
    clearApiUrl: clearAll,
  };
}
