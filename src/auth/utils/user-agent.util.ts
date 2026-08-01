export type ParsedUserAgent = {
  browser: string | null;
  operatingSystem: string | null;
};

export function parseUserAgent(
  userAgent: string | null | undefined,
): ParsedUserAgent {
  if (!userAgent?.trim()) {
    return { browser: null, operatingSystem: null };
  }

  return {
    browser: detectBrowser(userAgent),
    operatingSystem: detectOperatingSystem(userAgent),
  };
}

function detectBrowser(ua: string): string | null {
  if (/Edg\//i.test(ua)) {
    return 'Edge';
  }
  if (/OPR\/|Opera/i.test(ua)) {
    return 'Opera';
  }
  if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) {
    return 'Chrome';
  }
  if (/Chromium\//i.test(ua)) {
    return 'Chromium';
  }
  if (/Firefox\//i.test(ua)) {
    return 'Firefox';
  }
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    return 'Safari';
  }
  if (/MSIE |Trident\//i.test(ua)) {
    return 'Internet Explorer';
  }

  return null;
}

function detectOperatingSystem(ua: string): string | null {
  if (/Windows NT 10/i.test(ua)) {
    return 'Windows 10/11';
  }
  if (/Windows NT 6\.3/i.test(ua)) {
    return 'Windows 8.1';
  }
  if (/Windows NT 6\.2/i.test(ua)) {
    return 'Windows 8';
  }
  if (/Windows NT 6\.1/i.test(ua)) {
    return 'Windows 7';
  }
  if (/Windows/i.test(ua)) {
    return 'Windows';
  }
  if (/Android/i.test(ua)) {
    return 'Android';
  }
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return 'iOS';
  }
  if (/Mac OS X/i.test(ua)) {
    return 'macOS';
  }
  if (/Linux/i.test(ua)) {
    return 'Linux';
  }
  if (/CrOS/i.test(ua)) {
    return 'Chrome OS';
  }

  return null;
}
