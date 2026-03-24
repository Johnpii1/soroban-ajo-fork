// Re-export all queue-related modules
export * from './queueManager'
export * from './emailQueue'
export * from './payoutQueue'
export * from './syncQueue'
export * from './notificationQueue'

// Import queue creators for initialization
import { createQueue } from './queueManager'
import { EMAIL_QUEUE_NAME } from './emailQueue'
import { PAYOUT_QUEUE_NAME } from './payoutQueue'
import { SYNC_QUEUE_NAME } from './syncQueue'
import { NOTIFICATION_QUEUE_NAME } from './notificationQueue'

/**
 * Initialize all queues
 * Call this during application startup
 */
export function initializeQueues() {
  // Create all queues to ensure they exist
  createQueue(EMAIL_QUEUE_NAME)
  createQueue(PAYOUT_QUEUE_NAME)
  createQueue(SYNC_QUEUE_NAME)
  createQueue(NOTIFICATION_QUEUE_NAME)
}

// Export queue names for reference
export const QUEUE_NAMES = {
  EMAIL: EMAIL_QUEUE_NAME,
  PAYOUT: PAYOUT_QUEUE_NAME,
  SYNC: SYNC_QUEUE_NAME,
  NOTIFICATION: NOTIFICATION_QUEUE_NAME,
} as const
