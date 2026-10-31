import crypto from 'crypto'

const PAYSTACK_BASE = 'https://api.paystack.co'

function getSecretKey(): string {
  return process.env.PAYSTACK_SECRET_KEY || ''
}

async function paystackRequest(method: string, path: string, body?: unknown) {
  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
    },
  }
  if (body) options.body = JSON.stringify(body)

  const res = await fetch(`${PAYSTACK_BASE}${path}`, options)
  const data = (await res.json()) as { status: boolean; message?: string; data: any }

  if (!data.status) {
    throw new Error(data.message || 'Paystack API error')
  }
  return data.data
}

export async function initializeTransaction(params: {
  email: string
  amount: number // in kobo (NGN smallest unit) or cents depending on currency
  currency: string
  reference: string
  callbackUrl: string
  metadata: Record<string, unknown>
}): Promise<{ authorization_url: string; access_code: string; reference: string }> {
  return paystackRequest('POST', '/transaction/initialize', {
    email: params.email,
    amount: params.amount,
    currency: params.currency,
    reference: params.reference,
    callback_url: params.callbackUrl,
    metadata: params.metadata,
  })
}

export async function verifyTransaction(reference: string): Promise<{
  status: string
  amount: number
  currency: string
  reference: string
  metadata: Record<string, unknown>
}> {
  return paystackRequest('GET', `/transaction/verify/${encodeURIComponent(reference)}`)
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('sha512', getSecretKey())
    .update(body)
    .digest('hex')
  return hash === signature
}
