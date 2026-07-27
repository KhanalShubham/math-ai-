import { randomBytes, createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../../config';
import { AuthenticationError } from '../../errors';
import type { JwtAccessPayload } from './auth.types';

const DURATION_UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** Parses '15m' / '30d' style durations (same format already used by JWT_*_TTL env vars). */
export function parseDurationMs(duration: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Invalid duration format: "${duration}"`);
  }
  const amount = match[1] ?? '0';
  const unit = match[2] ?? 's';
  return Number(amount) * (DURATION_UNIT_MS[unit] ?? 0);
}

export function signAccessToken(payload: JwtAccessPayload): string {
  const options: jwt.SignOptions = {
    expiresIn: jwtConfig.accessTtl as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload, jwtConfig.accessSecret, options);
}

export function verifyAccessToken(token: string): JwtAccessPayload {
  try {
    return jwt.verify(token, jwtConfig.accessSecret) as unknown as JwtAccessPayload;
  } catch {
    throw new AuthenticationError('Invalid or expired access token');
  }
}

/** Opaque, high-entropy — not a JWT. Only its SHA-256 hash is ever persisted (ARCHITECTURE.md/DOMAIN_MODEL.md §2.14). */
export function generateOpaqueToken(): string {
  return randomBytes(48).toString('hex');
}

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

export function refreshTokenExpiryDate(): Date {
  return new Date(Date.now() + parseDurationMs(jwtConfig.refreshTtl));
}
