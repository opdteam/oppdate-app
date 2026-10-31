import { FastifyReply } from 'fastify'

export const ok = <T>(reply: FastifyReply, data: T, message?: string) =>
  reply.status(200).send({ success: true, data, ...(message && { message }) })

export const created = <T>(reply: FastifyReply, data: T, message?: string) =>
  reply.status(201).send({ success: true, data, ...(message && { message }) })

export const noContent = (reply: FastifyReply) =>
  reply.status(204).send()

export const badRequest = (reply: FastifyReply, error: string, code = 'BAD_REQUEST') =>
  reply.status(400).send({ success: false, error, code, statusCode: 400 })

export const unauthorised = (reply: FastifyReply, error = 'Unauthorised') =>
  reply.status(401).send({ success: false, error, code: 'UNAUTHORISED', statusCode: 401 })

export const forbidden = (reply: FastifyReply, error = 'Forbidden') =>
  reply.status(403).send({ success: false, error, code: 'FORBIDDEN', statusCode: 403 })

export const notFound = (reply: FastifyReply, resource = 'Resource') =>
  reply.status(404).send({
    success: false,
    error: `${resource} not found.`,
    code: 'NOT_FOUND',
    statusCode: 404,
  })

export const conflict = (reply: FastifyReply, error: string) =>
  reply.status(409).send({ success: false, error, code: 'CONFLICT', statusCode: 409 })

export const serverError = (reply: FastifyReply, error = 'An unexpected error occurred.') =>
  reply.status(500).send({ success: false, error, code: 'SERVER_ERROR', statusCode: 500 })

export const paginated = <T>(
  reply: FastifyReply,
  data: T[],
  total: number,
  page: number,
  limit: number
) =>
  reply.status(200).send({
    success: true,
    data,
    total,
    page,
    limit,
    hasMore: page * limit < total,
  })
