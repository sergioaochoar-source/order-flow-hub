import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchOrders, 
  fetchOrderById, 
  updateOrderStatus, 
  addOrderTracking,
  updateOrderNotes,
  isApiConfigured 
} from '@/lib/api';
import { Order, FulfillmentStage, OrderFilters, PaginatedResponse, TrackingPayload } from '@/types/order';
import { toast } from 'sonner';

// ============ Query Keys ============
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: OrderFilters) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};

// ============ Fetch Orders with Filters ============
export function useOrders(filters: OrderFilters = {}) {
  return useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: () => fetchOrders(filters),
    enabled: isApiConfigured(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    select: (data: PaginatedResponse<Order>) => data,
  });
}

// ============ Fetch All Orders (for Kanban) ============
export function useAllOrders() {
  return useQuery({
    queryKey: orderKeys.lists(),
    queryFn: () => fetchOrders({ limit: 1000 }),
    enabled: isApiConfigured(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    select: (data: PaginatedResponse<Order>) => data.data,
  });
}

// ============ Fetch Single Order ============
export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => fetchOrderById(id),
    enabled: isApiConfigured() && !!id,
  });
}

// ============ Update Order Status (Optimistic) ============
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: FulfillmentStage }) =>
      updateOrderStatus(orderId, status),
    
    onMutate: async ({ orderId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: orderKeys.lists() });

      // Snapshot all list queries
      const queryCache = queryClient.getQueryCache();
      const listQueries = queryCache.findAll({ queryKey: orderKeys.lists() });
      
      const previousData: Record<string, unknown> = {};
      
      listQueries.forEach((query) => {
        const key = JSON.stringify(query.queryKey);
        previousData[key] = query.state.data;
        
        // Optimistically update each list query
        queryClient.setQueryData<PaginatedResponse<Order> | Order[]>(
          query.queryKey,
          (old) => {
            if (!old) return old;
            
            // Handle both PaginatedResponse and raw array
            if (Array.isArray(old)) {
              return old.map((order) =>
                order.id === orderId
                  ? { ...order, fulfillmentStage: status, updatedAt: new Date().toISOString() }
                  : order
              );
            }
            
            return {
              ...old,
              data: old.data.map((order) =>
                order.id === orderId
                  ? { ...order, fulfillmentStage: status, updatedAt: new Date().toISOString() }
                  : order
              ),
            };
          }
        );
      });

      return { previousData, listQueries };
    },
    
    onError: (err, variables, context) => {
      // Rollback all queries
      if (context?.previousData && context?.listQueries) {
        context.listQueries.forEach((query) => {
          const key = JSON.stringify(query.queryKey);
          if (context.previousData[key]) {
            queryClient.setQueryData(query.queryKey, context.previousData[key]);
          }
        });
      }
      
      // Show user-friendly error from backend
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(errorMessage, {
        description: 'The server rejected this status change.',
        duration: 5000,
      });
    },
    
    onSuccess: (data, { status }) => {
      toast.success(`Order moved to ${status.toUpperCase()}`);
    },
    
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

// ============ Add Tracking (Optimistic) ============
export function useAddTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: TrackingPayload }) =>
      addOrderTracking(orderId, payload),
    
    onMutate: async ({ orderId, payload }) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.lists() });
      
      const queryCache = queryClient.getQueryCache();
      const listQueries = queryCache.findAll({ queryKey: orderKeys.lists() });
      
      const previousData: Record<string, unknown> = {};
      
      listQueries.forEach((query) => {
        const key = JSON.stringify(query.queryKey);
        previousData[key] = query.state.data;
        
        queryClient.setQueryData<PaginatedResponse<Order> | Order[]>(
          query.queryKey,
          (old) => {
            if (!old) return old;
            
            const updateOrder = (order: Order): Order => {
              if (order.id !== orderId) return order;
              return {
                ...order,
                fulfillmentStage: 'shipped',
                shipment: {
                  carrier: payload.carrier,
                  trackingNumber: payload.tracking,
                  service: payload.service,
                  shippedAt: payload.shippedAt || new Date().toISOString(),
                },
                updatedAt: new Date().toISOString(),
              };
            };
            
            if (Array.isArray(old)) {
              return old.map(updateOrder);
            }
            
            return {
              ...old,
              data: old.data.map(updateOrder),
            };
          }
        );
      });

      return { previousData, listQueries };
    },
    
    onError: (err, variables, context) => {
      if (context?.previousData && context?.listQueries) {
        context.listQueries.forEach((query) => {
          const key = JSON.stringify(query.queryKey);
          if (context.previousData[key]) {
            queryClient.setQueryData(query.queryKey, context.previousData[key]);
          }
        });
      }
      
      // Show user-friendly error from backend
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(errorMessage, {
        description: 'Failed to save tracking information.',
        duration: 5000,
      });
    },
    
    onSuccess: (data) => {
      toast.success(`Tracking added for order ${data.orderNumber}`);
    },
    
    onSettled: (data, error, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
    },
  });
}

// ============ Update Notes ============
export function useUpdateOrderNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, notes }: { orderId: string; notes: string }) =>
      updateOrderNotes(orderId, notes),
    onSuccess: (data, { orderId }) => {
      toast.success('Notes updated');
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
    onError: (err) => {
      toast.error(`Failed to update notes: ${err.message}`);
    },
  });
}
