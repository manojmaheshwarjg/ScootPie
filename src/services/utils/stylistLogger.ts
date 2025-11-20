const STYLIST_LOG_PREFIX = '[FashionStylist]';

export function stylistLog(stage: string, details?: unknown) {
  if (typeof details !== 'undefined') {
    console.log(`${STYLIST_LOG_PREFIX}[${stage}]`, details);
  } else {
    console.log(`${STYLIST_LOG_PREFIX}[${stage}]`);
  }
}

export function stylistWarn(stage: string, details?: unknown) {
  if (typeof details !== 'undefined') {
    console.warn(`${STYLIST_LOG_PREFIX}[${stage}]`, details);
  } else {
    console.warn(`${STYLIST_LOG_PREFIX}[${stage}]`);
  }
}

export function stylistError(stage: string, details?: unknown) {
  if (typeof details !== 'undefined') {
    console.error(`${STYLIST_LOG_PREFIX}[${stage}]`, details);
  } else {
    console.error(`${STYLIST_LOG_PREFIX}[${stage}]`);
  }
}

