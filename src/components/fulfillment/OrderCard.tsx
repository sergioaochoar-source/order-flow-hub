import { Clock, Package, AlertTriangle } from 'lucide-react';
import { Order } from '@/types/order';
import { StatusBadge } from './StatusBadge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface OrderCardProps {
  order: Order;
  onClick?: () => void;
  isDragging?: boolean;
}

export function OrderCard({ order, onClick, isDragging }: OrderCardProps) {
  const timeAgo = formatDistanceToNow(new Date(order.createdAt), { addSuffix: true });
  const isUrgent = new Date().getTime() - new Date(order.createdAt).getTime() > 24 * 60 * 60 * 1000;
  const hasNotes = !!order.notes;

  return (
    <div
      className={cn(
        "order-card",
        isDragging && "shadow-lg ring-2 ring-primary/20"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{order.orderNumber}</span>
          {order.fulfillmentStage === 'issue' && (
            <AlertTriangle className="w-4 h-4 text-destructive" />
          )}
        </div>
        <StatusBadge status={order.fulfillmentStage} />
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground truncate">
          {order.customer.name}
        </p>
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            ${order.total.toFixed(2)}
          </span>
          <span className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{order.shippingMethod}</span>
          <span className={cn(
            "flex items-center gap-1",
            isUrgent ? "text-destructive" : "text-muted-foreground"
          )}>
            <Clock className="w-3 h-3" />
            {timeAgo}
          </span>
        </div>

        {hasNotes && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground italic truncate">
              📝 {order.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
