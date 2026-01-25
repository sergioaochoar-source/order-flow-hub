import { FulfillmentStatus, Order } from '@/types/order';
import { OrderCard } from './OrderCard';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  status: FulfillmentStatus;
  orders: Order[];
  onOrderClick: (order: Order) => void;
  onDrop?: (orderId: string, newStatus: FulfillmentStatus) => void;
}

const columnConfig: Record<FulfillmentStatus, { title: string; color: string }> = {
  new: { title: 'New / Paid', color: 'bg-status-new' },
  qc: { title: 'QC', color: 'bg-status-qc' },
  pick: { title: 'Pick', color: 'bg-status-pick' },
  pack: { title: 'Pack', color: 'bg-status-pack' },
  label: { title: 'Label', color: 'bg-status-label' },
  shipped: { title: 'Shipped', color: 'bg-status-shipped' },
  issue: { title: 'Issue', color: 'bg-status-issue' },
};

export function KanbanColumn({ status, orders, onOrderClick, onDrop }: KanbanColumnProps) {
  const config = columnConfig[status];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('ring-2', 'ring-primary/30');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('ring-2', 'ring-primary/30');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('ring-2', 'ring-primary/30');
    const orderId = e.dataTransfer.getData('orderId');
    if (orderId && onDrop) {
      onDrop(orderId, status);
    }
  };

  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.setData('orderId', orderId);
  };

  return (
    <div 
      className="kanban-column h-full transition-all"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
        <div className={cn("w-2 h-2 rounded-full", config.color)} />
        <h3 className="font-semibold text-sm text-foreground">{config.title}</h3>
        <span className="ml-auto text-xs font-medium text-muted-foreground bg-background px-2 py-0.5 rounded-full">
          {orders.length}
        </span>
      </div>

      <div className="space-y-2 overflow-y-auto flex-1 scrollbar-thin">
        {orders.map((order) => (
          <div
            key={order.id}
            draggable
            onDragStart={(e) => handleDragStart(e, order.id)}
            className="cursor-grab active:cursor-grabbing"
          >
            <OrderCard
              order={order}
              onClick={() => onOrderClick(order)}
            />
          </div>
        ))}
        {orders.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No orders
          </div>
        )}
      </div>
    </div>
  );
}
