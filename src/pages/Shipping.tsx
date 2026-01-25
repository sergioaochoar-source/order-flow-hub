import { useState } from 'react';
import { mockOrders } from '@/lib/mockData';
import { StatusBadge } from '@/components/fulfillment/StatusBadge';
import { Order, FulfillmentStatus } from '@/types/order';
import { Search, Truck, Package, CheckCircle2 } from 'lucide-react';
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
import { toast } from 'sonner';

const carriers = ['FedEx', 'UPS', 'DHL', 'USPS', 'Other'];

export default function Shipping() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  const readyToShip = orders.filter(o => o.status === 'label');
  const recentlyShipped = orders.filter(o => o.status === 'shipped').slice(0, 10);

  const handleMarkShipped = () => {
    if (!selectedOrder || !carrier || !trackingNumber) {
      toast.error('Please enter carrier and tracking number');
      return;
    }

    setOrders(prev => 
      prev.map(order => 
        order.id === selectedOrder.id 
          ? { 
              ...order, 
              status: 'shipped' as FulfillmentStatus,
              carrier,
              trackingNumber,
              updatedAt: new Date().toISOString()
            }
          : order
      )
    );

    toast.success(`Order ${selectedOrder.orderNumber} marked as shipped!`);
    setIsDialogOpen(false);
    setSelectedOrder(null);
    setCarrier('');
    setTrackingNumber('');
  };

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
                    <Button 
                      size="sm"
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsDialogOpen(true);
                      }}
                    >
                      Add Tracking
                    </Button>
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
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentlyShipped.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>{order.customer.name}</TableCell>
                  <TableCell>{order.carrier}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {order.trackingNumber}
                    </code>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
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
              <Label htmlFor="dialog-carrier">Carrier</Label>
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
              <Label htmlFor="dialog-tracking">Tracking Number</Label>
              <Input
                id="dialog-tracking"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
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
                disabled={!carrier || !trackingNumber}
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark as Shipped
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
