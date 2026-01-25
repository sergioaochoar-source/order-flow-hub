import { FulfillmentStage, Order } from '@/types/order';

// Define the valid stage order
const STAGE_ORDER: FulfillmentStage[] = ['new', 'qc', 'pick', 'pack', 'label', 'shipped'];

// Get the index of a stage in the flow
function getStageIndex(stage: FulfillmentStage): number {
  return STAGE_ORDER.indexOf(stage);
}

// Check if a stage transition is valid
export function isValidTransition(
  order: Order,
  fromStage: FulfillmentStage,
  toStage: FulfillmentStage
): { valid: boolean; message?: string } {
  // Issue is special - can move TO issue from anywhere
  if (toStage === 'issue') {
    return { valid: true };
  }

  // From Issue, allow moving back to any stage except shipped (requires tracking)
  if (fromStage === 'issue') {
    const allowedFromIssue: FulfillmentStage[] = ['new', 'qc', 'pick', 'pack', 'label'];
    if (allowedFromIssue.includes(toStage)) {
      return { valid: true };
    }
    // Cannot go directly from issue to shipped
    if (toStage === 'shipped') {
      return {
        valid: false,
        message: 'Cannot ship directly from Issue. Move to Label stage first and add tracking.',
      };
    }
  }

  // Cannot skip to Shipped - must have tracking
  if (toStage === 'shipped') {
    if (!order.shipment?.trackingNumber) {
      return {
        valid: false,
        message: 'Cannot mark as Shipped without tracking information. Add tracking first.',
      };
    }
    // Shipped can only come from Label stage
    if (fromStage !== 'label') {
      return {
        valid: false,
        message: 'Orders must be in Label stage before shipping.',
      };
    }
    return { valid: true };
  }

  const fromIndex = getStageIndex(fromStage);
  const toIndex = getStageIndex(toStage);

  // Allow moving forward by one step
  if (toIndex === fromIndex + 1) {
    return { valid: true };
  }

  // Allow moving backward (for corrections)
  if (toIndex < fromIndex) {
    return { valid: true };
  }

  // Skipping stages is not allowed
  if (toIndex > fromIndex + 1) {
    const expectedNext = STAGE_ORDER[fromIndex + 1];
    return {
      valid: false,
      message: `Cannot skip stages. Move to "${expectedNext.toUpperCase()}" first.`,
    };
  }

  return { valid: true };
}

// Get available next stages for an order
export function getAvailableTransitions(order: Order): FulfillmentStage[] {
  const currentStage = order.fulfillmentStage;
  const currentIndex = getStageIndex(currentStage);
  const available: FulfillmentStage[] = [];

  // From Issue, can go back to any prior stage
  if (currentStage === 'issue') {
    return ['new', 'qc', 'pick', 'pack', 'label'];
  }

  // Already shipped - no transitions
  if (currentStage === 'shipped') {
    return ['issue']; // Can only mark as issue
  }

  // Next stage (if not at the end)
  if (currentIndex < STAGE_ORDER.length - 1) {
    const nextStage = STAGE_ORDER[currentIndex + 1];
    
    // Special case: can't go to shipped without tracking
    if (nextStage === 'shipped' && !order.shipment?.trackingNumber) {
      // Don't add shipped as available
    } else {
      available.push(nextStage);
    }
  }

  // Previous stage (for corrections)
  if (currentIndex > 0) {
    available.push(STAGE_ORDER[currentIndex - 1]);
  }

  // Can always mark as issue
  available.push('issue');

  return available;
}

// Get stage display name
export function getStageName(stage: FulfillmentStage): string {
  const names: Record<FulfillmentStage, string> = {
    new: 'New / Paid',
    qc: 'QC',
    pick: 'Pick',
    pack: 'Pack',
    label: 'Label',
    shipped: 'Shipped',
    issue: 'Issue',
  };
  return names[stage];
}

// Check if order requires tracking before shipping
export function requiresTrackingForShip(order: Order): boolean {
  return order.fulfillmentStage === 'label' && !order.shipment?.trackingNumber;
}
