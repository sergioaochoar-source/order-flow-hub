import { useMemo, useState } from 'react';
import { FulfillmentStage, Order } from '@/types/order';
import { KanbanColumn } from './KanbanColumn';
import { OrderDetailSheet } from './OrderDetailSheet';
import { useAllOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { ApiNotConfigured } from '@/components/ApiNotConfigured';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { isApiConfigured } from '@/lib/api';

const stages: FulfillmentStage[] = ['new', 'qc', 'pick', 'pack', 'label', 'shipped', 'issue'];

export function FulfillmentBoard() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  const { data: orders = [], isLoading, isError, error, refetch } = useAllOrders();
  const updateStatusMutation = useUpdateOrderStatus();

  const ordersByStage = useMemo(() => {
    const grouped: Record<FulfillmentStage, Order[]> = {
      new: [],
      qc: [],
      pick: [],
      pack: [],
      label: [],
      shipped: [],
      issue: [],
    };
    
    orders.forEach((order) => {
      grouped[order.fulfillmentStage].push(order);
    });
    
    return grouped;
  }, [orders]);

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setIsSheetOpen(true);
  };

  const handleStageChange = (orderId: string, newStage: FulfillmentStage) => {
    updateStatusMutation.mutate({ orderId, status: newStage });
    
    // Update selected order if it's the one being changed
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, fulfillmentStage: newStage } : null);
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
        {stages.map((stage) => (
          <KanbanColumn
            key={stage}
            status={stage}
            orders={ordersByStage[stage]}
            onOrderClick={handleOrderClick}
            onDrop={handleStageChange}
          />
        ))}
      </div>

      <OrderDetailSheet
        order={selectedOrder}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onStatusChange={(stage) => {
          if (selectedOrder) {
            handleStageChange(selectedOrder.id, stage);
          }
        }}
        onUpdateOrder={handleUpdateOrder}
      />
    </div>
  );
}
