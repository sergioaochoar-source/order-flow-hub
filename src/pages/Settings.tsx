import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Link, Bell, Database, CheckCircle2, XCircle } from 'lucide-react';
import { useApiConfig } from '@/hooks/useApiConfig';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function Settings() {
  const { apiUrl, isConfigured, saveApiUrl, clearApiUrl } = useApiConfig();
  const [inputUrl, setInputUrl] = useState(apiUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setInputUrl(apiUrl);
  }, [apiUrl]);

  const handleSave = () => {
    saveApiUrl(inputUrl);
    toast.success('API Base URL saved successfully');
  };

  const handleTestConnection = async () => {
    if (!inputUrl) {
      toast.error('Please enter an API URL first');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`${inputUrl.replace(/\/+$/, '')}/orders`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setTestResult('success');
        toast.success('Connection successful!');
      } else {
        setTestResult('error');
        toast.error(`Connection failed: ${response.status} ${response.statusText}`);
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
          {isConfigured && (
            <span className="ml-auto text-xs bg-success/20 text-success px-2 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Configured
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Connect to your backend API that syncs with WooCommerce.
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-url">API Base URL</Label>
            <div className="flex gap-2">
              <Input 
                id="api-url" 
                placeholder="https://api.yourbackend.com" 
                value={inputUrl}
                onChange={(e) => {
                  setInputUrl(e.target.value);
                  setTestResult(null);
                }}
              />
              {testResult === 'success' && (
                <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0 self-center" />
              )}
              {testResult === 'error' && (
                <XCircle className="w-6 h-6 text-destructive flex-shrink-0 self-center" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Example: https://api.yourbackend.com (without trailing slash)
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={!inputUrl}>
              Save API Settings
            </Button>
            <Button 
              variant="outline" 
              onClick={handleTestConnection}
              disabled={!inputUrl || isTesting}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
            {isConfigured && (
              <Button 
                variant="ghost" 
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  clearApiUrl();
                  setInputUrl('');
                  setTestResult(null);
                  toast.success('API configuration cleared');
                }}
              >
                Clear
              </Button>
            )}
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
          This app displays data from your connected API. All order data is synced from WooCommerce through your backend.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleRefreshData} disabled={!isConfigured}>
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
