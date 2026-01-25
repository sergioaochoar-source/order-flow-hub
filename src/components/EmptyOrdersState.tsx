import { Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyOrdersStateProps {
  title?: string;
  description?: string;
  showAddButton?: boolean;
  onAddClick?: () => void;
}

export function EmptyOrdersState({ 
  title = "No Orders Yet",
  description = "Your fulfillment board is empty. Orders will appear here once they are synced from WooCommerce or added manually.",
  showAddButton = false,
  onAddClick
}: EmptyOrdersStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Package className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      {showAddButton && onAddClick && (
        <Button onClick={onAddClick} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Test Order
        </Button>
      )}
    </div>
  );
}
