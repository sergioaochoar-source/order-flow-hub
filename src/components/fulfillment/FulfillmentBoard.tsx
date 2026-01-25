import { useMemo } from 'react';
import { FulfillmentStatus, Order } from '@/types/order';
import { KanbanColumn } from './KanbanColumn';
import { OrderDetailSheet } from './OrderDetailSheet';
import { useOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { ApiNotConfigured } from '@/components/ApiNotConfigured';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { isApiConfigured } from '@/lib/api';
import { useState } from 'react';

const statuses: FulfillmentStatus[] = ['new', 'qc', 'pick', 'pack', 'label', 'shipped', 'issue'];

export function FulfillmentBoard() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  const { data: orders = [], isLoading, isError, error, refetch } = useOrders();
  const updateStatusMutation = useUpdateOrderStatus();

  const ordersByStatus = useMemo(() => {
    const grouped: Record<FulfillmentStatus, Order[]> = {
      new: [],
      qc: [],
      pick: [],
      pack: [],
      label: [],
      shipped: [],
      issue: [],
    };
    
    orders.forEach((order) => {
      grouped[order.status].push(order);
    });
    
    return grouped;
  }, [orders]);

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setIsSheetOpen(true);
  };

  const handleStatusChange = (orderId: string, newStatus: FulfillmentStatus) => {
    updateStatusMutation.mutate({ orderId, status: newStatus });
    
    // Update selected order if it's the one being changed
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleUpdateOrder = (updatedOrder: Order) => {
    setSelectedOrder(updatedOrder);
    // The mutation will handle the server update and cache invalidation
  };

  // Show configuration prompt if API not set
  if (!isApiConfigured()) {
    return <ApiNotConfigured />;
  }

  // Loading state
  if (isLoading) {
    return <LoadingState message="Loading orders..." />;
  }

  // Error state
  if (isError) {
    return (
      <ErrorState 
        message={error instanceof Error ? error.message : 'Failed to load orders'} 
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="h-full">
      <div className="flex gap-4 overflow-x-auto pb-4 h-full scrollbar-thin">
        {statuses.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            orders={ordersByStatus[status]}
            onOrderClick={handleOrderClick}
            onDrop={handleStatusChange}
          />
        ))}
      </div>

      <OrderDetailSheet
        order={selectedOrder}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onStatusChange={(status) => {
          if (selectedOrder) {
            handleStatusChange(selectedOrder.id, status);
          }
        }}
        onUpdateOrder={handleUpdateOrder}
      />
    </div>
  );
}
