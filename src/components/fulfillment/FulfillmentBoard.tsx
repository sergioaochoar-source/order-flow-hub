import { useMemo, useState } from 'react';
import { FulfillmentStage, Order } from '@/types/order';
import { KanbanColumn } from './KanbanColumn';
import { OrderDetailSheet } from './OrderDetailSheet';
import { useAllOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyOrdersState } from '@/components/EmptyOrdersState';
import { isValidTransition } from '@/lib/fulfillmentRules';
import { toast } from 'sonner';

const stages: FulfillmentStage[] = ['new', 'label', 'shipped', 'delivered', 'issue'];

export function FulfillmentBoard() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  const { data: orders = [], isLoading, isError, error, refetch } = useAllOrders();
  const updateStatusMutation = useUpdateOrderStatus();

  const ordersByStage = useMemo(() => {
    const grouped: Record<FulfillmentStage, Order[]> = {
      new: [],
      label: [],
      shipped: [],
      delivered: [],
      issue: [],
    };
    
    orders.forEach((order) => {
      // Handle legacy stages (qc, pick, pack) by mapping to 'label'
      const stage = grouped[order.fulfillmentStage] ? order.fulfillmentStage : 'label';
      grouped[stage].push(order);
    });
    
    return grouped;
  }, [orders]);

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setIsSheetOpen(true);
  };

  const handleStageChange = (orderId: string, newStage: FulfillmentStage) => {
    // Find the order to validate
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Special case: moving to "shipped" should always go through the
    // tracking-prompt flow inside OrderDetailSheet, so the user can
    // enter the tracking number and trigger the shipping email.
    if (newStage === 'shipped' && order.fulfillmentStage !== 'shipped') {
      setSelectedOrder(order);
      setIsSheetOpen(true);
      toast.info('Ingresa el tracking number para marcar como Enviado');
      return;
    }

    // Validate the transition
    const validation = isValidTransition(order, order.fulfillmentStage, newStage);
    if (!validation.valid) {
      toast.error(validation.message || 'Invalid stage transition');
      return;
    }

    updateStatusMutation.mutate({ orderId, status: newStage });
    
    // Update selected order if it's the one being changed
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, fulfillmentStage: newStage } : null);
    }
  };

  const handleUpdateOrder = (updatedOrder: Order) => {
    // OrderDetailSheet now handles tracking mutation internally
    // Just update local state for immediate UI feedback
    setSelectedOrder(updatedOrder);
  };

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

  // Empty state
  if (orders.length === 0) {
    return <EmptyOrdersState />;
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
