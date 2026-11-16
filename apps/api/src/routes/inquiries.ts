import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { created, badRequest, serverError } from '../utils/response'
import { enqueueEmail } from '../jobs/queue'

const BUCKET = process.env.R2_BUCKET_NAME || 'oppdate'

const CATEGORIES = [
  'careers',
  'get-featured',
  'partner-with-us',
  'become-a-consultant',
  'become-a-mentor',
  'list-your-ebook',
  'general',
] as const

const CATEGORY_LABELS: Record<string, string> = {
  'careers': 'Careers',
  'get-featured': 'Get Featured',
  'partner-with-us': 'Partner With Us',
  'become-a-consultant': 'Become a Consultant',
  'become-a-mentor': 'Become a Mentor',
  'list-your-ebook': 'List Your eBook',
  'general': 'General Inquiry',
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]

const fieldSchema = z.object({
  category: z.enum(CATEGORIES),
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  message: z.string().min(10).max(5000),
})

function getR2Client(): S3Client | null {
  const endpoint = process.env.R2_ENDPOINT
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!endpoint || !accessKeyId || !secretAccessKey) return null
  return new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId, secretAccessKey } })
}

export async function inquiryRoutes(server: FastifyInstance) {
  server.post(
    '/',
    { config: { rateLimit: { max: 5, timeWindow: '1 hour' } } },
    async (request, reply) => {
      let category = ''
      let name = ''
      let email = ''
      let message = ''
      let fileBuffer: Buffer | null = null
      let fileMime = ''
      let fileOriginalName = ''

      for await (const part of request.parts()) {
        if (part.type === 'file') {
          if (!ALLOWED_MIME_TYPES.includes(part.mimetype)) {
            for await (const _ of part.file) { /* drain */ }
            return badRequest(reply, 'File type not allowed. Please upload a PDF, DOCX, JPG, or PNG.')
          }
          const chunks: Buffer[] = []
          for await (const chunk of part.file) chunks.push(chunk as Buffer)
          fileBuffer = Buffer.concat(chunks)
          fileMime = part.mimetype
          fileOriginalName = part.filename ?? 'document'

          if (fileBuffer.length > 10 * 1024 * 1024) {
            return badRequest(reply, 'File exceeds the 10MB limit.')
          }
        } else {
          const val = part.value as string
          if (part.fieldname === 'category') category = val
          if (part.fieldname === 'name') name = val
          if (part.fieldname === 'email') email = val
          if (part.fieldname === 'message') message = val
        }
      }

      const parsed = fieldSchema.safeParse({ category, name, email, message })
      if (!parsed.success) {
        const first = parsed.error.issues[0]
        return badRequest(reply, first ? `${first.path.join('.')}: ${first.message}` : 'Invalid request.')
      }

      let fileUrl = ''
      if (fileBuffer) {
        const r2 = getR2Client()
        if (!r2) {
          return serverError(reply, 'File storage is not configured.')
        }
        const fileKey = `inquiries/${randomUUID()}/${fileOriginalName}`
        await r2.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: fileKey,
          Body: fileBuffer,
          ContentType: fileMime,
        }))
        fileUrl = process.env.R2_PUBLIC_URL
          ? `${process.env.R2_PUBLIC_URL}/${fileKey}`
          : `${process.env.R2_ENDPOINT}/${BUCKET}/${fileKey}`
      }

      const supportEmail = process.env.SUPPORT_EMAIL || 'support@oppdate.app'
      const categoryLabel = CATEGORY_LABELS[parsed.data.category] || parsed.data.category

      const fileLine = fileUrl
        ? `<p><strong>Attachment:</strong> <a href="${fileUrl}">${fileOriginalName}</a></p>`
        : ''

      await enqueueEmail({
        to: supportEmail,
        subject: `[Inquiry] ${categoryLabel} - ${parsed.data.name}`,
        html: [
          `<p><strong>Category:</strong> ${categoryLabel}</p>`,
          `<p><strong>Name:</strong> ${parsed.data.name}</p>`,
          `<p><strong>Email:</strong> ${parsed.data.email}</p>`,
          fileLine,
          `<hr/>`,
          `<p>${parsed.data.message.replace(/\n/g, '<br/>')}</p>`,
        ].join('\n'),
      })

      return created(reply, null, 'Your inquiry has been submitted. We will be in touch soon.')
    },
  )
}
