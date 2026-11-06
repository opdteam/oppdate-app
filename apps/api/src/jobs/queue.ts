import { Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

let connection: IORedis | null = null

function getConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null })
  }
  return connection
}

// Queues
export const emailQueue = new Queue('email', { connection: getConnection() })
export const notificationQueue = new Queue('notification', { connection: getConnection() })
export const scheduledQueue = new Queue('scheduled', { connection: getConnection() })

// Job types
export interface EmailJobData {
  to: string
  subject: string
  html: string
}

export interface NotificationJobData {
  userId: string
  type: string
  title: string
  body: string
  referenceId?: string
  referenceType?: string
}

export interface ScheduledJobData {
  type: 'deadline_reminder' | 'subscription_expiry_check' | 'saved_search_alert' | 'opportunity_expiry_archive'
  payload: Record<string, unknown>
}

// Enqueue helpers
export async function enqueueEmail(data: EmailJobData) {
  await emailQueue.add('send', data, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } })
}

export async function enqueueNotification(data: NotificationJobData) {
  await notificationQueue.add('create', data, { attempts: 2 })
}

// Register repeatable cron jobs
export async function registerScheduledJobs() {
  // Check for expired premium subscriptions once daily at midnight UTC
  // Hourly was wasteful — a subscription expiring a few hours late has no real impact
  await scheduledQueue.upsertJobScheduler(
    'subscription_expiry_check',
    { pattern: '0 0 * * *' },
    {
      name: 'subscription_expiry_check',
      data: { type: 'subscription_expiry_check', payload: {} },
    }
  )

  // Check for upcoming deadlines daily at 8 AM UTC
  await scheduledQueue.upsertJobScheduler(
    'deadline_reminder',
    { pattern: '0 8 * * *' },
    {
      name: 'deadline_reminder',
      data: { type: 'deadline_reminder', payload: {} },
    }
  )

  // Check for new opportunities matching saved searches every 12 hours
  await scheduledQueue.upsertJobScheduler(
    'saved_search_alert',
    { pattern: '0 */12 * * *' },
    {
      name: 'saved_search_alert',
      data: { type: 'saved_search_alert', payload: {} },
    }
  )

  // Archive opportunities whose deadline passed more than 30 days ago, daily at 2 AM UTC
  await scheduledQueue.upsertJobScheduler(
    'opportunity_expiry_archive',
    { pattern: '0 2 * * *' },
    {
      name: 'opportunity_expiry_archive',
      data: { type: 'opportunity_expiry_archive', payload: {} },
    }
  )
}

// Close connections on shutdown
export async function closeQueues() {
  await emailQueue.close()
  await notificationQueue.close()
  await scheduledQueue.close()
  connection?.disconnect()
}
