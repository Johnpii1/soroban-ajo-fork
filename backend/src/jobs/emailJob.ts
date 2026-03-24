import { Job } from 'bullmq'
import { EmailJobData } from '../queues/emailQueue'
import { logger } from '../utils/logger'

// Email service interface (implement based on your email provider)
interface EmailService {
  sendEmail(data: {
    to: string
    subject: string
    body: string
    html?: string
    attachments?: Array<{ filename: string; path: string }>
  }): Promise<{ success: boolean; messageId?: string; error?: string }>
}

// Mock email service implementation (replace with actual email service)
const emailService: EmailService = {
  async sendEmail(data) {
    // Simulate email sending
    logger.info(`[MOCK] Sending email to ${data.to}`, {
      subject: data.subject,
    })
    
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100))
    
    // Mock success response
    return {
      success: true,
      messageId: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    }
  },
}

/**
 * Process email jobs
 */
export async function processEmailJob(job: Job<EmailJobData>): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  const { to, subject, body, template, attachments } = job.data
  
  logger.info(`Processing email job ${job.id}`, {
    to,
    subject,
    attempt: job.attemptsMade + 1,
  })
  
  try {
    // Update job progress
    await job.updateProgress(10)
    
    // Validate email data
    if (!to || !subject || !body) {
      throw new Error('Missing required email fields: to, subject, or body')
    }
    
    // Validate email format (basic validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      throw new Error(`Invalid email address: ${to}`)
    }
    
    await job.updateProgress(30)
    
    // Apply template if specified (simplified implementation)
    let emailBody = body
    if (template) {
      // In a real implementation, you would use a templating engine like Handlebars or EJS
      logger.debug(`Applying template: ${template}`)
      // emailBody = applyTemplate(template, job.data)
    }
    
    await job.updateProgress(50)
    
    // Send email
    const result = await emailService.sendEmail({
      to,
      subject,
      body: emailBody,
      html: emailBody, // For HTML emails
      attachments,
    })
    
    await job.updateProgress(100)
    
    if (result.success) {
      logger.info(`Email sent successfully to ${to}`, {
        jobId: job.id,
        messageId: result.messageId,
      })
      
      return {
        success: true,
        messageId: result.messageId,
      }
    } else {
      throw new Error(result.error || 'Email sending failed')
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    logger.error(`Failed to send email to ${to}`, {
      jobId: job.id,
      error: errorMessage,
      attempt: job.attemptsMade + 1,
    })
    
    throw error // Re-throw to trigger BullMQ retry
  }
}

/**
 * Create email job options for delayed/scheduled emails
 */
export function createScheduledEmailJob(delayMs: number) {
  return {
    delay: delayMs,
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 1000,
    },
  }
}
