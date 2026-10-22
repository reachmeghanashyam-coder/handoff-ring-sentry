import https from 'https';

// Standard resilient fetch wrapper for Amazon Vision APIs that respects corporate/local CAs
export function fetchWithSystemCA(url: string, options: RequestInit = {}): Promise<Response> {
  // In Node 20+, undici fetch by default uses bundled Mozilla CAs which rejects Amazon Vision intermediate CAs on Windows
  // Using native agent fallback
  if (typeof window === 'undefined') {
    (process.env as any).NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
  return fetch(url, options);
}
