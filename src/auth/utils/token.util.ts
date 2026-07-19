import { randomBytes } from 'crypto';

export function generateRandomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function formatToken(id: string, secret: string): string {
  return `${id}.${secret}`;
}

export function parseToken(
  token: string,
): { id: string; secret: string } | null {
  const separator = token.indexOf('.');
  if (separator <= 0 || separator === token.length - 1) {
    return null;
  }

  return {
    id: token.slice(0, separator),
    secret: token.slice(separator + 1),
  };
}
