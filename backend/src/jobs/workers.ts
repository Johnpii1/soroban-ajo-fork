import { createWorker } from '../queues/queueManager'
import { EMAIL_QUEUE_NAME } from '../queues/emailQueue'
import { PAYOUT_QUEUE_NAME } from '../queues/payoutQueue'
import { SYNC_QUEUE_NAME } from '../queues/syncQueue'
import { NOTIFICATION_QUEUE_NAME } from '../queues/notificationQueue'
import { processEmailJob } from './emailJob'
import { processPayoutJob } from './payoutJob'
import { logger } from '../utils/logger'
import { Job } from 'bullmq'

// Sync job data type
interface SyncJobData {
  groupId: string
  syncType: 'full' | 'incremental'
  startBlock?: number
  endBlock?: number
}

// Notification job data type
interface NotificationJobData {
  userId: string
  type: string
  title: string
  message: string
  data?: Record<string, any>
  channels?: Array<'push' | 'email' | 'sms'>
}

// Mock sync processor
async function processSyncJob(job: Job<SyncJobData>): Promise<{
  success: boolean
  blocksProcessed?: number
  error?: string
}> {
  logger.info(`[MOCK] Processing sync job ${job.id}`, {
    groupId: job.data.groupId,
    syncType: job.data.syncType,
    startBlock: job.data.startBlock,
    endBlock: job.data.endBlock,
  })
  
  // Simulate sync processing
  await new Promise((resolve) => setTimeout(resolve, 300))
  
  const blocksProcessed = job.data.endBlock 
    ? job.data.endBlock - (job.data.startBlock || 0)
    : 100
  
  return {
    success: true,
    blocksProcessed,
  }
}

// Mock notification processor
async function processNotificationJob(job: Job<NotificationJobData>): Promise<{
  success: boolean
  channelsSent?: string[]
  error?: string
}> {
  const { userId, type, title, message: _message, channels } = job.data
  
  logger.info(`[MOCK] Processing notification job ${job.id}`, {
    userId,
    type,
    title,
  })
  
  // Simulate notification processing
  await new Promise((resolve) => setTimeout(resolve, 100))
  
  const channelsSent = channels || ['push', 'email']
  
  return {
    success: true,
    channelsSent,
  }
}

// Worker concurrency settings
const WORKER_CONCURRENCY = {
  email: 10,
  payout: 5,
  sync: 3,
  notification: 15,
}

/**
 * Initialize all workers
 */
export function initializeWorkers() {
  logger.info('Initializing job workers...')
  
  // Email worker
  const emailWorker = createWorker(
    EMAIL_QUEUE_NAME,
    processEmailJob,
    WORKER_CONCURRENCY.email
  )
  logger.info(`Email worker initialized with concurrency ${WORKER_CONCURRENCY.email}`)
  
  // Payout worker
  const payoutWorker = createWorker(
    PAYOUT_QUEUE_NAME,
    processPayoutJob,
    WORKER_CONCURRENCY.payout
  )
  logger.info(`Payout worker initialized with concurrency ${WORKER_CONCURRENCY.payout}`)
  
  // Sync worker
  const syncWorker = createWorker(
    SYNC_QUEUE_NAME,
    processSyncJob,
    WORKER_CONCURRENCY.sync
  )
  logger.info(`Sync worker initialized with concurrency ${WORKER_CONCURRENCY.sync}`)
  
  // Notification worker
  const notificationWorker = createWorker(
    NOTIFICATION_QUEUE_NAME,
    processNotificationJob,
    WORKER_CONCURRENCY.notification
  )
  logger.info(`Notification worker initialized with concurrency ${WORKER_CONCURRENCY.notification}`)
  
  logger.info('All workers initialized successfully')
  
  return {
    emailWorker,
    payoutWorker,
    syncWorker,
    notificationWorker,
  }
}
