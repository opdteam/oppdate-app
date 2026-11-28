import { FastifyInstance } from 'fastify'
import * as Sentry from '@sentry/node'
import { authRoutes } from './auth'
import { opportunityRoutes } from './opportunities'
import { applicationRoutes } from './applications'
import { documentRoutes } from './documents'
import { messagingRoutes } from './messaging'
import { paymentRoutes } from './payments'
import { consultationRoutes } from './consultations'
import { mentorshipRoutes } from './mentorships'
import { ebookRoutes } from './ebooks'
import { notificationRoutes } from './notifications'
import { adminRoutes } from './admin'
import { aiRoutes } from './ai'
import { savedOpportunityRoutes } from './savedOpportunities'
import { savedSearchRoutes } from './savedSearches'
import { supportRoutes } from './support'
import { guideSessionRoutes } from './guideSessions'
import { eligibilityRoutes } from './eligibility'
import { inquiryRoutes } from './inquiries'
import { blogRoutes } from './blog'
import { newsletterRoutes } from './newsletter'

export async function registerRoutes(server: FastifyInstance) {
  const API_PREFIX = '/api/v1'

  await server.register(authRoutes,               { prefix: `${API_PREFIX}/auth` })
  await server.register(opportunityRoutes,        { prefix: `${API_PREFIX}/opportunities` })
  await server.register(applicationRoutes,        { prefix: `${API_PREFIX}/applications` })
  await server.register(documentRoutes,           { prefix: `${API_PREFIX}/documents` })
  await server.register(messagingRoutes,          { prefix: `${API_PREFIX}/messages` })
  await server.register(paymentRoutes,            { prefix: `${API_PREFIX}/payments` })
  await server.register(consultationRoutes,       { prefix: `${API_PREFIX}/consultations` })
  await server.register(mentorshipRoutes,         { prefix: `${API_PREFIX}/mentorships` })
  await server.register(ebookRoutes,              { prefix: `${API_PREFIX}/ebooks` })
  await server.register(notificationRoutes,       { prefix: `${API_PREFIX}/notifications` })
  await server.register(adminRoutes,              { prefix: `${API_PREFIX}/admin` })
  await server.register(aiRoutes,                 { prefix: `${API_PREFIX}/ai` })
  await server.register(savedOpportunityRoutes,   { prefix: `${API_PREFIX}/saved-opportunities` })
  await server.register(savedSearchRoutes,        { prefix: `${API_PREFIX}/saved-searches` })
  await server.register(supportRoutes,            { prefix: `${API_PREFIX}/support` })
  await server.register(guideSessionRoutes,       { prefix: `${API_PREFIX}/guide-sessions` })
  await server.register(eligibilityRoutes,        { prefix: `${API_PREFIX}/opportunities` })
  await server.register(inquiryRoutes,            { prefix: `${API_PREFIX}/inquiries` })
  await server.register(blogRoutes,              { prefix: `${API_PREFIX}/blog` })
  await server.register(newsletterRoutes,        { prefix: `${API_PREFIX}/newsletter` })

  // 404 handler
  server.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: `Route ${request.method} ${request.url} not found.`,
      code: 'ROUTE_NOT_FOUND',
      statusCode: 404,
    })
  })

  // Global error handler
  server.setErrorHandler((error, request, reply) => {
    server.log.error(error)

    const isProd = process.env.NODE_ENV === 'production'

    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed.',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: isProd
          ? error.validation.map(v => ({ message: v.message }))
          : error.validation,
      })
    }

    // Report 5xx errors to Sentry
    const status = error.statusCode || 500
    if (status >= 500) {
      Sentry.captureException(error, {
        extra: { method: request.method, url: request.url },
      })
    }

    // In production, never expose internal error messages for 5xx
    const clientMessage = (isProd && status >= 500)
      ? 'An unexpected error occurred.'
      : (error.message || 'An unexpected error occurred.')

    return reply.status(status).send({
      success: false,
      error: clientMessage,
      code: 'SERVER_ERROR',
      statusCode: status,
    })
  })
}
