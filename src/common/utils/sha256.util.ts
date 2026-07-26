import { createHash, timingSafeEqual } from 'crypto';

export function hashSha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

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
