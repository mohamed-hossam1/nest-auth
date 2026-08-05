export function getClientIp(
  forwardedFor: string | string[] | undefined,
  fallbackIp: string | undefined,
): string | null {
  const value = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const firstIp = value?.split(',', 1)[0]?.trim();

  return firstIp || fallbackIp || null;
}
