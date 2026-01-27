import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchOrders, 
  fetchOrderById, 
  updateOrderStatus, 
  addOrderTracking,
  updateOrderNotes,
  isCloudApiConfigured 
} from '@/lib/cloudApi';
import { sendStatusUpdate } from '@/lib/emailApi';
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

// ============ Fetch Paid Orders with Filters ============
export function useOrders(filters: OrderFilters = {}) {
  return useQuery({
    queryKey: orderKeys.list({ ...filters, paidOnly: true }),
    queryFn: () => fetchOrders({ ...filters, paidOnly: true }),
    enabled: isCloudApiConfigured(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    select: (data: PaginatedResponse<Order>) => data,
  });
}

// ============ Fetch Unpaid/Prospect Orders ============
export function useProspectOrders(filters: OrderFilters = {}) {
  return useQuery({
    queryKey: orderKeys.list({ ...filters, unpaidOnly: true }),
    queryFn: () => fetchOrders({ ...filters, unpaidOnly: true }),
    enabled: isCloudApiConfigured(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    select: (data: PaginatedResponse<Order>) => data,
  });
}

// ============ Fetch All Paid Orders (for Kanban) ============
export function useAllOrders() {
  return useQuery({
    queryKey: orderKeys.lists(),
    queryFn: () => fetchOrders({ limit: 1000, paidOnly: true }),
    enabled: isCloudApiConfigured(),
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
    enabled: isCloudApiConfigured() && !!id,
  });
}

// ============ Update Order Status (Optimistic) ============
// Email notifications for stage changes are disabled
// Only 3 emails are sent: Thank You (on payment), Shipping (on tracking), Follow-up (2 weeks after)
const EMAIL_NOTIFICATION_STAGES: FulfillmentStage[] = []; // Disabled - no status update emails

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status, order }: { orderId: string; status: FulfillmentStage; order?: Order }) => {
      const result = await updateOrderStatus(orderId, status);
      return { result, order, newStatus: status };
    },
    
    onMutate: async ({ orderId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: orderKeys.lists() });

      // Snapshot all list queries
      const queryCache = queryClient.getQueryCache();
      const listQueries = queryCache.findAll({ queryKey: orderKeys.lists() });
      
      const previousData: Record<string, unknown> = {};
      
      // Find the order data before update for email sending
      let orderData: Order | undefined;
      
      listQueries.forEach((query) => {
        const key = JSON.stringify(query.queryKey);
        previousData[key] = query.state.data;
        
        // Try to find the order in this query's data
        const data = query.state.data as PaginatedResponse<Order> | Order[] | undefined;
        if (data && !orderData) {
          const orders = Array.isArray(data) ? data : data.data;
          orderData = orders?.find(o => o.id === orderId);
        }
        
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

      return { previousData, listQueries, orderData };
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
    
    onSuccess: async (data, { status }, context) => {
      toast.success(`Order moved to ${status.toUpperCase()}`);
      
      // Send email notification for specific stages (not 'new', 'shipped', or 'issue')
      // 'shipped' is handled separately when tracking is added
      const order = context?.orderData;
      if (order && EMAIL_NOTIFICATION_STAGES.includes(status) && order.customer?.email) {
        try {
          await sendStatusUpdate({
            to: order.customer.email,
            orderNumber: order.orderNumber,
            customerName: order.customer.name,
            newStatus: status,
          });
          console.log(`[Email] Status update sent for order #${order.orderNumber} -> ${status}`);
        } catch (emailError) {
          // Don't show error to user - email is secondary
          console.error('[Email] Failed to send status update:', emailError);
        }
      }
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
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to update notes: ${errorMessage}`);
    },
  });
}
