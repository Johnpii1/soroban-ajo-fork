// Re-export all job-related modules
export { processEmailJob, createScheduledEmailJob } from './emailJob'
export { processPayoutJob, createScheduledPayoutJob } from './payoutJob'
export { initializeWorkers } from './workers'

// Import for side effects (worker initialization)
import { initializeWorkers } from './workers'
import { logger } from '../utils/logger'

/**
 * Start all job processors
 * Call this during application startup
 */
export function startJobProcessors() {
  try {
    const workers = initializeWorkers()
    logger.info('Job processors started successfully')
    return workers
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to start job processors', { error: errorMessage })
    throw error
  }
}
