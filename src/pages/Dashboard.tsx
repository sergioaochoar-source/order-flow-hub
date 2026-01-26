import { 
  DollarSign, 
  Package, 
  AlertTriangle, 
  Truck, 
  TrendingUp,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { StatusBadge } from '@/components/fulfillment/StatusBadge';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAllOrders } from '@/hooks/useOrders';
import { useDashboardMetrics } from '@/hooks/useMetrics';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyOrdersState } from '@/components/EmptyOrdersState';
import { useMemo } from 'react';

export default function Dashboard() {
  const { data: orders = [], isLoading: ordersLoading, isError: ordersError, error: ordersErrorData, refetch: refetchOrders } = useAllOrders();
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();

  // Calculate metrics from PAID orders only
  const calculatedMetrics = useMemo(() => {
    if (metrics) return metrics;
    
    // Filter to only paid orders (orders with paid_at date)
    const paidOrders = orders.filter(o => o.paidAt);
    
    const pendingOrders = paidOrders.filter(o => !['shipped', 'issue'].includes(o.fulfillmentStage)).length;
    const issueOrders = paidOrders.filter(o => o.fulfillmentStage === 'issue').length;
    const readyToShip = paidOrders.filter(o => o.fulfillmentStage === 'label').length;
    const totalOrders = paidOrders.length;
    const totalSales = paidOrders.reduce((sum, o) => sum + o.total, 0);
    
    // Calculate time-based sales from paid orders
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const todaySales = paidOrders
      .filter(o => o.paidAt && new Date(o.paidAt) >= startOfToday)
      .reduce((sum, o) => sum + o.total, 0);
    
    const weekSales = paidOrders
      .filter(o => o.paidAt && new Date(o.paidAt) >= startOfWeek)
      .reduce((sum, o) => sum + o.total, 0);
    
    const monthSales = paidOrders
      .filter(o => o.paidAt && new Date(o.paidAt) >= startOfMonth)
      .reduce((sum, o) => sum + o.total, 0);
    
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
  }, [orders, metrics]);

  const recentOrders = orders.slice(0, 5);
  const issueOrders = orders.filter(o => o.fulfillmentStage === 'issue').slice(0, 3);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your fulfillment operations</p>
        </div>
        <Link to="/fulfillment">
          <Button className="gap-2">
            <Package className="w-4 h-4" />
            Go to Fulfillment Board
          </Button>
        </Link>
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
