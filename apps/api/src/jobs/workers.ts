import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { sendEmail } from '../utils/email'
import { db, schema } from '../db'
import { eq, and, lt, gt, gte, lte, ilike, sql } from 'drizzle-orm'
import type { EmailJobData, NotificationJobData, ScheduledJobData } from './queue'
import { enqueueEmail, enqueueNotification } from './queue'
import { broadcastToUser } from '../routes/messaging'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

let connection: IORedis | null = null

function getConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null })
  }
  return connection
}

// Email worker -- sends emails via Resend
// Critical: keep concurrency and polling responsive for transactional emails
const emailWorker = new Worker<EmailJobData>(
  'email',
  async (job) => {
    const { to, subject, html } = job.data
    const sent = await sendEmail({ to, subject, html })
    if (!sent) throw new Error('Email send failed')
  },
  {
    connection: getConnection(),
    concurrency: 3,         // reduced from 5 — still fast enough for transactional volume
    stalledInterval: 60000, // check for stalled jobs every 60s (default: 30s)
    maxStalledCount: 1,
  }
)

// Notification worker -- creates in-app notifications
// Slight delay (a few seconds) is acceptable for in-app notifications
const notificationWorker = new Worker<NotificationJobData>(
  'notification',
  async (job) => {
    const { userId, type, title, body, referenceId, referenceType } = job.data
    const [notif] = await db.insert(schema.notifications).values({
      userId,
      type: type as any,
      title,
      body,
      referenceId,
      referenceType,
    }).returning()
    broadcastToUser(userId, { type: 'new_notification', notification: notif })
  },
  {
    connection: getConnection(),
    concurrency: 5,          // reduced from 10
    stalledInterval: 60000,  // check for stalled jobs every 60s (default: 30s)
    maxStalledCount: 1,
  }
)

// Scheduled worker -- handles recurring cron tasks
// These run at most a few times per day so aggressive polling is wasteful
const scheduledWorker = new Worker<ScheduledJobData>(
  'scheduled',
  async (job) => {
    const { type, payload } = job.data

    switch (type) {
      case 'subscription_expiry_check': {
        // Find users with expired Premium subscriptions
        const now = new Date()
        const expired = await db
          .select({ id: schema.users.id, email: schema.users.email })
          .from(schema.users)
          .where(
            and(
              eq(schema.users.isPremium, true),
              lt(schema.users.premiumUntil, now)
            )
          )

        for (const user of expired) {
          await db
            .update(schema.users)
            .set({ isPremium: false, updatedAt: now })
            .where(eq(schema.users.id, user.id))

          const [expiryNotif] = await db.insert(schema.notifications).values({
            userId: user.id,
            type: 'payment_confirmed',
            title: 'Premium subscription expired',
            body: 'Your Premium subscription has expired. Renew to maintain access to all features.',
            referenceId: user.id,
            referenceType: 'premium',
          }).returning()
          broadcastToUser(user.id, { type: 'new_notification', notification: expiryNotif })
        }
        break
      }

      case 'deadline_reminder': {
        const now = new Date()
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

        // Find applications with upcoming opportunity deadlines (within 3 days)
        const upcoming = await db
          .select({
            applicationId: schema.applications.id,
            userId: schema.applications.userId,
            referenceId: schema.applications.referenceId,
            oppTitle: schema.opportunities.title,
            deadline: schema.opportunities.deadline,
          })
          .from(schema.applications)
          .innerJoin(schema.opportunities, eq(schema.applications.opportunityId, schema.opportunities.id))
          .where(
            and(
              gt(schema.opportunities.deadline, now),
              lt(schema.opportunities.deadline, threeDaysFromNow)
            )
          )

        for (const app of upcoming) {
          if (!app.deadline) continue
          const daysLeft = Math.ceil((app.deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

          const [user] = await db
            .select({ name: schema.users.name, email: schema.users.email, preferences: schema.users.preferences })
            .from(schema.users)
            .where(eq(schema.users.id, app.userId))
            .limit(1)

          const prefs = (user?.preferences as Record<string, unknown>) ?? {}

          if (prefs.inapp_reminders !== false) {
            await enqueueNotification({
              userId: app.userId,
              type: 'deadline_reminder',
              title: 'Deadline approaching',
              body: `The deadline for "${app.oppTitle}" is in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
              referenceId: app.applicationId,
              referenceType: 'application',
            })
          }

          if (user && prefs.email_deadline !== false) {
            await enqueueEmail({
              to: user.email,
              subject: `Deadline in ${daysLeft} day${daysLeft === 1 ? '' : 's'}: ${app.oppTitle}`,
              html: `<p>Hi ${user.name},</p><p>The deadline for <strong>${app.oppTitle}</strong> is in <strong>${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong>.</p><p>Log in to your OppDate dashboard to check your application status.</p><p>-- The OppDate Team</p>`,
            })
          }
        }
        break
      }

      case 'opportunity_expiry_archive': {
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const result = await db
          .update(schema.opportunities)
          .set({ status: 'expired', updatedAt: new Date() })
          .where(
            and(
              eq(schema.opportunities.status, 'published'),
              lte(schema.opportunities.deadline, cutoff)
            )
          )
          .returning()
        if (result.length > 0) {
          console.log(`Archived ${result.length} expired opportunities`)
        }
        break
      }

      case 'saved_search_alert': {
        const now = new Date()
        const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000)

        // Find opportunities published or updated in the last 6 hours
        const recentOpps = await db
          .select({
            id: schema.opportunities.id,
            title: schema.opportunities.title,
            slug: schema.opportunities.slug,
            type: schema.opportunities.type,
            region: schema.opportunities.region,
            country: schema.opportunities.country,
            fieldOfStudy: schema.opportunities.fieldOfStudy,
            eligibilityLevel: schema.opportunities.eligibilityLevel,
          })
          .from(schema.opportunities)
          .where(
            and(
              eq(schema.opportunities.status, 'published'),
              gte(schema.opportunities.updatedAt, sixHoursAgo)
            )
          )

        if (recentOpps.length === 0) break

        // Get all saved searches with alerts enabled
        const searches = await db
          .select({
            id: schema.savedSearches.id,
            userId: schema.savedSearches.userId,
            name: schema.savedSearches.name,
            filters: schema.savedSearches.filters,
          })
          .from(schema.savedSearches)
          .where(eq(schema.savedSearches.alertsEnabled, true))

        for (const search of searches) {
          const filters = search.filters as Record<string, string | undefined>
          const matches = recentOpps.filter((opp) => {
            if (filters.type && opp.type !== filters.type) return false
            if (filters.region && opp.region && !opp.region.toLowerCase().includes(filters.region.toLowerCase())) return false
            if (filters.country && opp.country && !opp.country.toLowerCase().includes(filters.country.toLowerCase())) return false
            if (filters.fieldOfStudy && opp.fieldOfStudy && !opp.fieldOfStudy.toLowerCase().includes(filters.fieldOfStudy.toLowerCase())) return false
            if (filters.eligibilityLevel && opp.eligibilityLevel && opp.eligibilityLevel !== filters.eligibilityLevel) return false
            return true
          })

          if (matches.length === 0) continue

          const matchTitles = matches.slice(0, 3).map((m) => m.title).join(', ')
          const extra = matches.length > 3 ? ` and ${matches.length - 3} more` : ''

          const [user] = await db
            .select({ name: schema.users.name, email: schema.users.email, preferences: schema.users.preferences })
            .from(schema.users)
            .where(eq(schema.users.id, search.userId))
            .limit(1)

          const prefs = (user?.preferences as Record<string, unknown>) ?? {}

          if (prefs.inapp_announcements !== false) {
            await enqueueNotification({
              userId: search.userId,
              type: 'saved_search_alert',
              title: `New matches for "${search.name}"`,
              body: `${matches.length} new opportunit${matches.length === 1 ? 'y' : 'ies'} match your saved search: ${matchTitles}${extra}.`,
              referenceId: search.id,
              referenceType: 'saved_search',
            })
          }

          if (user && prefs.email_matching !== false) {
            const listHtml = matches.slice(0, 5).map((m) => `<li>${m.title}</li>`).join('')
            await enqueueEmail({
              to: user.email,
              subject: `${matches.length} new match${matches.length === 1 ? '' : 'es'} for "${search.name}"`,
              html: `<p>Hi ${user.name},</p><p>New opportunities matching your saved search "<strong>${search.name}</strong>":</p><ul>${listHtml}</ul>${matches.length > 5 ? `<p>...and ${matches.length - 5} more.</p>` : ''}<p>Log in to your OppDate dashboard to view them.</p><p>-- The OppDate Team</p>`,
            })
          }
        }
        break
      }
    }
  },
  {
    connection: getConnection(),
    concurrency: 1,           // cron jobs never need parallelism
    stalledInterval: 300000,  // check for stalled jobs every 5 min (default: 30s)
    maxStalledCount: 1,
  }
)

export function startWorkers() {
  console.log('BullMQ workers started')
  emailWorker.on('failed', (job, err) => console.error('Email job failed:', job?.id, err.message))
  notificationWorker.on('failed', (job, err) => console.error('Notification job failed:', job?.id, err.message))
  scheduledWorker.on('failed', (job, err) => console.error('Scheduled job failed:', job?.id, err.message))
}

export async function stopWorkers() {
  await emailWorker.close()
  await notificationWorker.close()
  await scheduledWorker.close()
  connection?.disconnect()
}
