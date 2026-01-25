import { FulfillmentStatus } from '@/types/order';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: FulfillmentStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<FulfillmentStatus, { label: string; className: string }> = {
  new: { label: 'New', className: 'status-new' },
  qc: { label: 'QC', className: 'status-qc' },
  pick: { label: 'Pick', className: 'status-pick' },
  pack: { label: 'Pack', className: 'status-pack' },
  label: { label: 'Label', className: 'status-label' },
  shipped: { label: 'Shipped', className: 'status-shipped' },
  issue: { label: 'Issue', className: 'status-issue' },
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status];
  
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
