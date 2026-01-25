import { useState } from 'react';
import { mockOrders } from '@/lib/mockData';
import { StatusBadge } from '@/components/fulfillment/StatusBadge';
import { OrderDetailSheet } from '@/components/fulfillment/OrderDetailSheet';
import { Order, FulfillmentStatus } from '@/types/order';
import { Search, Filter, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDistanceToNow, format } from 'date-fns';

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = orders.filter(order => 
    order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStatusChange = (status: FulfillmentStatus) => {
    if (!selectedOrder) return;
    
    setOrders(prev => 
      prev.map(order => 
        order.id === selectedOrder.id 
          ? { ...order, status, updatedAt: new Date().toISOString() }
          : order
      )
    );
    setSelectedOrder(prev => prev ? { ...prev, status } : null);
  };

  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders(prev => 
      prev.map(order => order.id === updatedOrder.id ? updatedOrder : order)
    );
    setSelectedOrder(updatedOrder);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground">All orders from your store</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by order #, customer name or email..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Shipping</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow 
                key={order.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => {
                  setSelectedOrder(order);
                  setIsSheetOpen(true);
                }}
              >
                <TableCell className="font-medium">{order.orderNumber}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{order.customer.name}</p>
                    <p className="text-xs text-muted-foreground">{order.customer.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={order.status} />
                </TableCell>
                <TableCell>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</TableCell>
                <TableCell className="font-medium">${order.total.toFixed(2)}</TableCell>
                <TableCell>{order.shippingMethod}</TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm">{format(new Date(order.createdAt), 'MMM d, yyyy')}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <OrderDetailSheet
        order={selectedOrder}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onStatusChange={handleStatusChange}
        onUpdateOrder={handleUpdateOrder}
      />
    </div>
  );
}
