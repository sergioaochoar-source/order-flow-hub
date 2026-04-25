import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Truck } from 'lucide-react';

const carriers = ['FedEx', 'UPS', 'DHL', 'USPS', 'Estafeta', 'RedPack', 'Other'];

interface ShipWithTrackingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
  defaultCarrier?: string;
  defaultTracking?: string;
  onConfirm: (carrier: string, trackingNumber: string) => void;
  isLoading?: boolean;
}

export function ShipWithTrackingDialog({
  open,
  onOpenChange,
  orderNumber,
  defaultCarrier = '',
  defaultTracking = '',
  onConfirm,
  isLoading = false,
}: ShipWithTrackingDialogProps) {
  const [carrier, setCarrier] = useState(defaultCarrier);
  const [trackingNumber, setTrackingNumber] = useState(defaultTracking);

  useEffect(() => {
    if (open) {
      setCarrier(defaultCarrier);
      setTrackingNumber(defaultTracking);
    }
  }, [open, defaultCarrier, defaultTracking]);

  const handleConfirm = () => {
    if (!carrier || !trackingNumber.trim()) return;
    onConfirm(carrier, trackingNumber.trim());
  };

  const isValid = carrier && trackingNumber.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle>Mark as Shipped</DialogTitle>
          </div>
          <DialogDescription>
            Enter the tracking number for order <strong>{orderNumber}</strong>. The
            customer will receive a shipping confirmation email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ship-carrier">Carrier</Label>
            <Select value={carrier} onValueChange={setCarrier} disabled={isLoading}>
              <SelectTrigger id="ship-carrier">
                <SelectValue placeholder="Select carrier" />
              </SelectTrigger>
              <SelectContent>
                {carriers.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ship-tracking">Tracking Number</Label>
            <Input
              id="ship-tracking"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number"
              disabled={isLoading}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
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
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
