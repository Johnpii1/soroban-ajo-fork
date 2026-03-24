import { createQueue, getQueue } from './queueManager'
import { logger } from '../utils/logger'

// Queue name constant
export const EMAIL_QUEUE_NAME = 'email'

// Email job data types
export interface EmailJobData {
  to: string
  subject: string
  body: string
  template?: string
  attachments?: Array<{
    filename: string
    path: string
  }>
  priority?: number
}

// Additional email options
export interface EmailJobOptions {
  delay?: number // Delay in milliseconds for scheduled emails
  priority?: number // Job priority (higher = more important)
}

/**
 * Get or create the email queue
 */
export function getEmailQueue() {
  return getQueue(EMAIL_QUEUE_NAME) || createQueue(EMAIL_QUEUE_NAME)
}

/**
 * Add an email job to the queue
 */
export async function addEmailJob(
  data: EmailJobData,
  options?: EmailJobOptions
): Promise<string> {
  const queue = getEmailQueue()
  
  const jobId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
  
  const jobOptions: any = {
    jobId,
  }
  
  // Add delay if specified for scheduled emails
  if (options?.delay) {
    jobOptions.delay = options.delay
  }
  
  // Add priority if specified
  if (options?.priority !== undefined) {
    jobOptions.priority = options.priority
  }
  
  await queue.add('send-email', data, jobOptions)
  
  logger.info(`Email job added to queue`, {
    to: data.to,
    subject: data.subject,
    jobId,
    delay: options?.delay || 0,
    priority: options?.priority || 0,
  })
  
  return jobId
}

/**
 * Get email queue statistics
 */
export async function getEmailQueueStats() {
  const queue = getEmailQueue()
  if (!queue) return null
  
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ])
  
  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
  }
}
