import { useState, useMemo } from 'react';
import { FulfillmentStatus, Order } from '@/types/order';
import { KanbanColumn } from './KanbanColumn';
import { OrderDetailSheet } from './OrderDetailSheet';
import { mockOrders } from '@/lib/mockData';
import { toast } from 'sonner';

const statuses: FulfillmentStatus[] = ['new', 'qc', 'pick', 'pack', 'label', 'shipped', 'issue'];

export function FulfillmentBoard() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? { 
              ...order, 
              status: newStatus,
              updatedAt: new Date().toISOString(),
              events: [
                ...order.events,
                {
                  id: `evt_${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  type: 'status_change' as const,
                  description: `Status changed to ${newStatus}`,
                  user: 'Current User'
                }
              ]
            }
          : order
      )
    );
    toast.success(`Order moved to ${newStatus.toUpperCase()}`);
  };

  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
    );
    setSelectedOrder(updatedOrder);
  };

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
            setSelectedOrder({ ...selectedOrder, status });
          }
        }}
        onUpdateOrder={handleUpdateOrder}
      />
    </div>
  );
}
