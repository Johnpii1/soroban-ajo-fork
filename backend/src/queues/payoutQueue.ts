import { createQueue, getQueue } from './queueManager'
import { logger } from '../utils/logger'

// Queue name constant
export const PAYOUT_QUEUE_NAME = 'payout'

// Payout job data types
export interface PayoutJobData {
  groupId: string
  recipientId: string
  recipientAddress: string
  amount: number
  currency: string
  cycleNumber: number
  transactionHash?: string
  priority?: number
}

// Additional payout options
export interface PayoutJobOptions {
  delay?: number // Delay for scheduled payouts
  priority?: number // Job priority
  attempts?: number // Custom retry attempts
}

/**
 * Get or create the payout queue
 */
export function getPayoutQueue() {
  return getQueue(PAYOUT_QUEUE_NAME) || createQueue(PAYOUT_QUEUE_NAME)
}

/**
 * Add a payout job to the queue
 */
export async function addPayoutJob(
  data: PayoutJobData,
  options?: PayoutJobOptions
): Promise<string> {
  const queue = getPayoutQueue()
  
  const jobId = `payout-${Date.now()}-${Math.random().toString(36).substring(7)}`
  
  const jobOptions: any = {
    jobId,
  }
  
  // Add delay if specified for scheduled payouts
  if (options?.delay) {
    jobOptions.delay = options.delay
  }
  
  // Add priority if specified
  if (options?.priority !== undefined) {
    jobOptions.priority = options.priority
  }
  
  // Override retry attempts if specified
  if (options?.attempts !== undefined) {
    jobOptions.attempts = options.attempts
  }
  
  await queue.add('process-payout', data, jobOptions)
  
  logger.info(`Payout job added to queue`, {
    groupId: data.groupId,
    recipientId: data.recipientId,
    recipientAddress: data.recipientAddress,
    amount: data.amount,
    currency: data.currency,
    cycleNumber: data.cycleNumber,
    jobId,
    delay: options?.delay || 0,
    priority: options?.priority || 0,
  })
  
  return jobId
}

/**
 * Add a batch of payout jobs
 */
export async function addBatchPayoutJobs(
  payouts: Array<{ data: PayoutJobData; options?: PayoutJobOptions }>
): Promise<string[]> {
  const queue = getPayoutQueue()
  const jobIds: string[] = []
  
  const jobs = payouts.map((payout) => {
    const jobId = `payout-${Date.now()}-${Math.random().toString(36).substring(7)}`
    jobIds.push(jobId)
    
    const jobOptions: any = {
      jobId,
    }
    
    if (payout.options?.delay) {
      jobOptions.delay = payout.options.delay
    }
    
    if (payout.options?.priority !== undefined) {
      jobOptions.priority = payout.options.priority
    }
    
    if (payout.options?.attempts !== undefined) {
      jobOptions.attempts = payout.options.attempts
    }
    
    return queue.add('process-payout', payout.data, jobOptions)
  })
  
  await Promise.all(jobs)
  
  logger.info(`Batch of ${payouts.length} payout jobs added to queue`, { jobIds })
  
  return jobIds
}

/**
 * Get payout queue statistics
 */
export async function getPayoutQueueStats() {
  const queue = getPayoutQueue()
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
