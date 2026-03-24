import { createQueue, getQueue } from './queueManager'
import { logger } from '../utils/logger'

// Queue name constant
export const SYNC_QUEUE_NAME = 'sync'

// Sync job data types
export interface SyncJobData {
  groupId: string
  syncType: 'full' | 'incremental'
  startBlock?: number
  endBlock?: number
  priority?: number
}

// Additional sync options
export interface SyncJobOptions {
  delay?: number // Delay in milliseconds
  priority?: number // Job priority
  attempts?: number // Custom retry attempts
}

/**
 * Get or create the sync queue
 */
export function getSyncQueue() {
  return getQueue(SYNC_QUEUE_NAME) || createQueue(SYNC_QUEUE_NAME)
}

/**
 * Add a sync job to the queue
 */
export async function addSyncJob(
  data: SyncJobData,
  options?: SyncJobOptions
): Promise<string> {
  const queue = getSyncQueue()
  
  const jobId = `sync-${Date.now()}-${Math.random().toString(36).substring(7)}`
  
  const jobOptions: any = {
    jobId,
  }
  
  // Add delay if specified
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
  
  await queue.add('blockchain-sync', data, jobOptions)
  
  logger.info(`Sync job added to queue`, {
    groupId: data.groupId,
    syncType: data.syncType,
    jobId,
    delay: options?.delay || 0,
    priority: options?.priority || 0,
  })
  
  return jobId
}

/**
 * Add a batch of sync jobs for multiple groups
 */
export async function addBatchSyncJobs(
  syncs: Array<{ data: SyncJobData; options?: SyncJobOptions }>
): Promise<string[]> {
  const queue = getSyncQueue()
  const jobIds: string[] = []
  
  const jobs = syncs.map((sync) => {
    const jobId = `sync-${Date.now()}-${Math.random().toString(36).substring(7)}`
    jobIds.push(jobId)
    
    const jobOptions: any = {
      jobId,
    }
    
    if (sync.options?.delay) {
      jobOptions.delay = sync.options.delay
    }
    
    if (sync.options?.priority !== undefined) {
      jobOptions.priority = sync.options.priority
    }
    
    if (sync.options?.attempts !== undefined) {
      jobOptions.attempts = sync.options.attempts
    }
    
    return queue.add('blockchain-sync', sync.data, jobOptions)
  })
  
  await Promise.all(jobs)
  
  logger.info(`Batch of ${syncs.length} sync jobs added to queue`, { jobIds })
  
  return jobIds
}

/**
 * Get sync queue statistics
 */
export async function getSyncQueueStats() {
  const queue = getSyncQueue()
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
