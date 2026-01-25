import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Settings as SettingsIcon, Link, Bell, Database } from 'lucide-react';

export default function Settings() {
  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Configure your fulfillment center</p>
      </div>

      {/* API Configuration */}
      <div className="bg-card rounded-xl border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Link className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">API Configuration</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Connect to your backend API that syncs with WooCommerce.
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-url">API Base URL</Label>
            <Input 
              id="api-url" 
              placeholder="https://api.yourbackend.com" 
              defaultValue=""
            />
          </div>
          <Button>Save API Settings</Button>
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
          This app displays data from your connected API. All order data is synced from WooCommerce through your backend.
        </p>
        <div className="flex gap-3">
          <Button variant="outline">Refresh Data</Button>
          <Button variant="outline">Clear Cache</Button>
        </div>
      </div>
    </div>
  );
}
