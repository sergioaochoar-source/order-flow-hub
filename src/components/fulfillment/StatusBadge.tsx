import { FulfillmentStage } from '@/types/order';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: FulfillmentStage;
  size?: 'sm' | 'md';
}

const statusConfig: Record<FulfillmentStage, { label: string; className: string }> = {
  new: { label: 'Nuevo', className: 'status-new' },
  label: { label: 'Etiquetado', className: 'status-label' },
  shipped: { label: 'Enviado', className: 'status-shipped' },
  issue: { label: 'Problema', className: 'status-issue' },
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  // Fallback for legacy stages (qc, pick, pack)
  const config = statusConfig[status] || statusConfig.label;
  
  return (
    <span className={cn(
      'status-badge',
      config.className,
      size === 'md' && 'px-3 py-1 text-sm'
    )}>
      {config.label}
    </span>
  );
}
