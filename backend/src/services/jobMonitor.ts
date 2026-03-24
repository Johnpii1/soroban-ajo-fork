import { getQueue, getQueueStats } from '../queues/queueManager'
import { 
  EMAIL_QUEUE_NAME, 
  PAYOUT_QUEUE_NAME, 
  SYNC_QUEUE_NAME, 
  NOTIFICATION_QUEUE_NAME 
} from '../queues'
import { logger } from '../utils/logger'

// Queue statistics interface
export interface QueueStats {
  name: string
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
}

// Failed job info interface
export interface FailedJobInfo {
  id: string
  name: string
  data: any
  failedReason: string
  failedAt: string
  attemptsMade: number
}

/**
 * Get statistics for a specific queue
 */
export async function getQueueStatistics(queueName: string): Promise<QueueStats | null> {
  const stats = await getQueueStats(queueName)
  if (!stats) return null
  
  return {
    name: queueName,
    ...stats,
  }
}

/**
 * Get statistics for all queues
 */
export async function getAllQueueStatistics(): Promise<QueueStats[]> {
  const queueNames = [EMAIL_QUEUE_NAME, PAYOUT_QUEUE_NAME, SYNC_QUEUE_NAME, NOTIFICATION_QUEUE_NAME]
  const allStats: QueueStats[] = []
  
  for (const name of queueNames) {
    const stats = await getQueueStatistics(name)
    if (stats) {
      allStats.push(stats)
    }
  }
  
  return allStats
}

/**
 * Get failed jobs from a specific queue
 */
export async function getFailedJobs(
  queueName: string, 
  start: number = 0, 
  end: number = 10
): Promise<FailedJobInfo[]> {
  const queue = getQueue(queueName)
  if (!queue) return []
  
  const failedJobs = await queue.getFailed(start, end)
  
  return failedJobs.map((job) => ({
    id: job.id || 'unknown',
    name: job.name,
    data: job.data,
    failedReason: job.failedReason || 'Unknown error',
    failedAt: new Date(job.timestamp).toISOString(),
    attemptsMade: job.attemptsMade,
  }))
}

/**
 * Get a specific job by ID
 */
export async function getJobById(queueName: string, jobId: string): Promise<any> {
  const queue = getQueue(queueName)
  if (!queue) return null
  
  const job = await queue.getJob(jobId)
  if (!job) return null
  
  const state = await job.getState()
  
  return {
    id: job.id,
    name: job.name,
    data: job.data,
    progress: job.progress,
    state,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason,
    finishedOn: job.finishedOn,
    processedOn: job.processedOn,
    timestamp: job.timestamp,
  }
}

/**
 * Retry a specific failed job
 */
export async function retryFailedJob(queueName: string, jobId: string): Promise<boolean> {
  const queue = getQueue(queueName)
  if (!queue) return false
  
  const job = await queue.getJob(jobId)
  if (!job) return false
  
  await job.retry()
  logger.info(`Job ${jobId} in queue ${queueName} has been requeued for retry`)
  
  return true
}

/**
 * Remove a specific job
 */
export async function removeJob(queueName: string, jobId: string): Promise<boolean> {
  const queue = getQueue(queueName)
  if (!queue) return false
  
  const job = await queue.getJob(jobId)
  if (!job) return false
  
  await job.remove()
  logger.info(`Job ${jobId} removed from queue ${queueName}`)
  
  return true
}

/**
 * Clean old completed jobs from a queue
 */
export async function cleanCompletedJobs(queueName: string, age: number = 3600): Promise<number> {
  const queue = getQueue(queueName)
  if (!queue) return 0
  
  const cleanedJobIds = await queue.clean(age, 1000, 'completed')
  const count = Array.isArray(cleanedJobIds) ? cleanedJobIds.length : 0
  logger.info(`Cleaned ${count} completed jobs from queue ${queueName}`)
  
  return count
}

/**
 * Clean old failed jobs from a queue
 */
export async function cleanFailedJobs(queueName: string, age: number = 86400): Promise<number> {
  const queue = getQueue(queueName)
  if (!queue) return 0
  
  const cleanedJobIds = await queue.clean(age, 1000, 'failed')
  const count = Array.isArray(cleanedJobIds) ? cleanedJobIds.length : 0
  logger.info(`Cleaned ${count} failed jobs from queue ${queueName}`)
  
  return count
}

/**
 * Get overall system health status
 */
export async function getSystemHealth(): Promise<{
  healthy: boolean
  queues: QueueStats[]
  totalFailed: number
  totalActive: number
}> {
  const stats = await getAllQueueStatistics()
  
  const totalFailed = stats.reduce((sum, q) => sum + q.failed, 0)
  const totalActive = stats.reduce((sum, q) => sum + q.active, 0)
  
  // System is healthy if no queues have excessive failures
  const healthy = !stats.some((q) => q.failed > 100)
  
  return {
    healthy,
    queues: stats,
    totalFailed,
    totalActive,
  }
}
