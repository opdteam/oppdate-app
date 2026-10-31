import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Readable } from 'stream'
import { db, schema } from '../db'
import { eq, and } from 'drizzle-orm'
import { ok, created, notFound, badRequest, serverError } from '../utils/response'
import { requireAuth } from '../middleware/auth'
import { randomUUID } from 'crypto'
import { broadcastToUser } from './messaging'

function getR2Client(): S3Client | null {
  const endpoint = process.env.R2_ENDPOINT
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!endpoint || !accessKeyId || !secretAccessKey) return null
  return new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId, secretAccessKey } })
}

const BUCKET = process.env.R2_BUCKET_NAME || 'oppdate'
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]

const documentTypeSchema = z.enum([
  'cv', 'transcript', 'certificate', 'portfolio',
  'reference_letter', 'personal_statement', 'passport_photo', 'other',
])

function fileUrlToKey(fileUrl: string): string {
  const r2PublicUrl = process.env.R2_PUBLIC_URL || ''
  const endpoint = process.env.R2_ENDPOINT || ''
  return fileUrl
    .replace(`${r2PublicUrl}/`, '')
    .replace(`${endpoint}/${BUCKET}/`, '')
}

export async function documentRoutes(server: FastifyInstance) {
  // GET /api/v1/documents -list user's documents
  server.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const payload = request.user as { id: string }

    const documents = await db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.userId, payload.id))

    return ok(reply, documents)
  })

  // POST /api/v1/documents -upload a new document
  server.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const payload = request.user as { id: string }

    let fileBuffer: Buffer | null = null
    let fileMime = ''
    let fileOriginalName = ''
    let docTypeRaw = ''
    let docNameRaw = ''

    // Use parts() iterator so fields and file can arrive in any order
    for await (const part of request.parts()) {
      if (part.type === 'file') {
        if (!ALLOWED_MIME_TYPES.includes(part.mimetype)) {
          // drain the stream before returning
          for await (const _ of part.file) { /* noop */ }
          return badRequest(reply, 'Unsupported file type. Please upload a PDF, Word document, or image file.')
        }
        const chunks: Buffer[] = []
        for await (const chunk of part.file) chunks.push(chunk as Buffer)
        fileBuffer = Buffer.concat(chunks)
        fileMime = part.mimetype
        fileOriginalName = part.filename ?? 'document'
      } else {
        if (part.fieldname === 'type') docTypeRaw = part.value as string
        if (part.fieldname === 'name') docNameRaw = part.value as string
      }
    }

    if (!fileBuffer) return badRequest(reply, 'No file provided.')

    if (fileBuffer.length > 10 * 1024 * 1024) {
      return badRequest(reply, 'File exceeds the 10MB limit. Please compress the file and try again.')
    }

    const documentType = documentTypeSchema.safeParse(docTypeRaw)
    if (!documentType.success) {
      return badRequest(reply, 'Invalid document type. Must be one of: cv, transcript, certificate, portfolio, reference_letter, personal_statement, passport_photo, other.')
    }

    const documentName = (docNameRaw.trim() || fileOriginalName).substring(0, 255)

    const fileKey = `documents/${payload.id}/${randomUUID()}-${fileOriginalName}`
    const r2 = getR2Client()
    if (!r2) return badRequest(reply, 'File storage is not configured. Contact support.')

    await r2.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: fileKey,
      Body: fileBuffer,
      ContentType: fileMime,
      ContentLength: fileBuffer.length,
    }))

    const fileUrl = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL}/${fileKey}`
      : `${process.env.R2_ENDPOINT}/${BUCKET}/${fileKey}`

    const [document] = await db
      .insert(schema.documents)
      .values({
        userId: payload.id,
        name: documentName,
        type: documentType.data,
        fileUrl,
        fileSize: fileBuffer.length,
        mimeType: fileMime,
        version: 1,
      })
      .returning()

    // If a document request item is linked, mark it uploaded and broadcast
    const requestItemId = (request.query as any).requestItemId as string | undefined
    if (requestItemId) {
      const [updatedItem] = await db
        .update(schema.documentRequestItems)
        .set({ status: 'uploaded', documentId: document.id, updatedAt: new Date() })
        .where(eq(schema.documentRequestItems.id, requestItemId))
        .returning()

      if (updatedItem) {
        // Find the thread for this request item so we can broadcast
        const [docRequest] = await db
          .select({ threadId: schema.documentRequests.threadId })
          .from(schema.documentRequests)
          .where(eq(schema.documentRequests.id, updatedItem.requestId))
          .limit(1)

        if (docRequest) {
          broadcastToUser(payload.id, {
            type: 'document_uploaded',
            threadId: docRequest.threadId,
            documentId: document.id,
            itemId: requestItemId,
            status: 'uploaded',
          })
        }
      }
    }

    return created(reply, document, 'Document uploaded successfully.')
  })

  // POST /api/v1/documents/:id/replace -upload a new version of an existing document
  server.post('/:id/replace', { preHandler: [requireAuth] }, async (request, reply) => {
    const payload = request.user as { id: string }
    const { id } = request.params as { id: string }

    const [existing] = await db
      .select()
      .from(schema.documents)
      .where(and(eq(schema.documents.id, id), eq(schema.documents.userId, payload.id)))
      .limit(1)

    if (!existing) return notFound(reply, 'Document')

    const data = await request.file()
    if (!data) return badRequest(reply, 'No file provided.')

    if (!ALLOWED_MIME_TYPES.includes(data.mimetype)) {
      return badRequest(reply, 'Unsupported file type. Please upload a PDF, Word document, or image file.')
    }

    const chunks: Buffer[] = []
    for await (const chunk of data.file) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)
    const fileSize = buffer.length

    if (fileSize > 10 * 1024 * 1024) {
      return badRequest(reply, 'File exceeds the 10MB limit. Please compress the file and try again.')
    }

    const fileKey = `documents/${payload.id}/${randomUUID()}-${data.filename}`
    const r2 = getR2Client()
    if (!r2) return badRequest(reply, 'File storage is not configured. Contact support.')

    await r2.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: fileKey,
      Body: buffer,
      ContentType: data.mimetype,
      ContentLength: fileSize,
    }))

    const fileUrl = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL}/${fileKey}`
      : `${process.env.R2_ENDPOINT}/${BUCKET}/${fileKey}`

    // Insert new version record, link back to previous, carry over timesReused
    const [newDoc] = await db
      .insert(schema.documents)
      .values({
        userId: payload.id,
        name: existing.name,
        type: existing.type,
        fileUrl,
        fileSize,
        mimeType: data.mimetype,
        version: existing.version + 1,
        previousVersionId: existing.id,
        timesReused: existing.timesReused,
        tags: existing.tags,
      })
      .returning()

    return ok(reply, newDoc, 'Document replaced with new version.')
  })

  // DELETE /api/v1/documents/:id -remove from library (soft delete - R2 file retained for active applications)
  server.delete('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const payload = request.user as { id: string }
    const { id } = request.params as { id: string }

    const [existing] = await db
      .select({ id: schema.documents.id, userId: schema.documents.userId })
      .from(schema.documents)
      .where(and(eq(schema.documents.id, id), eq(schema.documents.userId, payload.id)))
      .limit(1)

    if (!existing) return notFound(reply, 'Document')

    // Detach from any application document slots before deleting to avoid FK violation
    await db
      .update(schema.applicationDocuments)
      .set({ documentId: null })
      .where(eq(schema.applicationDocuments.documentId, id))

    await db.delete(schema.documents).where(eq(schema.documents.id, id))

    return ok(reply, null, 'Document deleted.')
  })

  // GET /api/v1/documents/:id/download -stream file directly to client
  server.get('/:id/download', { preHandler: [requireAuth] }, async (request, reply) => {
    const payload = request.user as { id: string }
    const { id } = request.params as { id: string }

    const [document] = await db
      .select()
      .from(schema.documents)
      .where(and(eq(schema.documents.id, id), eq(schema.documents.userId, payload.id)))
      .limit(1)

    if (!document) return notFound(reply, 'Document')

    const fileKey = fileUrlToKey(document.fileUrl)
    const r2 = getR2Client()
    if (!r2) return serverError(reply, 'File storage is not configured. Contact support.')

    const s3Response = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: fileKey }))

    const contentType = s3Response.ContentType || document.mimeType || 'application/octet-stream'
    const filename = encodeURIComponent(document.name)

    reply
      .header('Content-Type', contentType)
      .header('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${filename}`)
      .header('Cache-Control', 'private, no-store')

    if (s3Response.ContentLength) {
      reply.header('Content-Length', String(s3Response.ContentLength))
    }

    return reply.send(Readable.from(s3Response.Body as AsyncIterable<Uint8Array>))
  })
}
