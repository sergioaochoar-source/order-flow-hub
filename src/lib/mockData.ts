import { Order, DashboardMetrics, FulfillmentStatus } from '@/types/order';

const generateMockOrders = (): Order[] => {
  const statuses: FulfillmentStatus[] = ['new', 'qc', 'pick', 'pack', 'label', 'shipped', 'issue'];
  const shippingMethods = ['Standard', 'Express', 'Next Day', 'Economy'];
  const carriers = ['FedEx', 'UPS', 'DHL', 'USPS'];
  
  const orders: Order[] = [];
  
  for (let i = 1; i <= 24; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const hoursAgo = Math.floor(Math.random() * 72);
    const createdAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
    
    orders.push({
      id: `ord_${i.toString().padStart(4, '0')}`,
      orderNumber: `#${10000 + i}`,
      status,
      customer: {
        id: `cust_${i}`,
        name: `Customer ${i}`,
        email: `customer${i}@example.com`,
        phone: `+1 555-${String(i).padStart(4, '0')}`
      },
      shippingAddress: {
        line1: `${100 + i} Main Street`,
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90001',
        country: 'USA'
      },
      items: [
        {
          id: `item_${i}_1`,
          sku: `SKU-${String(i).padStart(3, '0')}-A`,
          name: `Product ${i}`,
          quantity: Math.ceil(Math.random() * 3),
          price: Math.floor(Math.random() * 100) + 20
        },
        ...(Math.random() > 0.5 ? [{
          id: `item_${i}_2`,
          sku: `SKU-${String(i).padStart(3, '0')}-B`,
          name: `Accessory ${i}`,
          quantity: 1,
          price: Math.floor(Math.random() * 30) + 10
        }] : [])
      ],
      total: Math.floor(Math.random() * 300) + 50,
      shippingMethod: shippingMethods[Math.floor(Math.random() * shippingMethods.length)],
      carrier: status === 'shipped' ? carriers[Math.floor(Math.random() * carriers.length)] : undefined,
      trackingNumber: status === 'shipped' ? `TRK${Math.random().toString(36).substring(2, 10).toUpperCase()}` : undefined,
      notes: Math.random() > 0.7 ? 'Customer requested gift wrapping' : undefined,
      events: [
        {
          id: `evt_${i}_1`,
          timestamp: createdAt,
          type: 'created',
          description: 'Order placed'
        },
        {
          id: `evt_${i}_2`,
          timestamp: new Date(new Date(createdAt).getTime() + 5 * 60 * 1000).toISOString(),
          type: 'status_change',
          description: 'Payment confirmed',
          user: 'System'
        }
      ],
      createdAt,
      updatedAt: new Date().toISOString(),
      paidAt: createdAt
    });
  }
  
  return orders;
};

export const mockOrders = generateMockOrders();

export const mockMetrics: DashboardMetrics = {
  todaySales: 4250.00,
  weekSales: 28450.00,
  monthSales: 124800.00,
  pendingOrders: mockOrders.filter(o => !['shipped', 'issue'].includes(o.status)).length,
  issueOrders: mockOrders.filter(o => o.status === 'issue').length,
  readyToShip: mockOrders.filter(o => o.status === 'label').length,
  totalOrders: mockOrders.length,
  averageTicket: 89.50
};

export const getOrdersByStatus = (status: FulfillmentStatus): Order[] => {
  return mockOrders.filter(order => order.status === status);
};

export const getOrderById = (id: string): Order | undefined => {
  return mockOrders.find(order => order.id === id);
};
