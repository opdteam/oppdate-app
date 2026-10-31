import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { ok, badRequest } from '../utils/response'
import { db, schema } from '../db'
import { eq } from 'drizzle-orm'
import { enqueueEmail } from '../jobs/queue'

const contactSchema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(10).max(5000),
})

export async function supportRoutes(server: FastifyInstance) {
  server.post('/contact', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const parsed = contactSchema.safeParse(request.body)
    if (!parsed.success) return badRequest(reply, 'Invalid request.')

    const [u] = await db
      .select({ name: schema.users.name, email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .limit(1)

    const supportEmail = process.env.SUPPORT_EMAIL || 'support@oppdate.com'

    await enqueueEmail({
      to: supportEmail,
      subject: `[Support] ${parsed.data.subject}`,
      html: `<p><strong>From:</strong> ${u?.name ?? 'Unknown'} &lt;${u?.email ?? 'unknown'}&gt;</p><p><strong>Subject:</strong> ${parsed.data.subject}</p><hr/><p>${parsed.data.message.replace(/\n/g, '<br/>')}</p>`,
    })

    return ok(reply, null, 'Your message has been received. We will get back to you within 24 hours.')
  })
}
