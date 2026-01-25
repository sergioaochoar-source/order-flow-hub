import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Truck } from 'lucide-react';

interface ShipConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
  carrier: string;
  trackingNumber: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ShipConfirmDialog({
  open,
  onOpenChange,
  orderNumber,
  carrier,
  trackingNumber,
  onConfirm,
  isLoading = false,
}: ShipConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <AlertDialogTitle>Confirm Shipment</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to mark order <strong>{orderNumber}</strong> as shipped?
            </p>
            <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
              <p><span className="text-muted-foreground">Carrier:</span> <strong>{carrier}</strong></p>
              <p><span className="text-muted-foreground">Tracking:</span> <strong>{trackingNumber}</strong></p>
            </div>
            <p className="text-warning text-sm font-medium">
              ⚠️ This action will notify the customer and update WooCommerce.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                Processing...
              </>
            ) : (
              <>
                <Truck className="w-4 h-4" />
                Confirm & Ship
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
