import { useState } from 'react';
import { StatusBadge } from '@/components/fulfillment/StatusBadge';
import { Order } from '@/types/order';
import { Truck, Package, CheckCircle2, Tag, ExternalLink, FileDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAllOrders, useAddTracking } from '@/hooks/useOrders';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyOrdersState } from '@/components/EmptyOrdersState';
import { ShippingRatesDialog } from '@/components/shipping/ShippingRatesDialog';
import { getWarehouseAddress } from '@/pages/Settings';
import { getLabelPdfProxyUrl } from '@/lib/shippoApi';
import { toast } from 'sonner';

const carriers = ['FedEx', 'UPS', 'DHL', 'USPS', 'Estafeta', 'RedPack', 'Other'];

export default function Shipping() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRatesDialogOpen, setIsRatesDialogOpen] = useState(false);
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [service, setService] = useState('');

  const { data: orders = [], isLoading, isError, error, refetch } = useAllOrders();
  const addTrackingMutation = useAddTracking();

  const readyToShip = orders.filter(o => o.fulfillmentStage === 'label');
  const recentlyShipped = orders.filter(o => o.fulfillmentStage === 'shipped').slice(0, 10);

  // Handle label purchased from Shippo
  const handleLabelPurchased = async (trackingNum: string, carrierName: string, labelUrl: string) => {
    if (!selectedOrder) return;

    // Auto-fill the tracking form and submit with labelUrl
    addTrackingMutation.mutate(
      { 
        orderId: selectedOrder.id, 
        payload: {
          carrier: carrierName,
          tracking: trackingNum,
          shippedAt: new Date().toISOString(),
          labelUrl: labelUrl, // Save label URL for later download
        }
      },
      {
        onSuccess: () => {
          toast.success(`Order ${selectedOrder.orderNumber} marked as shipped!`);
          setIsRatesDialogOpen(false);
          setSelectedOrder(null);
          // Open label PDF via proxy
          const proxyUrl = getLabelPdfProxyUrl(labelUrl);
          window.open(proxyUrl, '_blank');
        }
      }
    );
  };

  const handleMarkShipped = () => {
    if (!selectedOrder || !carrier || !trackingNumber) {
      toast.error('Please enter carrier and tracking number');
      return;
    }

    addTrackingMutation.mutate(
      { 
        orderId: selectedOrder.id, 
        payload: {
          carrier,
          tracking: trackingNumber,
          service: service || undefined,
          shippedAt: new Date().toISOString(),
        }
      },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          setSelectedOrder(null);
          setCarrier('');
          setTrackingNumber('');
          setService('');
        }
      }
    );
  };

  // Loading state
  if (isLoading) {
    return <LoadingState message="Loading shipping data..." />;
  }

  // Error state
  if (isError) {
    return (
      <ErrorState 
        message={error instanceof Error ? error.message : 'Failed to load shipping data'} 
        onRetry={() => refetch()}
      />
    );
  }

  // Empty state
  if (orders.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shipping</h1>
          <p className="text-muted-foreground">Manage shipments and tracking</p>
        </div>
        <EmptyOrdersState 
          title="No Orders to Ship"
          description="Orders ready to ship will appear here once they reach the 'Label' stage in the fulfillment process."
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Shipping</h1>
        <p className="text-muted-foreground">Manage shipments and tracking</p>
      </div>

      {/* Ready to Ship */}
      <div className="bg-card rounded-xl border shadow-sm">
        <div className="p-4 border-b flex items-center gap-2">
          <Truck className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Ready to Ship</h2>
          <span className="ml-auto text-sm font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {readyToShip.length}
          </span>
        </div>
        
        {readyToShip.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Items</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {readyToShip.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>{order.customer.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{order.shippingAddress.city}, {order.shippingAddress.state}</p>
                      <p className="text-muted-foreground">{order.shippingAddress.postalCode}</p>
                    </div>
                  </TableCell>
                  <TableCell>{order.shippingMethod}</TableCell>
                  <TableCell>{order.items.length}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        variant="default"
                        className="gap-1"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsRatesDialogOpen(true);
                        }}
                      >
                        <Tag className="w-3 h-3" />
                        Buy Label
                      </Button>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsDialogOpen(true);
                        }}
                      >
                        Manual
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-8 text-center">
            <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No orders ready to ship</p>
          </div>
        )}
      </div>

      {/* Recently Shipped */}
      <div className="bg-card rounded-xl border shadow-sm">
        <div className="p-4 border-b flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-success" />
          <h2 className="font-semibold text-foreground">Recently Shipped</h2>
        </div>
        
        {recentlyShipped.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentlyShipped.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>{order.customer.name}</TableCell>
                  <TableCell>{order.shipment?.carrier || '-'}</TableCell>
                  <TableCell>
                    {order.shipment?.trackingNumber ? (
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {order.shipment.trackingNumber}
                      </code>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {order.shipment?.labelUrl ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 h-7 px-2"
                        onClick={() => {
                          const proxyUrl = getLabelPdfProxyUrl(order.shipment!.labelUrl!);
                          window.open(proxyUrl, '_blank');
                        }}
                      >
                        <FileDown className="w-3 h-3" />
                        PDF
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.fulfillmentStage} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-8 text-center">
            <Truck className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No recent shipments</p>
          </div>
        )}
      </div>

      {/* Add Tracking Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tracking Information</DialogTitle>
            <DialogDescription>
              Enter shipping details for order {selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="dialog-carrier">Carrier *</Label>
              <Select value={carrier} onValueChange={setCarrier}>
                <SelectTrigger id="dialog-carrier">
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
              <Label htmlFor="dialog-tracking">Tracking Number *</Label>
              <Input
                id="dialog-tracking"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dialog-service">Service (optional)</Label>
              <Input
                id="dialog-service"
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="e.g., Ground, Express, Priority"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleMarkShipped}
                className="flex-1 gap-2"
                disabled={!carrier || !trackingNumber || addTrackingMutation.isPending}
              >
                <CheckCircle2 className="w-4 h-4" />
                {addTrackingMutation.isPending ? 'Saving...' : 'Mark as Shipped'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shippo Rates Dialog */}
      <ShippingRatesDialog
        order={selectedOrder}
        open={isRatesDialogOpen}
        onOpenChange={setIsRatesDialogOpen}
        onLabelPurchased={handleLabelPurchased}
        warehouseAddress={getWarehouseAddress()}
      />
    </div>
  );
}
