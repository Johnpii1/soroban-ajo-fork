import { createQueue, getQueue } from './queueManager'
import { logger } from '../utils/logger'

// Queue name constant
export const NOTIFICATION_QUEUE_NAME = 'notification'

// Notification types
export type NotificationType = 
  | 'group_invite'
  | 'payment_received'
  | 'payment_reminder'
  | 'cycle_complete'
  | 'withdrawal_complete'
  | 'group_update'
  | 'system_alert'

// Notification job data types
export interface NotificationJobData {
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
  channels?: Array<'push' | 'email' | 'sms'>
  priority?: number
}

// Additional notification options
export interface NotificationJobOptions {
  delay?: number // Delay in milliseconds
  priority?: number // Job priority
  attempts?: number // Custom retry attempts
}

/**
 * Get or create the notification queue
 */
export function getNotificationQueue() {
  return getQueue(NOTIFICATION_QUEUE_NAME) || createQueue(NOTIFICATION_QUEUE_NAME)
}

/**
 * Add a notification job to the queue
 */
export async function addNotificationJob(
  data: NotificationJobData,
  options?: NotificationJobOptions
): Promise<string> {
  const queue = getNotificationQueue()
  
  const jobId = `notif-${Date.now()}-${Math.random().toString(36).substring(7)}`
  
  const jobOptions: any = {
    jobId,
  }
  
  // Add delay if specified
  if (options?.delay) {
    jobOptions.delay = options.delay
  }
  
  // Add priority if specified (higher = more important)
  if (options?.priority !== undefined) {
    jobOptions.priority = options.priority
  }
  
  // Override retry attempts if specified
  if (options?.attempts !== undefined) {
    jobOptions.attempts = options.attempts
  }
  
  await queue.add('send-notification', data, jobOptions)
  
  logger.info(`Notification job added to queue`, {
    userId: data.userId,
    type: data.type,
    title: data.title,
    jobId,
    delay: options?.delay || 0,
    priority: options?.priority || 0,
  })
  
  return jobId
}

/**
 * Add a batch of notification jobs
 */
export async function addBatchNotificationJobs(
  notifications: Array<{ data: NotificationJobData; options?: NotificationJobOptions }>
): Promise<string[]> {
  const queue = getNotificationQueue()
  const jobIds: string[] = []
  
  const jobs = notifications.map((notification) => {
    const jobId = `notif-${Date.now()}-${Math.random().toString(36).substring(7)}`
    jobIds.push(jobId)
    
    const jobOptions: any = {
      jobId,
    }
    
    if (notification.options?.delay) {
      jobOptions.delay = notification.options.delay
    }
    
    if (notification.options?.priority !== undefined) {
      jobOptions.priority = notification.options.priority
    }
    
    if (notification.options?.attempts !== undefined) {
      jobOptions.attempts = notification.options.attempts
    }
    
    return queue.add('send-notification', notification.data, jobOptions)
  })
  
  await Promise.all(jobs)
  
  logger.info(`Batch of ${notifications.length} notification jobs added to queue`, { jobIds })
  
  return jobIds
}

/**
 * Get notification queue statistics
 */
export async function getNotificationQueueStats() {
  const queue = getNotificationQueue()
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
