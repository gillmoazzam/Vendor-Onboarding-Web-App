import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

const challengeLifetimeMs = 10 * 60 * 1000
const verificationLifetimeMs = 5 * 60 * 1000

type StoredChallenge = {
  answerDigest: Buffer
  expiresAt: number
}

export type CaptchaChallenge = {
  token: string
  prompt: string
  expiresAt: string
}

function requiredSecret(): string {
  const secret = process.env.APP_JWT_SECRET?.trim()
  if (!secret) throw new Error('APP_JWT_SECRET is required for the security challenge')
  return secret
}

function digest(value: string): Buffer {
  return createHmac('sha256', requiredSecret()).update(value).digest()
}

export class CaptchaService {
  private readonly challenges = new Map<string, StoredChallenge>()
  private readonly verifications = new Map<string, number>()

  createChallenge(): CaptchaChallenge {
    const now = Date.now()
    for (const [id, challenge] of this.challenges) {
      if (challenge.expiresAt <= now) this.challenges.delete(id)
    }
    for (const [id, expiresAt] of this.verifications) {
      if (expiresAt <= now) this.verifications.delete(id)
    }

    const left = randomInt(2, 13)
    const right = randomInt(2, 13)
    const id = randomBytes(16).toString('hex')
    const expiresAt = now + challengeLifetimeMs
    const signature = digest(`${id}.${expiresAt}`).toString('base64url')
    const token = `${id}.${expiresAt}.${signature}`
    this.challenges.set(id, { answerDigest: digest(`${id}.${left + right}`), expiresAt })

    return { token, prompt: `What is ${left} + ${right}?`, expiresAt: new Date(expiresAt).toISOString() }
  }

  verifyChallenge(token: string, answer: string): string | null {
    const [id, expiresAtText, signatureText, ...extra] = token.split('.')
    if (!id || !expiresAtText || !signatureText || extra.length > 0) return null

    const challenge = this.challenges.get(id)
    this.challenges.delete(id)
    if (!challenge || challenge.expiresAt <= Date.now() || challenge.expiresAt !== Number(expiresAtText)) return null

    const suppliedSignature = Buffer.from(signatureText, 'base64url')
    const expectedSignature = digest(`${id}.${expiresAtText}`)
    if (suppliedSignature.length !== expectedSignature.length || !timingSafeEqual(suppliedSignature, expectedSignature)) return null

    const suppliedAnswer = digest(`${id}.${answer.trim()}`)
    if (!timingSafeEqual(suppliedAnswer, challenge.answerDigest)) return null

    const verificationId = randomBytes(16).toString('hex')
    const verificationExpiresAt = Date.now() + verificationLifetimeMs
    const verificationSignature = digest(`${verificationId}.${verificationExpiresAt}.verified`).toString('base64url')
    this.verifications.set(verificationId, verificationExpiresAt)
    return `${verificationId}.${verificationExpiresAt}.${verificationSignature}`
  }

  consumeVerification(token: string): boolean {
    const [id, expiresAtText, signatureText, ...extra] = token.split('.')
    if (!id || !expiresAtText || !signatureText || extra.length > 0) return false

    const storedExpiry = this.verifications.get(id)
    this.verifications.delete(id)
    if (!storedExpiry || storedExpiry <= Date.now() || storedExpiry !== Number(expiresAtText)) return false

    const suppliedSignature = Buffer.from(signatureText, 'base64url')
    const expectedSignature = digest(`${id}.${expiresAtText}.verified`)
    return suppliedSignature.length === expectedSignature.length && timingSafeEqual(suppliedSignature, expectedSignature)
  }
}

export const captchaService = new CaptchaService()
