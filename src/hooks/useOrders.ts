import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchOrders, 
  fetchOrderById, 
  updateOrderStatus, 
  addOrderTracking,
  updateOrderNotes,
  isApiConfigured 
} from '@/lib/api';
import { Order, FulfillmentStatus } from '@/types/order';
import { toast } from 'sonner';

// Query Keys
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: string) => [...orderKeys.lists(), { filters }] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};

// Fetch all orders
export function useOrders() {
  return useQuery({
    queryKey: orderKeys.lists(),
    queryFn: fetchOrders,
    enabled: isApiConfigured(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

// Fetch single order
export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => fetchOrderById(id),
    enabled: isApiConfigured() && !!id,
  });
}

// Update order status mutation
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: FulfillmentStatus }) =>
      updateOrderStatus(orderId, status),
    onMutate: async ({ orderId, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: orderKeys.lists() });

      // Snapshot previous value
      const previousOrders = queryClient.getQueryData<Order[]>(orderKeys.lists());

      // Optimistically update
      queryClient.setQueryData<Order[]>(orderKeys.lists(), (old) =>
        old?.map((order) =>
          order.id === orderId
            ? { ...order, status, updatedAt: new Date().toISOString() }
            : order
        )
      );

      return { previousOrders };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousOrders) {
        queryClient.setQueryData(orderKeys.lists(), context.previousOrders);
      }
      toast.error(`Failed to update status: ${err.message}`);
    },
    onSuccess: (data, { status }) => {
      toast.success(`Order moved to ${status.toUpperCase()}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

// Add tracking mutation
export function useAddTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      carrier,
      trackingNumber,
    }: {
      orderId: string;
      carrier: string;
      trackingNumber: string;
    }) => addOrderTracking(orderId, carrier, trackingNumber),
    onSuccess: (data, { orderId }) => {
      toast.success(`Tracking added for order ${data.orderNumber}`);
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
    },
    onError: (err) => {
      toast.error(`Failed to add tracking: ${err.message}`);
    },
  });
}

// Update notes mutation
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
