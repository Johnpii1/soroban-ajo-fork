import { Queue, QueueEvents, Worker, JobsOptions, ConnectionOptions } from 'bullmq'
import Redis from 'ioredis'
import { logger } from '../utils/logger'

// Redis connection configuration
const redisConfig: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
}

// Create a shared Redis connection for direct access if needed
const redisInstance = new Redis({
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  maxRetriesPerRequest: null,
})

// Export the Redis instance for direct operations
export const redisConnection = redisInstance

// Default job options with exponential backoff retry logic
export const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000, // Start with 1 second delay
  },
  removeOnComplete: {
    age: 3600, // Keep completed jobs for 1 hour
    count: 100, // Keep up to 100 completed jobs
  },
  removeOnFail: {
    age: 86400, // Keep failed jobs for 24 hours
    count: 500, // Keep up to 500 failed jobs
  },
}

// Track all queues and workers for cleanup
const queues: Map<string, Queue> = new Map()
const queueEvents: Map<string, QueueEvents> = new Map()
const workers: Map<string, Worker> = new Map()

/**
 * Create a new queue with the given name
 */
export function createQueue(name: string): Queue {
  if (queues.has(name)) {
    logger.warn(`Queue ${name} already exists, returning existing queue`)
    return queues.get(name)!
  }

  const queue = new Queue(name, {
    connection: redisConfig,
    defaultJobOptions,
  })

  // Create queue events for monitoring
  const events = new QueueEvents(name, { connection: redisConfig })
  queueEvents.set(name, events)

  // Set up event listeners
  setupQueueEvents(queue, events, name)

  queues.set(name, queue)
  logger.info(`Queue ${name} created successfully`)

  return queue
}

/**
 * Set up event listeners for a queue
 */
function setupQueueEvents(queue: Queue, events: QueueEvents, queueName: string): void {
  // Log when jobs are added
  queue.on('waiting', (job) => {
    logger.debug(`Job ${job.id} is waiting in queue ${queueName}`)
  })

  // Log when jobs are completed
  events.on('completed', ({ jobId, returnvalue }) => {
    logger.info(`Job ${jobId} completed in queue ${queueName}`, { returnvalue })
  })

  // Log when jobs fail
  events.on('failed', ({ jobId, failedReason }) => {
    logger.error(`Job ${jobId} failed in queue ${queueName}`, { failedReason })
  })

  // Log when jobs are retried
  events.on('retries-exhausted', ({ jobId }) => {
    logger.warn(`Job ${jobId} exhausted all retries in queue ${queueName}`)
  })

  // Log when a delayed job is about to be processed
  events.on('delayed', ({ jobId, delay }) => {
    logger.debug(`Job ${jobId} delayed in queue ${queueName} for ${delay}ms`)
  })
}

/**
 * Create a worker for a queue with the specified processor
 */
export function createWorker<T = any>(
  name: string,
  processor: (job: any) => Promise<T>,
  concurrency: number = 5
): Worker {
  if (workers.has(name)) {
    logger.warn(`Worker for queue ${name} already exists`)
    return workers.get(name)!
  }

  const worker = new Worker(name, processor, {
    connection: redisConfig,
    concurrency,
  })

  // Set up worker event listeners
  worker.on('completed', (job) => {
    logger.info(`Worker completed job ${job.id} in queue ${name}`)
  })

  worker.on('failed', (job, err) => {
    logger.error(`Worker failed job ${job?.id} in queue ${name}`, { error: err.message })
  })

  worker.on('error', (err) => {
    logger.error(`Worker error in queue ${name}`, { error: err.message })
  })

  workers.set(name, worker)
  logger.info(`Worker for queue ${name} created with concurrency ${concurrency}`)

  return worker
}

/**
 * Get a queue by name
 */
export function getQueue(name: string): Queue | undefined {
  return queues.get(name)
}

/**
 * Get all registered queues
 */
export function getAllQueues(): Map<string, Queue> {
  return queues
}

/**
 * Get queue statistics
 */
export async function getQueueStats(name: string): Promise<{
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
} | null> {
  const queue = queues.get(name)
  if (!queue) {
    return null
  }

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ])

  return { waiting, active, completed, failed, delayed }
}

/**
 * Close all queues and workers gracefully
 */
export async function closeAllQueues(): Promise<void> {
  logger.info('Closing all queues and workers...')

  // Close all workers first
  for (const [name, worker] of workers) {
    await worker.close()
    logger.info(`Worker for queue ${name} closed`)
  }

  // Close all queue events
  for (const [name, events] of queueEvents) {
    await events.close()
    logger.info(`Queue events for ${name} closed`)
  }

  // Close all queues
  for (const [name, queue] of queues) {
    await queue.close()
    logger.info(`Queue ${name} closed`)
  }

  // Close Redis connection
  await redisConnection.quit()
  logger.info('Redis connection closed')
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await closeAllQueues()
  process.exit(0)
})

process.on('SIGINT', async () => {
  await closeAllQueues()
  process.exit(0)
})
