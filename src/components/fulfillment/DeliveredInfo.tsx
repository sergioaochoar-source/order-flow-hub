import { format } from 'date-fns';
import { CheckCircle2, MapPin, Package, Camera } from 'lucide-react';
import { Shipment, TrackingDetail } from '@/types/order';

interface DeliveredInfoProps {
  shipment: Shipment;
}

/**
 * Extracts proof-of-delivery image URLs from EasyPost tracking_details payload.
 * EasyPost includes them under tracker.signature_url and details with images.
 */
function extractProofImages(details?: TrackingDetail[]): string[] {
  if (!details) return [];
  const urls: string[] = [];
  for (const d of details) {
    const raw = d as unknown as Record<string, unknown>;
    const candidateKeys = ['signature_url', 'image_url', 'photo_url', 'proof_url'];
    for (const key of candidateKeys) {
      const v = raw[key];
      if (typeof v === 'string' && v.startsWith('http')) urls.push(v);
    }
  }
  return Array.from(new Set(urls));
}

function findDeliveredEvent(details?: TrackingDetail[]): TrackingDetail | undefined {
  return details?.find((d) => (d.status || '').toLowerCase() === 'delivered');
}

export function DeliveredInfo({ shipment }: DeliveredInfoProps) {
  const deliveredAt = shipment.deliveredAt
    ? new Date(shipment.deliveredAt)
    : undefined;
  const deliveredEvent = findDeliveredEvent(shipment.trackingDetails);
  const location = deliveredEvent?.tracking_location;
  const proofImages = extractProofImages(shipment.trackingDetails);

  return (
    <div className="bg-[hsl(var(--status-delivered)/0.08)] border border-[hsl(var(--status-delivered)/0.2)] p-4 rounded-lg space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-[hsl(var(--status-delivered))]" />
        <p className="text-sm font-semibold text-[hsl(var(--status-delivered))]">
          Entregado al cliente
        </p>
      </div>

      <div className="space-y-1.5 text-sm">
        <p className="text-muted-foreground flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5" />
          <span className="font-medium text-foreground">{shipment.carrier}</span>
          <span>·</span>
          <span className="font-mono">{shipment.trackingNumber}</span>
        </p>
        {deliveredAt && (
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Fecha:</span>{' '}
            {format(deliveredAt, "PPpp")}
          </p>
        )}
        {location && (location.city || location.state) && (
          <p className="text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>
              {[location.city, location.state, location.zip, location.country]
                .filter(Boolean)
                .join(', ')}
            </span>
          </p>
        )}
        {deliveredEvent?.message && (
          <p className="text-xs text-muted-foreground italic mt-2 pt-2 border-t border-border/50">
            "{deliveredEvent.message}"
          </p>
        )}
      </div>

      {proofImages.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Camera className="w-3.5 h-3.5" />
            Prueba de entrega
          </div>
          <div className="grid grid-cols-2 gap-2">
            {proofImages.map((url, idx) => (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-md overflow-hidden border border-border hover:border-primary transition-colors"
              >
                <img
                  src={url}
                  alt={`Proof of delivery ${idx + 1}`}
                  className="w-full h-32 object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {proofImages.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          El carrier no proporcionó fotos de prueba de entrega para este envío.
        </p>
      )}
    </div>
  );
}
