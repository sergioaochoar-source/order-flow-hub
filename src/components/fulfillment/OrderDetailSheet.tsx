import { useState } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { StatusBadge } from './StatusBadge';
import { ShipConfirmDialog } from './ShipConfirmDialog';
import { Order, FulfillmentStage, TrackingPayload } from '@/types/order';
import { useAddTracking } from '@/hooks/useOrders';
import { 
  Package, 
  User, 
  MapPin, 
  Clock, 
  CheckCircle2,
  Truck,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { isValidTransition, getAvailableTransitions, getStageName } from '@/lib/fulfillmentRules';

interface OrderDetailSheetProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (status: FulfillmentStage) => void;
  onUpdateOrder: (order: Order) => void;
  isShipping?: boolean;
}

const carriers = ['FedEx', 'UPS', 'DHL', 'USPS', 'Estafeta', 'RedPack', 'Other'];

export function OrderDetailSheet({ 
  order, 
  open, 
  onOpenChange,
  onStatusChange,
  onUpdateOrder
}: OrderDetailSheetProps) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  
  // Confirmation dialog state
  const [showShipConfirm, setShowShipConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<TrackingPayload | null>(null);
  
  // Use the tracking mutation directly
  const addTrackingMutation = useAddTracking();

  if (!order) return null;

  const handleMarkShipped = () => {
    if (!carrier || !trackingNumber) {
      toast.error('Please enter carrier and tracking number');
      return;
    }

    // Prepare tracking payload and show confirmation dialog
    const payload: TrackingPayload = {
      carrier,
      tracking: trackingNumber,
      shippedAt: new Date().toISOString(),
    };
    setPendingPayload(payload);
    setShowShipConfirm(true);
  };

  const handleConfirmShipment = () => {
    if (!pendingPayload || !order) return;

    addTrackingMutation.mutate(
      {
        orderId: order.id,
        payload: pendingPayload,
      },
      {
        onSuccess: () => {
          // Update local state for immediate feedback
          const updatedOrder: Order = {
            ...order,
            fulfillmentStage: 'shipped',
            shipment: {
              carrier: pendingPayload.carrier,
              trackingNumber: pendingPayload.tracking,
              shippedAt: pendingPayload.shippedAt,
              service: pendingPayload.service,
            },
            updatedAt: new Date().toISOString(),
          };
          onUpdateOrder(updatedOrder);
          
          // Reset state
          setShowShipConfirm(false);
          setPendingPayload(null);
          setTrackingNumber('');
          setCarrier('');
          onOpenChange(false);
        },
        onError: () => {
          setShowShipConfirm(false);
        },
      }
    );
  };

  // Get available transitions based on fulfillment rules
  const availableTransitions = getAvailableTransitions(order);
  const nextStage = availableTransitions.find(s => s !== 'issue' && s !== order.fulfillmentStage);

  const handleStageTransition = (newStage: FulfillmentStage) => {
    const validation = isValidTransition(order, order.fulfillmentStage, newStage);
    if (!validation.valid) {
      toast.error(validation.message || 'Invalid transition');
      return;
    }
    onStatusChange(newStage);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-center gap-3">
              <SheetTitle className="text-xl">{order.orderNumber}</SheetTitle>
              <StatusBadge status={order.fulfillmentStage} size="md" />
            </div>
            <SheetDescription className="sr-only">
              Order details for {order.orderNumber}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            {/* Quick Actions - Workflow */}
            {order.fulfillmentStage !== 'shipped' && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-foreground">Workflow Actions</h4>
                
                {/* Current stage indicator */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-lg">
                  <span>Current:</span>
                  <StatusBadge status={order.fulfillmentStage} size="sm" />
                  {nextStage && (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      <span className="font-medium text-foreground">{getStageName(nextStage)}</span>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* Next stage button */}
                  {nextStage && nextStage !== 'shipped' && (
                    <Button 
                      onClick={() => handleStageTransition(nextStage)}
                      className="gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Move to {getStageName(nextStage)}
                    </Button>
                  )}
                  
                  {/* Issue button - always available unless already shipped */}
                  {order.fulfillmentStage !== 'issue' && (
                    <Button 
                      variant="destructive" 
                      onClick={() => handleStageTransition('issue')}
                      className="gap-2"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Mark Issue
                    </Button>
                  )}

                  {/* Resolve issue - show available stages to return to */}
                  {order.fulfillmentStage === 'issue' && (
                    <div className="w-full space-y-2">
                      <p className="text-xs text-muted-foreground">Resolve issue by moving to:</p>
                      <div className="flex flex-wrap gap-2">
                        {availableTransitions.filter(s => s !== 'issue').map(stage => (
                          <Button 
                            key={stage}
                            variant="outline"
                            size="sm"
                            onClick={() => handleStageTransition(stage)}
                          >
                            {getStageName(stage)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Customer Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <User className="w-4 h-4" />
                Customer
              </div>
              <div className="pl-6 space-y-1 text-sm">
                <p className="font-medium">{order.customer.name}</p>
                <p className="text-muted-foreground">{order.customer.email}</p>
                {order.customer.phone && (
                  <p className="text-muted-foreground">{order.customer.phone}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Shipping Address */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MapPin className="w-4 h-4" />
                Shipping Address
              </div>
              <div className="pl-6 space-y-1 text-sm text-muted-foreground">
                <p>{order.shippingAddress.line1}</p>
                {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                </p>
                <p>{order.shippingAddress.country}</p>
              </div>
            </div>

            <Separator />

            {/* Products */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Package className="w-4 h-4" />
                Items ({order.items.length})
              </div>
              <div className="pl-6 space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">×{item.quantity}</p>
                      <p className="text-xs text-muted-foreground">${item.price.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Shipping & Tracking */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Truck className="w-4 h-4" />
                Shipping
              </div>
              <div className="pl-6 space-y-3">
                <p className="text-sm">
                  <span className="text-muted-foreground">Method:</span>{' '}
                  <span className="font-medium">{order.shippingMethod}</span>
                </p>

                {order.fulfillmentStage === 'shipped' && order.shipment ? (
                  <div className="bg-success/10 p-3 rounded-lg">
                    <p className="text-sm font-medium text-success">✓ Shipped</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {order.shipment.carrier}: {order.shipment.trackingNumber}
                    </p>
                  </div>
                ) : order.fulfillmentStage === 'label' ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="carrier">Carrier</Label>
                      <Select value={carrier} onValueChange={setCarrier}>
                        <SelectTrigger id="carrier">
                          <SelectValue placeholder="Select carrier" />
                        </SelectTrigger>
                        <SelectContent>
                          {carriers.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tracking">Tracking Number</Label>
                      <Input
                        id="tracking"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="Enter tracking number"
                      />
                    </div>
                    <Button 
                      onClick={handleMarkShipped} 
                      className="w-full gap-2"
                      disabled={!carrier || !trackingNumber}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Mark as Shipped
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            {order.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-foreground">Notes</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {order.notes}
                  </p>
                </div>
              </>
            )}

            <Separator />

            {/* Timeline */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Clock className="w-4 h-4" />
                Timeline
              </div>
              <div className="pl-6 space-y-3">
                {order.events
                  .slice()
                  .reverse()
                  .map((event, index) => (
                    <div key={event.id} className="flex gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                        index === 0 ? "bg-primary" : "bg-border"
                      )} />
                      <div className="flex-1">
                        <p className="text-sm">{event.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(event.timestamp), 'MMM d, yyyy h:mm a')}
                          {event.user && ` • ${event.user}`}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Ship Confirmation Dialog - embedded in sheet component */}
      <ShipConfirmDialog
        open={showShipConfirm}
        onOpenChange={(open) => {
          setShowShipConfirm(open);
          if (!open) setPendingPayload(null);
        }}
        orderNumber={order.orderNumber}
        carrier={pendingPayload?.carrier || ''}
        trackingNumber={pendingPayload?.tracking || ''}
        onConfirm={handleConfirmShipment}
        isLoading={addTrackingMutation.isPending}
      />
    </>
  );
}