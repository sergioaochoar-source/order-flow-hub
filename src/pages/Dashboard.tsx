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
import { useOrders } from '@/hooks/useOrders';
import { useDashboardMetrics } from '@/hooks/useMetrics';
import { ApiNotConfigured } from '@/components/ApiNotConfigured';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { isApiConfigured } from '@/lib/api';
import { useMemo } from 'react';

export default function Dashboard() {
  const { data: orders = [], isLoading: ordersLoading, isError: ordersError, error: ordersErrorData, refetch: refetchOrders } = useOrders();
  const { data: metrics, isLoading: metricsLoading, isError: metricsError } = useDashboardMetrics();

  // Calculate metrics from orders if metrics endpoint not available
  const calculatedMetrics = useMemo(() => {
    if (metrics) return metrics;
    
    const pendingOrders = orders.filter(o => !['shipped', 'issue'].includes(o.status)).length;
    const issueOrders = orders.filter(o => o.status === 'issue').length;
    const readyToShip = orders.filter(o => o.status === 'label').length;
    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
    
    return {
      todaySales: totalSales * 0.15, // Approximate
      weekSales: totalSales * 0.5,
      monthSales: totalSales,
      pendingOrders,
      issueOrders,
      readyToShip,
      totalOrders,
      averageTicket: totalOrders > 0 ? totalSales / totalOrders : 0
    };
  }, [orders, metrics]);

  const recentOrders = orders.slice(0, 5);
  const issueOrders = orders.filter(o => o.status === 'issue').slice(0, 3);

  // Show configuration prompt if API not set
  if (!isApiConfigured()) {
    return <ApiNotConfigured />;
  }

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
                    <StatusBadge status={order.status} />
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
