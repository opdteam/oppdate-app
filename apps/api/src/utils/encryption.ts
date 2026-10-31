import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16
const KEY_LENGTH = 32

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) throw new Error('ENCRYPTION_KEY environment variable is required')

  // Accept hex string or raw string
  if (key.length === 64) return Buffer.from(key, 'hex')
  if (key.length === KEY_LENGTH) return Buffer.from(key)

  throw new Error('ENCRYPTION_KEY must be 32 bytes (raw) or 64 hex characters')
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const tag = cipher.getAuthTag()

  // Format: iv:tag:ciphertext (all hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`
}

export function decrypt(ciphertext: string): string {
  const key = getKey()
  const [ivHex, tagHex, encrypted] = ciphertext.split(':')

  if (!ivHex || !tagHex || !encrypted) {
    throw new Error('Invalid ciphertext format')
  }

  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

// Convenience helpers for nullable fields
export function encryptIfPresent(value: string | null | undefined): string | null {
  if (!value) return null
  return encrypt(value)
}

export function decryptIfPresent(value: string | null | undefined): string | null {
  if (!value) return null
  return decrypt(value)
}
