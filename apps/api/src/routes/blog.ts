import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { db, schema } from '../db'
import { eq, and, desc, sql, ilike, or, inArray } from 'drizzle-orm'
import { ok, created, badRequest, notFound, paginated } from '../utils/response'
import { requireRole } from '../middleware/auth'

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'oppdate'
const COVER_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const COVER_MAX_BYTES = 5 * 1024 * 1024

function getR2Client(): S3Client | null {
  const endpoint = process.env.R2_ENDPOINT
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!endpoint || !accessKeyId || !secretAccessKey) return null
  return new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId, secretAccessKey } })
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 300)
}

function computeReadingTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  const words = text.split(' ').filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

export async function blogRoutes(server: FastifyInstance) {

  // ─── PUBLIC ──────────────────────────────────────────────────────────────────

  // GET / -- list published posts (paginated, filter by category slug & tag)
  server.get('/', async (request, reply) => {
    const query = request.query as Record<string, string>
    const page = Math.max(Number(query.page) || 1, 1)
    const limit = Math.min(Number(query.limit) || 12, 50)
    const offset = (page - 1) * limit
    const categorySlug = query.category
    const tag = query.tag
    const search = query.search

    const conditions = [eq(schema.blogPosts.status, 'published')]

    if (categorySlug) {
      const [cat] = await db
        .select({ id: schema.blogCategories.id })
        .from(schema.blogCategories)
        .where(eq(schema.blogCategories.slug, categorySlug))
        .limit(1)
      if (cat) conditions.push(eq(schema.blogPosts.categoryId, cat.id))
    }

    if (tag) {
      conditions.push(sql`${schema.blogPosts.tags}::jsonb ? ${tag}`)
    }

    if (search) {
      conditions.push(
        or(
          ilike(schema.blogPosts.title, `%${search}%`),
          ilike(schema.blogPosts.excerpt, `%${search}%`),
        )!
      )
    }

    const where = and(...conditions)

    const rows = await db
      .select({
        id: schema.blogPosts.id,
        title: schema.blogPosts.title,
        slug: schema.blogPosts.slug,
        excerpt: schema.blogPosts.excerpt,
        coverImageUrl: schema.blogPosts.coverImageUrl,
        tags: schema.blogPosts.tags,
        readingTimeMinutes: schema.blogPosts.readingTimeMinutes,
        viewCount: schema.blogPosts.viewCount,
        publishedAt: schema.blogPosts.publishedAt,
        categoryName: schema.blogCategories.name,
        categorySlug: schema.blogCategories.slug,
        authorName: schema.users.name,
      })
      .from(schema.blogPosts)
      .leftJoin(schema.blogCategories, eq(schema.blogPosts.categoryId, schema.blogCategories.id))
      .leftJoin(schema.users, eq(schema.blogPosts.authorId, schema.users.id))
      .where(where)
      .orderBy(desc(schema.blogPosts.publishedAt))
      .limit(limit)
      .offset(offset)

    const [total] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.blogPosts)
      .where(where)

    return paginated(reply, rows, total?.count || 0, page, limit)
  })

  // GET /categories -- list categories with post count
  server.get('/categories', async (_request, reply) => {
    const rows = await db
      .select({
        id: schema.blogCategories.id,
        name: schema.blogCategories.name,
        slug: schema.blogCategories.slug,
        description: schema.blogCategories.description,
        sortOrder: schema.blogCategories.sortOrder,
        postCount: sql<number>`count(${schema.blogPosts.id})::int`,
      })
      .from(schema.blogCategories)
      .leftJoin(
        schema.blogPosts,
        and(
          eq(schema.blogPosts.categoryId, schema.blogCategories.id),
          eq(schema.blogPosts.status, 'published')
        )
      )
      .groupBy(schema.blogCategories.id)
      .orderBy(schema.blogCategories.sortOrder)

    return ok(reply, rows)
  })

  // GET /:slug -- single post (full content, increment viewCount, related posts)
  server.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }

    const [post] = await db
      .select({
        id: schema.blogPosts.id,
        title: schema.blogPosts.title,
        slug: schema.blogPosts.slug,
        excerpt: schema.blogPosts.excerpt,
        content: schema.blogPosts.content,
        coverImageUrl: schema.blogPosts.coverImageUrl,
        tags: schema.blogPosts.tags,
        readingTimeMinutes: schema.blogPosts.readingTimeMinutes,
        viewCount: schema.blogPosts.viewCount,
        metaTitle: schema.blogPosts.metaTitle,
        metaDescription: schema.blogPosts.metaDescription,
        publishedAt: schema.blogPosts.publishedAt,
        categoryId: schema.blogPosts.categoryId,
        categoryName: schema.blogCategories.name,
        categorySlug: schema.blogCategories.slug,
        authorName: schema.users.name,
        authorAvatarUrl: schema.users.avatarUrl,
      })
      .from(schema.blogPosts)
      .leftJoin(schema.blogCategories, eq(schema.blogPosts.categoryId, schema.blogCategories.id))
      .leftJoin(schema.users, eq(schema.blogPosts.authorId, schema.users.id))
      .where(and(eq(schema.blogPosts.slug, slug), eq(schema.blogPosts.status, 'published')))
      .limit(1)

    if (!post) return notFound(reply, 'Post')

    // Increment view count (fire-and-forget)
    db.update(schema.blogPosts)
      .set({ viewCount: sql`${schema.blogPosts.viewCount} + 1` })
      .where(eq(schema.blogPosts.id, post.id))
      .then(() => {})
      .catch(() => {})

    // Related posts: same category, excluding current, limit 3
    const relatedConditions = [
      eq(schema.blogPosts.status, 'published'),
      sql`${schema.blogPosts.id} != ${post.id}`,
    ]
    if (post.categoryId) {
      relatedConditions.push(eq(schema.blogPosts.categoryId, post.categoryId))
    }

    const related = await db
      .select({
        id: schema.blogPosts.id,
        title: schema.blogPosts.title,
        slug: schema.blogPosts.slug,
        excerpt: schema.blogPosts.excerpt,
        coverImageUrl: schema.blogPosts.coverImageUrl,
        readingTimeMinutes: schema.blogPosts.readingTimeMinutes,
        publishedAt: schema.blogPosts.publishedAt,
        categoryName: schema.blogCategories.name,
        categorySlug: schema.blogCategories.slug,
      })
      .from(schema.blogPosts)
      .leftJoin(schema.blogCategories, eq(schema.blogPosts.categoryId, schema.blogCategories.id))
      .where(and(...relatedConditions))
      .orderBy(desc(schema.blogPosts.publishedAt))
      .limit(3)

    return ok(reply, { ...post, related })
  })

  // ─── ADMIN ───────────────────────────────────────────────────────────────────

  // GET /admin/all -- all posts (any status), paginated, filterable
  server.get('/admin/all', { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] }, async (request, reply) => {
    const query = request.query as Record<string, string>
    const page = Math.max(Number(query.page) || 1, 1)
    const limit = Math.min(Number(query.limit) || 20, 100)
    const offset = (page - 1) * limit
    const status = query.status as 'draft' | 'published' | 'archived' | undefined
    const search = query.search

    const conditions: ReturnType<typeof eq>[] = []
    if (status) conditions.push(eq(schema.blogPosts.status, status))
    if (search) {
      conditions.push(
        or(
          ilike(schema.blogPosts.title, `%${search}%`),
          ilike(schema.blogPosts.excerpt, `%${search}%`),
        )!
      )
    }

    const where = conditions.length ? and(...conditions) : undefined

    const rows = await db
      .select({
        id: schema.blogPosts.id,
        title: schema.blogPosts.title,
        slug: schema.blogPosts.slug,
        status: schema.blogPosts.status,
        excerpt: schema.blogPosts.excerpt,
        coverImageUrl: schema.blogPosts.coverImageUrl,
        tags: schema.blogPosts.tags,
        readingTimeMinutes: schema.blogPosts.readingTimeMinutes,
        viewCount: schema.blogPosts.viewCount,
        publishedAt: schema.blogPosts.publishedAt,
        createdAt: schema.blogPosts.createdAt,
        categoryName: schema.blogCategories.name,
        categorySlug: schema.blogCategories.slug,
        authorName: schema.users.name,
      })
      .from(schema.blogPosts)
      .leftJoin(schema.blogCategories, eq(schema.blogPosts.categoryId, schema.blogCategories.id))
      .leftJoin(schema.users, eq(schema.blogPosts.authorId, schema.users.id))
      .where(where)
      .orderBy(desc(schema.blogPosts.createdAt))
      .limit(limit)
      .offset(offset)

    const [total] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.blogPosts)
      .where(where)

    return paginated(reply, rows, total?.count || 0, page, limit)
  })

  // POST /admin -- create post
  server.post('/admin', { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] }, async (request, reply) => {
    const body = z.object({
      title: z.string().min(1).max(300),
      excerpt: z.string().max(1000).optional(),
      content: z.string().optional(),
      coverImageUrl: z.string().optional(),
      categoryId: z.string().uuid().optional(),
      tags: z.array(z.string()).optional(),
      metaTitle: z.string().max(200).optional(),
      metaDescription: z.string().max(500).optional(),
      status: z.enum(['draft', 'published', 'archived']).optional(),
    }).safeParse(request.body)

    if (!body.success) return badRequest(reply, body.error.errors[0].message)

    const { title, excerpt, content, coverImageUrl, categoryId, tags, metaTitle, metaDescription, status } = body.data
    const user = (request as any).user

    let slug = slugify(title)
    // Ensure slug uniqueness
    const [existing] = await db
      .select({ id: schema.blogPosts.id })
      .from(schema.blogPosts)
      .where(eq(schema.blogPosts.slug, slug))
      .limit(1)
    if (existing) slug = `${slug}-${randomUUID().slice(0, 6)}`

    const readingTime = content ? computeReadingTime(content) : 1
    const isPublishing = status === 'published'

    const [post] = await db.insert(schema.blogPosts).values({
      title,
      slug,
      status: status || 'draft',
      excerpt: excerpt || null,
      content: content || null,
      coverImageUrl: coverImageUrl || null,
      categoryId: categoryId || null,
      tags: tags || [],
      authorId: user.id,
      readingTimeMinutes: readingTime,
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
      publishedAt: isPublishing ? new Date() : null,
    }).returning()

    return created(reply, post, 'Post created.')
  })

  // PATCH /admin/:id -- update post
  server.patch('/admin/:id', { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const body = z.object({
      title: z.string().min(1).max(300).optional(),
      excerpt: z.string().max(1000).optional().nullable(),
      content: z.string().optional().nullable(),
      coverImageUrl: z.string().optional().nullable(),
      categoryId: z.string().uuid().optional().nullable(),
      tags: z.array(z.string()).optional(),
      metaTitle: z.string().max(200).optional().nullable(),
      metaDescription: z.string().max(500).optional().nullable(),
      status: z.enum(['draft', 'published', 'archived']).optional(),
    }).safeParse(request.body)

    if (!body.success) return badRequest(reply, body.error.errors[0].message)

    const [existing] = await db
      .select()
      .from(schema.blogPosts)
      .where(eq(schema.blogPosts.id, id))
      .limit(1)
    if (!existing) return notFound(reply, 'Post')

    const updates: Record<string, unknown> = { updatedAt: new Date() }

    if (body.data.title !== undefined) {
      updates.title = body.data.title
      // Re-slug only if title changed and post is still draft
      if (existing.status === 'draft') {
        let newSlug = slugify(body.data.title)
        const [dup] = await db
          .select({ id: schema.blogPosts.id })
          .from(schema.blogPosts)
          .where(and(eq(schema.blogPosts.slug, newSlug), sql`${schema.blogPosts.id} != ${id}`))
          .limit(1)
        if (dup) newSlug = `${newSlug}-${randomUUID().slice(0, 6)}`
        updates.slug = newSlug
      }
    }
    if (body.data.excerpt !== undefined) updates.excerpt = body.data.excerpt
    if (body.data.content !== undefined) {
      updates.content = body.data.content
      if (body.data.content) updates.readingTimeMinutes = computeReadingTime(body.data.content)
    }
    if (body.data.coverImageUrl !== undefined) updates.coverImageUrl = body.data.coverImageUrl
    if (body.data.categoryId !== undefined) updates.categoryId = body.data.categoryId
    if (body.data.tags !== undefined) updates.tags = body.data.tags
    if (body.data.metaTitle !== undefined) updates.metaTitle = body.data.metaTitle
    if (body.data.metaDescription !== undefined) updates.metaDescription = body.data.metaDescription

    if (body.data.status !== undefined) {
      updates.status = body.data.status
      // Set publishedAt on first publish
      if (body.data.status === 'published' && !existing.publishedAt) {
        updates.publishedAt = new Date()
      }
    }

    const [updated] = await db
      .update(schema.blogPosts)
      .set(updates)
      .where(eq(schema.blogPosts.id, id))
      .returning()

    return ok(reply, updated, 'Post updated.')
  })

  // DELETE /admin/:id -- delete post (super_admin only)
  server.delete('/admin/:id', { preHandler: [requireRole('super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const [existing] = await db
      .select({ id: schema.blogPosts.id })
      .from(schema.blogPosts)
      .where(eq(schema.blogPosts.id, id))
      .limit(1)
    if (!existing) return notFound(reply, 'Post')

    await db.delete(schema.blogPosts).where(eq(schema.blogPosts.id, id))
    return ok(reply, null, 'Post deleted.')
  })

  // POST /admin/upload-cover -- upload cover image to R2
  server.post('/admin/upload-cover', { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] }, async (request, reply) => {
    const data = await request.file()
    if (!data) return badRequest(reply, 'No file provided.')

    if (!COVER_ALLOWED_TYPES.includes(data.mimetype)) {
      return badRequest(reply, 'Only JPEG, PNG, or WebP allowed.')
    }

    const chunks: Buffer[] = []
    for await (const chunk of data.file) chunks.push(chunk)
    const buffer = Buffer.concat(chunks)

    if (buffer.length > COVER_MAX_BYTES) return badRequest(reply, 'Image exceeds 5MB limit.')

    const r2 = getR2Client()
    if (!r2) return badRequest(reply, 'File storage is not configured.')

    const ext = data.mimetype === 'image/png' ? 'png' : data.mimetype === 'image/webp' ? 'webp' : 'jpg'
    const fileKey = `blog-covers/${randomUUID()}.${ext}`

    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: fileKey,
      Body: buffer,
      ContentType: data.mimetype,
      ContentLength: buffer.length,
    }))

    const url = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL}/${fileKey}`
      : `${process.env.R2_ENDPOINT}/${R2_BUCKET}/${fileKey}`

    return ok(reply, { url }, 'Cover uploaded.')
  })

  // ─── CATEGORIES (ADMIN) ──────────────────────────────────────────────────────

  // GET /admin/categories -- all categories
  server.get('/admin/categories', { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] }, async (_request, reply) => {
    const rows = await db
      .select()
      .from(schema.blogCategories)
      .orderBy(schema.blogCategories.sortOrder)
    return ok(reply, rows)
  })

  // POST /admin/categories -- create category
  server.post('/admin/categories', { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] }, async (request, reply) => {
    const body = z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      sortOrder: z.number().int().optional(),
    }).safeParse(request.body)

    if (!body.success) return badRequest(reply, body.error.errors[0].message)

    const slug = slugify(body.data.name)
    const [existing] = await db
      .select({ id: schema.blogCategories.id })
      .from(schema.blogCategories)
      .where(eq(schema.blogCategories.slug, slug))
      .limit(1)
    if (existing) return badRequest(reply, 'A category with this name already exists.')

    const [cat] = await db.insert(schema.blogCategories).values({
      name: body.data.name,
      slug,
      description: body.data.description || null,
      sortOrder: body.data.sortOrder ?? 0,
    }).returning()

    return created(reply, cat, 'Category created.')
  })

  // PATCH /admin/categories/:id -- update category
  server.patch('/admin/categories/:id', { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional().nullable(),
      sortOrder: z.number().int().optional(),
    }).safeParse(request.body)

    if (!body.success) return badRequest(reply, body.error.errors[0].message)

    const [existing] = await db
      .select()
      .from(schema.blogCategories)
      .where(eq(schema.blogCategories.id, id))
      .limit(1)
    if (!existing) return notFound(reply, 'Category')

    const updates: Record<string, unknown> = {}
    if (body.data.name !== undefined) {
      updates.name = body.data.name
      updates.slug = slugify(body.data.name)
    }
    if (body.data.description !== undefined) updates.description = body.data.description
    if (body.data.sortOrder !== undefined) updates.sortOrder = body.data.sortOrder

    const [updated] = await db
      .update(schema.blogCategories)
      .set(updates)
      .where(eq(schema.blogCategories.id, id))
      .returning()

    return ok(reply, updated, 'Category updated.')
  })

  // DELETE /admin/categories/:id -- delete category
  server.delete('/admin/categories/:id', { preHandler: [requireRole('super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const [existing] = await db
      .select({ id: schema.blogCategories.id })
      .from(schema.blogCategories)
      .where(eq(schema.blogCategories.id, id))
      .limit(1)
    if (!existing) return notFound(reply, 'Category')

    await db.delete(schema.blogCategories).where(eq(schema.blogCategories.id, id))
    return ok(reply, null, 'Category deleted.')
  })
}
