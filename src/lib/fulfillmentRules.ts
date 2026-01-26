import { FulfillmentStage, Order } from '@/types/order';

// Define the valid stage order (simplified: New → Label → Shipped)
const STAGE_ORDER: FulfillmentStage[] = ['new', 'label', 'shipped'];

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
    const allowedFromIssue: FulfillmentStage[] = ['new', 'label'];
    if (allowedFromIssue.includes(toStage)) {
      return { valid: true };
    }
    // Cannot go directly from issue to shipped
    if (toStage === 'shipped') {
      return {
        valid: false,
        message: 'No se puede enviar directamente desde Issue. Mueve a Label primero y añade tracking.',
      };
    }
  }

  // Cannot skip to Shipped - must have tracking
  if (toStage === 'shipped') {
    if (!order.shipment?.trackingNumber) {
      return {
        valid: false,
        message: 'No se puede marcar como Enviado sin información de tracking. Añade el tracking primero.',
      };
    }
    // Shipped can only come from Label stage
    if (fromStage !== 'label') {
      return {
        valid: false,
        message: 'Las órdenes deben estar en Label antes de enviar.',
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
      message: `No se puede saltar etapas. Mueve a "${getStageName(expectedNext)}" primero.`,
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
    return ['new', 'label'];
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
    new: 'Nuevo',
    label: 'Etiquetado',
    shipped: 'Enviado',
    issue: 'Problema',
  };
  return names[stage];
}

// Check if order requires tracking before shipping
export function requiresTrackingForShip(order: Order): boolean {
  return order.fulfillmentStage === 'label' && !order.shipment?.trackingNumber;
}
