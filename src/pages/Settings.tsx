import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Bell, Database, CheckCircle2, Cloud, Truck, RefreshCw, MapPin, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { checkHealth } from '@/lib/cloudApi';

// Warehouse address type
export interface WarehouseAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

// Get warehouse from localStorage
export function getWarehouseAddress(): WarehouseAddress {
  const stored = localStorage.getItem('warehouse_address');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Return default
    }
  }
  return {
    name: 'My Warehouse',
    street1: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  };
}

export default function Settings() {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const queryClient = useQueryClient();

  // Warehouse address state
  const [warehouse, setWarehouse] = useState<WarehouseAddress>(getWarehouseAddress);
  const [isSavingWarehouse, setIsSavingWarehouse] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await checkHealth();
      if (result.ok) {
        setTestResult('success');
        toast.success('Backend connection successful!');
      } else {
        setTestResult('error');
        toast.error('Backend health check failed');
      }
    } catch (error) {
      setTestResult('error');
      toast.error(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleRefreshData = () => {
    queryClient.invalidateQueries();
    toast.success('Data refresh triggered');
  };

  const handleClearCache = () => {
    queryClient.clear();
    toast.success('Cache cleared');
  };

  const handleSaveWarehouse = () => {
    setIsSavingWarehouse(true);
    try {
      localStorage.setItem('warehouse_address', JSON.stringify(warehouse));
      toast.success('Warehouse address saved!');
    } catch (err) {
      toast.error('Failed to save warehouse address');
    } finally {
      setIsSavingWarehouse(false);
    }
  };

  const updateWarehouse = (field: keyof WarehouseAddress, value: string) => {
    setWarehouse(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Configure your fulfillment center</p>
      </div>

      {/* Backend Status */}
      <div className="bg-card rounded-xl border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Cloud className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Backend Status</h2>
          <span className="ml-auto text-xs bg-success/20 text-success px-2 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Lovable Cloud
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Your app is connected to Lovable Cloud. All order data is stored securely in the integrated database.
        </p>
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Database</p>
              <p className="font-medium">PostgreSQL</p>
            </div>
            <div>
              <p className="text-muted-foreground">API</p>
              <p className="font-medium">Edge Functions</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium text-success flex items-center gap-1">
                {testResult === 'success' && <CheckCircle2 className="w-3 h-3" />}
                {testResult === 'success' ? 'Connected' : 'Ready'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Region</p>
              <p className="font-medium">Auto-detected</p>
            </div>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={handleTestConnection}
          disabled={isTesting}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
          {isTesting ? 'Testing...' : 'Test Connection'}
        </Button>
      </div>

      <Separator />

      {/* Warehouse Address */}
      <div className="bg-card rounded-xl border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Warehouse Address</h2>
          <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-1 rounded-full flex items-center gap-1">
            <Package className="w-3 h-3" />
            Shippo
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          This address will be used as the "Ship From" address when purchasing shipping labels.
        </p>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="warehouse-name">Business Name</Label>
              <Input
                id="warehouse-name"
                value={warehouse.name}
                onChange={(e) => updateWarehouse('name', e.target.value)}
                placeholder="My Company"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="warehouse-street1">Street Address</Label>
              <Input
                id="warehouse-street1"
                value={warehouse.street1}
                onChange={(e) => updateWarehouse('street1', e.target.value)}
                placeholder="123 Warehouse St"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="warehouse-street2">Apt/Suite (optional)</Label>
              <Input
                id="warehouse-street2"
                value={warehouse.street2 || ''}
                onChange={(e) => updateWarehouse('street2', e.target.value)}
                placeholder="Suite 100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouse-city">City</Label>
              <Input
                id="warehouse-city"
                value={warehouse.city}
                onChange={(e) => updateWarehouse('city', e.target.value)}
                placeholder="Los Angeles"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouse-state">State</Label>
              <Input
                id="warehouse-state"
                value={warehouse.state}
                onChange={(e) => updateWarehouse('state', e.target.value)}
                placeholder="CA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouse-zip">ZIP Code</Label>
              <Input
                id="warehouse-zip"
                value={warehouse.zip}
                onChange={(e) => updateWarehouse('zip', e.target.value)}
                placeholder="90001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouse-country">Country</Label>
              <Input
                id="warehouse-country"
                value={warehouse.country}
                onChange={(e) => updateWarehouse('country', e.target.value)}
                placeholder="US"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouse-phone">Phone (optional)</Label>
              <Input
                id="warehouse-phone"
                value={warehouse.phone || ''}
                onChange={(e) => updateWarehouse('phone', e.target.value)}
                placeholder="+1 555 123 4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouse-email">Email (optional)</Label>
              <Input
                id="warehouse-email"
                type="email"
                value={warehouse.email || ''}
                onChange={(e) => updateWarehouse('email', e.target.value)}
                placeholder="shipping@company.com"
              />
            </div>
          </div>
          
          <Button 
            onClick={handleSaveWarehouse}
            disabled={isSavingWarehouse || !warehouse.name || !warehouse.street1 || !warehouse.city || !warehouse.state || !warehouse.zip}
            className="gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSavingWarehouse ? 'Saving...' : 'Save Warehouse Address'}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Fulfillment Settings */}
      <div className="bg-card rounded-xl border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Fulfillment Settings</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-advance Stage</p>
              <p className="text-sm text-muted-foreground">Automatically move orders to next stage when complete</p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Require Tracking for Ship</p>
              <p className="text-sm text-muted-foreground">Block shipping without tracking number</p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </div>

      <Separator />

      {/* Notifications */}
      <div className="bg-card rounded-xl border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Notifications</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">New Order Alerts</p>
              <p className="text-sm text-muted-foreground">Get notified when new orders arrive</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Issue Alerts</p>
              <p className="text-sm text-muted-foreground">Alert when orders are marked with issues</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Daily Summary</p>
              <p className="text-sm text-muted-foreground">Receive daily fulfillment summary</p>
            </div>
            <Switch />
          </div>
        </div>
      </div>

      <Separator />

      {/* Data */}
      <div className="bg-card rounded-xl border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Data Management</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Order data is stored in your Lovable Cloud database. Use the buttons below to manage cached data.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleRefreshData}>
            Refresh Data
          </Button>
          <Button variant="outline" onClick={handleClearCache}>
            Clear Cache
          </Button>
        </div>
      </div>
    </div>
  );
}
