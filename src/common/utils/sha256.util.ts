import { createHash, timingSafeEqual } from 'crypto';

/**
 * SHA-256 digest for opaque tokens / JWTs.
 * Prefer this over bcrypt for values that may exceed bcrypt's 72-byte limit.
 */
export function hashSha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * Constant-time comparison of a raw value against a stored SHA-256 hex digest.
 */
export function compareSha256(value: string, expectedHexHash: string): boolean {
  const actualHex = hashSha256(value);

  try {
    const actual = Buffer.from(actualHex, 'hex');
    const expected = Buffer.from(expectedHexHash, 'hex');

    if (actual.length !== expected.length) {
      return false;
    }

    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
