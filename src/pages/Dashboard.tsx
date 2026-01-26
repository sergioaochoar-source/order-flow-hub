import { 
  DollarSign, 
  Package, 
  AlertTriangle, 
  Truck, 
  TrendingUp,
  Clock,
  CheckCircle2,
  Download
} from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { StatusBadge } from '@/components/fulfillment/StatusBadge';
import { formatDistanceToNow, format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAllOrders } from '@/hooks/useOrders';
import { useDashboardMetrics } from '@/hooks/useMetrics';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyOrdersState } from '@/components/EmptyOrdersState';
import { useMemo, useCallback } from 'react';
import { Order } from '@/types/order';

export default function Dashboard() {
  const { data: orders = [], isLoading: ordersLoading, isError: ordersError, error: ordersErrorData, refetch: refetchOrders } = useAllOrders();
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();

  // Get date ranges
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Filter paid orders for this week
  const weeklyPaidOrders = useMemo(() => {
    return orders.filter(o => o.paidAt && new Date(o.paidAt) >= startOfWeek);
  }, [orders, startOfWeek]);

  // Filter paid orders for this month
  const monthlyPaidOrders = useMemo(() => {
    return orders.filter(o => o.paidAt && new Date(o.paidAt) >= startOfMonth);
  }, [orders, startOfMonth]);

  // Calculate metrics from PAID orders only (weekly view)
  const calculatedMetrics = useMemo(() => {
    if (metrics) return metrics;
    
    // Use weekly paid orders for main dashboard metrics
    const paidOrders = weeklyPaidOrders;
    
    const pendingOrders = paidOrders.filter(o => !['shipped', 'issue'].includes(o.fulfillmentStage)).length;
    const issueOrders = paidOrders.filter(o => o.fulfillmentStage === 'issue').length;
    const readyToShip = paidOrders.filter(o => o.fulfillmentStage === 'label').length;
    const totalOrders = paidOrders.length;
    const totalSales = paidOrders.reduce((sum, o) => sum + o.total, 0);
    
    const todaySales = orders
      .filter(o => o.paidAt && new Date(o.paidAt) >= startOfToday)
      .reduce((sum, o) => sum + o.total, 0);
    
    const weekSales = totalSales;
    
    const monthSales = monthlyPaidOrders.reduce((sum, o) => sum + o.total, 0);
    
    return {
      todaySales,
      weekSales,
      monthSales,
      pendingOrders,
      issueOrders,
      readyToShip,
      totalOrders,
      averageTicket: totalOrders > 0 ? totalSales / totalOrders : 0
    };
  }, [orders, metrics, weeklyPaidOrders, monthlyPaidOrders, startOfToday]);

  // CSV Export function
  const exportOrdersToCSV = useCallback((ordersToExport: Order[], filename: string) => {
    if (ordersToExport.length === 0) {
      alert('No hay órdenes para exportar en este período.');
      return;
    }

    const headers = [
      'Número de Orden',
      'Fecha de Pago',
      'Cliente',
      'Email',
      'Total',
      'Moneda',
      'Estado',
      'Etapa Fulfillment',
      'Dirección de Envío'
    ];

    const rows = ordersToExport.map(order => [
      order.orderNumber,
      order.paidAt ? format(new Date(order.paidAt), 'yyyy-MM-dd HH:mm') : '',
      order.customer.name || '',
      order.customer.email || '',
      order.total.toFixed(2),
      order.currency || 'USD',
      order.status,
      order.fulfillmentStage,
      order.shippingAddress ? `${order.shippingAddress.line1 || ''}, ${order.shippingAddress.city || ''}, ${order.shippingAddress.country || ''}` : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, []);

  const handleDownloadWeekly = useCallback(() => {
    exportOrdersToCSV(weeklyPaidOrders, 'ordenes_semana');
  }, [weeklyPaidOrders, exportOrdersToCSV]);

  const handleDownloadMonthly = useCallback(() => {
    exportOrdersToCSV(monthlyPaidOrders, 'ordenes_mes');
  }, [monthlyPaidOrders, exportOrdersToCSV]);

  const recentOrders = weeklyPaidOrders.slice(0, 5);
  const issueOrders = weeklyPaidOrders.filter(o => o.fulfillmentStage === 'issue').slice(0, 3);

  // Loading state
  if (ordersLoading || metricsLoading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  // Error state
  if (ordersError) {
    return (
      <ErrorState 
        message={ordersErrorData instanceof Error ? ordersErrorData.message : 'Failed to load dashboard'} 
        onRetry={() => refetchOrders()}
      />
    );
  }

  // Empty state - no orders yet
  if (orders.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your fulfillment operations</p>
          </div>
        </div>
        <EmptyOrdersState 
          title="Welcome to Order Flow Hub!"
          description="Your fulfillment dashboard is ready. Orders will appear here once they are synced from WooCommerce or added to the database."
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen semanal ({format(startOfWeek, 'dd MMM')} - {format(now, 'dd MMM yyyy')})
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadWeekly}>
            <Download className="w-4 h-4" />
            Descargar Semana ({weeklyPaidOrders.length})
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadMonthly}>
            <Download className="w-4 h-4" />
            Descargar Mes ({monthlyPaidOrders.length})
          </Button>
          <Link to="/fulfillment">
            <Button className="gap-2">
              <Package className="w-4 h-4" />
              Fulfillment Board
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Today's Sales"
          value={`$${calculatedMetrics.todaySales.toLocaleString()}`}
          icon={DollarSign}
          trend={{ value: 12, isPositive: true }}
        />
        <MetricCard
          title="Pending Orders"
          value={calculatedMetrics.pendingOrders}
          subtitle="Awaiting fulfillment"
          icon={Clock}
          variant="warning"
        />
        <MetricCard
          title="Ready to Ship"
          value={calculatedMetrics.readyToShip}
          subtitle="Labeled and waiting"
          icon={Truck}
          variant="success"
        />
        <MetricCard
          title="Issues"
          value={calculatedMetrics.issueOrders}
          subtitle="Require attention"
          icon={AlertTriangle}
          variant="danger"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="This Week"
          value={`$${calculatedMetrics.weekSales.toLocaleString()}`}
          icon={TrendingUp}
          trend={{ value: 8, isPositive: true }}
        />
        <MetricCard
          title="This Month"
          value={`$${calculatedMetrics.monthSales.toLocaleString()}`}
          icon={TrendingUp}
          trend={{ value: 15, isPositive: true }}
        />
        <MetricCard
          title="Avg. Ticket"
          value={`$${calculatedMetrics.averageTicket.toFixed(2)}`}
          icon={DollarSign}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-card rounded-xl border shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Recent Orders</h2>
            <Link to="/orders" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          {recentOrders.length > 0 ? (
            <div className="divide-y">
              {recentOrders.map((order) => (
                <div key={order.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-foreground">{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">{order.customer.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">${order.total.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <StatusBadge status={order.fulfillmentStage} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No recent orders</p>
            </div>
          )}
        </div>

        {/* Issues */}
        <div className="bg-card rounded-xl border shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <h2 className="font-semibold text-foreground">Orders with Issues</h2>
            </div>
            <Link to="/fulfillment" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          {issueOrders.length > 0 ? (
            <div className="divide-y">
              {issueOrders.map((order) => (
                <div key={order.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium text-foreground">{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">{order.customer.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${order.total.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
              <p className="text-muted-foreground">No issues to resolve!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
