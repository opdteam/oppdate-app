/**
 * @oppdate/utils - Shared utilities used across web and api
 */

/** Sleep for n milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Check if a string is a valid email */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** Slugify a string (for URL-safe identifiers) */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Pick specified keys from an object */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  return keys.reduce((acc, key) => {
    if (key in obj) acc[key] = obj[key]
    return acc
  }, {} as Pick<T, K>)
}

/** Omit specified keys from an object */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj }
  keys.forEach((key) => delete result[key])
  return result as Omit<T, K>
}

/** Paginate an array */
export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
): { data: T[]; total: number; pages: number } {
  const total = items.length
  const pages = Math.ceil(total / pageSize)
  const data = items.slice((page - 1) * pageSize, page * pageSize)
  return { data, total, pages }
}
