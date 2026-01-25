import { useMemo, useState } from 'react';
import { FulfillmentStage, Order, TrackingPayload } from '@/types/order';
import { KanbanColumn } from './KanbanColumn';
import { OrderDetailSheet } from './OrderDetailSheet';
import { ShipConfirmDialog } from './ShipConfirmDialog';
import { useAllOrders, useUpdateOrderStatus, useAddTracking } from '@/hooks/useOrders';
import { ApiNotConfigured } from '@/components/ApiNotConfigured';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { isApiConfigured } from '@/lib/api';
import { isValidTransition } from '@/lib/fulfillmentRules';
import { toast } from 'sonner';

const stages: FulfillmentStage[] = ['new', 'qc', 'pick', 'pack', 'label', 'shipped', 'issue'];

export function FulfillmentBoard() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  // Confirmation dialog state
  const [showShipConfirm, setShowShipConfirm] = useState(false);
  const [pendingShipment, setPendingShipment] = useState<{
    order: Order;
    payload: TrackingPayload;
  } | null>(null);
  
  const { data: orders = [], isLoading, isError, error, refetch } = useAllOrders();
  const updateStatusMutation = useUpdateOrderStatus();
  const addTrackingMutation = useAddTracking();

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
    // Find the order to validate
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

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
    // If the order is being marked as shipped with tracking, show confirmation dialog
    if (updatedOrder.fulfillmentStage === 'shipped' && updatedOrder.shipment) {
      setPendingShipment({
        order: updatedOrder,
        payload: {
          carrier: updatedOrder.shipment.carrier,
          tracking: updatedOrder.shipment.trackingNumber,
          service: updatedOrder.shipment.service,
          shippedAt: updatedOrder.shipment.shippedAt,
        },
      });
      setShowShipConfirm(true);
    } else {
      // For non-tracking updates, just update local state
      setSelectedOrder(updatedOrder);
    }
  };

  const handleConfirmShipment = () => {
    if (!pendingShipment) return;

    addTrackingMutation.mutate(
      {
        orderId: pendingShipment.order.id,
        payload: pendingShipment.payload,
      },
      {
        onSuccess: () => {
          setShowShipConfirm(false);
          setPendingShipment(null);
          setIsSheetOpen(false);
          setSelectedOrder(null);
        },
        onError: () => {
          setShowShipConfirm(false);
        },
      }
    );
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

      {/* Ship Confirmation Dialog */}
      <ShipConfirmDialog
        open={showShipConfirm}
        onOpenChange={(open) => {
          setShowShipConfirm(open);
          if (!open) setPendingShipment(null);
        }}
        orderNumber={pendingShipment?.order.orderNumber || ''}
        carrier={pendingShipment?.payload.carrier || ''}
        trackingNumber={pendingShipment?.payload.tracking || ''}
        onConfirm={handleConfirmShipment}
        isLoading={addTrackingMutation.isPending}
      />
    </div>
  );
}
