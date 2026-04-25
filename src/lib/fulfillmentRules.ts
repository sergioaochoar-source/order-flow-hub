import { FulfillmentStage, Order } from '@/types/order';

// Linear flow: New → Label → Shipped → Delivered
const STAGE_ORDER: FulfillmentStage[] = ['new', 'label', 'shipped', 'delivered'];

function getStageIndex(stage: FulfillmentStage): number {
  return STAGE_ORDER.indexOf(stage);
}

// Check if a stage transition is valid
export function isValidTransition(
  order: Order,
  fromStage: FulfillmentStage,
  toStage: FulfillmentStage
): { valid: boolean; message?: string } {
  // Issue is special - can move TO issue from anywhere except delivered
  if (toStage === 'issue') {
    if (fromStage === 'delivered') {
      return { valid: false, message: 'No se puede marcar como Problema una orden ya entregada.' };
    }
    return { valid: true };
  }

  // From Issue, allow moving back to new or label (must re-add tracking for shipped)
  if (fromStage === 'issue') {
    const allowedFromIssue: FulfillmentStage[] = ['new', 'label'];
    if (allowedFromIssue.includes(toStage)) {
      return { valid: true };
    }
    if (toStage === 'shipped') {
      return {
        valid: false,
        message: 'No se puede enviar directamente desde Issue. Mueve a Label primero y añade tracking.',
      };
    }
    if (toStage === 'delivered') {
      return { valid: false, message: 'No se puede marcar como Entregado desde Issue.' };
    }
  }

  // Cannot enter Shipped without tracking
  if (toStage === 'shipped') {
    if (!order.shipment?.trackingNumber) {
      return {
        valid: false,
        message: 'No se puede marcar como Enviado sin tracking number. Añade el tracking primero.',
      };
    }
    if (fromStage !== 'label') {
      return {
        valid: false,
        message: 'Las órdenes deben estar en Etiquetado antes de Enviado.',
      };
    }
    return { valid: true };
  }

  // Cannot enter Delivered manually unless coming from Shipped
  if (toStage === 'delivered') {
    if (fromStage !== 'shipped') {
      return {
        valid: false,
        message: 'Solo se puede marcar como Entregado desde Enviado.',
      };
    }
    return { valid: true };
  }

  // From Delivered: terminal stage, no manual transitions
  if (fromStage === 'delivered') {
    return { valid: false, message: 'Las órdenes entregadas son finales y no se pueden mover.' };
  }

  const fromIndex = getStageIndex(fromStage);
  const toIndex = getStageIndex(toStage);

  // Forward by one
  if (toIndex === fromIndex + 1) return { valid: true };
  // Backward (corrections)
  if (toIndex < fromIndex) return { valid: true };

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

  if (currentStage === 'issue') {
    return ['new', 'label'];
  }

  // Delivered = terminal
  if (currentStage === 'delivered') {
    return [];
  }

  // Shipped → can advance to delivered manually, or back to issue
  if (currentStage === 'shipped') {
    return ['delivered', 'issue'];
  }

  if (currentIndex < STAGE_ORDER.length - 1) {
    const nextStage = STAGE_ORDER[currentIndex + 1];
    if (nextStage === 'shipped' && !order.shipment?.trackingNumber) {
      // skip — needs tracking
    } else {
      available.push(nextStage);
    }
  }

  if (currentIndex > 0) {
    available.push(STAGE_ORDER[currentIndex - 1]);
  }

  available.push('issue');
  return available;
}

export function getStageName(stage: FulfillmentStage): string {
  const names: Record<FulfillmentStage, string> = {
    new: 'Nuevo',
    label: 'Etiquetado',
    shipped: 'Enviado',
    delivered: 'Entregado',
    issue: 'Problema',
  };
  return names[stage];
}

export function requiresTrackingForShip(order: Order): boolean {
  return order.fulfillmentStage === 'label' && !order.shipment?.trackingNumber;
}
