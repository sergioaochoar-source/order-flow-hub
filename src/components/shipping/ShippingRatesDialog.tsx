import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Package, 
  Loader2, 
  Truck, 
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Order } from '@/types/order';
import { 
  getRates, 
  purchaseLabel, 
  orderAddressToShippo, 
  DEFAULT_PARCEL,
  type GetRatesResponse,
  type PurchaseLabelResponse 
} from '@/lib/shippoApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ShippingRatesDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLabelPurchased: (trackingNumber: string, carrier: string, labelUrl: string) => void;
  warehouseAddress?: {
    name: string;
    street1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone?: string;
    email?: string;
  };
}

interface ShippoRate {
  object_id: string;
  provider: string;
  servicelevel: {
    name: string;
    token: string;
  };
  amount: string;
  currency: string;
  estimated_days: number;
  duration_terms: string;
}

// Parcel presets for quick selection
const PARCEL_PRESETS = [
  { name: 'Small Box', icon: '📦', length: 6, width: 4, height: 3, weight: 0.5 },
  { name: 'Medium Box', icon: '📦', length: 10, width: 8, height: 4, weight: 1 },
  { name: 'Large Box', icon: '📦', length: 14, width: 12, height: 6, weight: 2 },
  { name: 'Flat Envelope', icon: '✉️', length: 12, width: 9, height: 0.5, weight: 0.25 },
  { name: 'Poly Mailer', icon: '📬', length: 10, width: 7, height: 1, weight: 0.3 },
  { name: 'Supplements Bottle', icon: '💊', length: 4, width: 4, height: 6, weight: 0.5 },
];

export function ShippingRatesDialog({
  order,
  open,
  onOpenChange,
  onLabelPurchased,
  warehouseAddress,
}: ShippingRatesDialogProps) {
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [rates, setRates] = useState<ShippoRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<string | null>(null);
  const [purchasedLabel, setPurchasedLabel] = useState<PurchaseLabelResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>('Medium Box');
  
  // Parcel dimensions
  const [parcel, setParcel] = useState({
    length: DEFAULT_PARCEL.length,
    width: DEFAULT_PARCEL.width,
    height: DEFAULT_PARCEL.height,
    weight: DEFAULT_PARCEL.weight,
  });

  const handlePresetSelect = (preset: typeof PARCEL_PRESETS[0]) => {
    setSelectedPreset(preset.name);
    setParcel({
      length: preset.length,
      width: preset.width,
      height: preset.height,
      weight: preset.weight,
    });
  };

  // Default warehouse address (should come from settings in production)
  const defaultWarehouse = warehouseAddress || {
    name: 'Peptium Warehouse',
    street1: '123 Warehouse St',
    city: 'Los Angeles',
    state: 'CA',
    zip: '90001',
    country: 'US',
    phone: '',
    email: '',
  };

  const handleGetRates = async () => {
    if (!order) return;

    setIsLoadingRates(true);
    setError(null);
    setRates([]);
    setSelectedRate(null);
    setPurchasedLabel(null);

    try {
      const addressTo = orderAddressToShippo(
        {
          address_1: order.shippingAddress.line1,
          address_2: order.shippingAddress.line2,
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
          postcode: order.shippingAddress.postalCode,
          country: order.shippingAddress.country,
        },
        order.customer.name,
        order.customer.email
      );

      const response = await getRates({
        addressFrom: defaultWarehouse,
        addressTo,
        parcels: [{
          ...parcel,
          distance_unit: 'in',
          mass_unit: 'lb',
        }],
      });

      if (response.rates && response.rates.length > 0) {
        // Sort by price
        const sortedRates = response.rates.sort(
          (a, b) => parseFloat(a.amount) - parseFloat(b.amount)
        );
        setRates(sortedRates);
      } else {
        setError('No shipping rates available for this address');
      }
    } catch (err) {
      console.error('Failed to get rates:', err);
      setError(err instanceof Error ? err.message : 'Failed to get shipping rates');
    } finally {
      setIsLoadingRates(false);
    }
  };

  const handlePurchaseLabel = async () => {
    if (!selectedRate || !order) return;

    setIsPurchasing(true);
    setError(null);

    try {
      const result = await purchaseLabel(selectedRate);
      setPurchasedLabel(result);
      toast.success('🎉 Shipping label purchased successfully!');
      
      // Notify parent with tracking info
      onLabelPurchased(result.trackingNumber, result.carrier, result.labelUrl);
    } catch (err) {
      console.error('Failed to purchase label:', err);
      setError(err instanceof Error ? err.message : 'Failed to purchase label');
      toast.error('Failed to purchase label');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after close animation
    setTimeout(() => {
      setRates([]);
      setSelectedRate(null);
      setPurchasedLabel(null);
      setError(null);
    }, 300);
  };

  const getCarrierLogo = (provider: string) => {
    const logos: Record<string, string> = {
      'USPS': '📦',
      'UPS': '🟤',
      'FedEx': '🟣',
      'DHL': '🟡',
    };
    return logos[provider] || '📬';
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Buy Shipping Label - {order.orderNumber}
          </DialogTitle>
          <DialogDescription>
            Get rates from multiple carriers and purchase a shipping label
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Ship To */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Package className="w-4 h-4" />
                Ship To
              </h4>
              <div className="text-sm text-muted-foreground pl-6">
                <p className="font-medium text-foreground">{order.customer.name}</p>
                <p>{order.shippingAddress.line1}</p>
                {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                  {order.shippingAddress.postalCode}
                </p>
                <p>{order.shippingAddress.country}</p>
              </div>
            </div>

            {/* Parcel Presets */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Quick Select Package</h4>
              <div className="grid grid-cols-3 gap-2">
                {PARCEL_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handlePresetSelect(preset)}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-all",
                      selectedPreset === preset.name
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{preset.icon}</span>
                      <div>
                        <p className="text-xs font-medium">{preset.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {preset.length}×{preset.width}×{preset.height}" • {preset.weight}lb
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Dimensions */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Or Custom Dimensions</h4>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Length (in)</Label>
                  <Input
                    type="number"
                    value={parcel.length}
                    onChange={(e) => {
                      setSelectedPreset(null);
                      setParcel(p => ({ ...p, length: Number(e.target.value) }));
                    }}
                    min={1}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Width (in)</Label>
                  <Input
                    type="number"
                    value={parcel.width}
                    onChange={(e) => {
                      setSelectedPreset(null);
                      setParcel(p => ({ ...p, width: Number(e.target.value) }));
                    }}
                    min={1}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Height (in)</Label>
                  <Input
                    type="number"
                    value={parcel.height}
                    onChange={(e) => {
                      setSelectedPreset(null);
                      setParcel(p => ({ ...p, height: Number(e.target.value) }));
                    }}
                    min={1}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Weight (lb)</Label>
                  <Input
                    type="number"
                    value={parcel.weight}
                    onChange={(e) => {
                      setSelectedPreset(null);
                      setParcel(p => ({ ...p, weight: Number(e.target.value) }));
                    }}
                    min={0.1}
                    step={0.1}
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleGetRates} 
                disabled={isLoadingRates}
                className="w-full gap-2"
              >
                {isLoadingRates ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Getting rates...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4" />
                    Get Shipping Rates
                  </>
                )}
              </Button>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Rates List */}
            {rates.length > 0 && !purchasedLabel && (
              <div className="space-y-3">
                <Separator />
                <h4 className="font-medium text-sm">Available Rates</h4>
                <div className="space-y-2 pb-4">
                  {rates.map((rate) => (
                    <button
                      key={rate.object_id}
                      onClick={() => setSelectedRate(rate.object_id)}
                      className={cn(
                        "w-full p-4 rounded-lg border text-left transition-all",
                        selectedRate === rate.object_id
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getCarrierLogo(rate.provider)}</span>
                          <div>
                            <p className="font-medium">{rate.provider}</p>
                            <p className="text-sm text-muted-foreground">
                              {rate.servicelevel.name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            ${parseFloat(rate.amount).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {rate.estimated_days} days
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Purchase Success */}
            {purchasedLabel && (
              <div className="space-y-4">
                <Separator />
                <div className="bg-success/10 p-4 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-semibold">Label Purchased Successfully!</span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Carrier:</span>{' '}
                      <span className="font-medium">{purchasedLabel.carrier}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Tracking:</span>{' '}
                      <code className="bg-muted px-2 py-0.5 rounded text-xs">
                        {purchasedLabel.trackingNumber}
                      </code>
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => window.open(purchasedLabel.labelUrl, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Download Label (PDF)
                  </Button>
                </div>

                <Button onClick={handleClose} className="w-full">
                  Done
                </Button>
              </div>
            )}
          </div>
          </ScrollArea>

          {/* Fixed Purchase Button */}
          {rates.length > 0 && !purchasedLabel && (
            <div className="border-t bg-background pt-4 px-1">
              <Button
                onClick={handlePurchaseLabel}
                disabled={!selectedRate || isPurchasing}
                className="w-full gap-2"
                size="lg"
              >
                {isPurchasing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Purchasing label...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Purchase Label {selectedRate && `($${rates.find(r => r.object_id === selectedRate)?.amount})`}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
