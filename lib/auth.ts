// Ring API authentication — supports two modes:
// 1. Access token (RING_ACCESS_TOKEN or dynamic runtime token)
// 2. Refresh token (RING_REFRESH_TOKEN)

export type AuthMode = 'access_token' | 'refresh_token'

let cachedToken: { token: string; expiresAt: number } | null = null
let runtimeAccessToken: string | null = null

export function setRuntimeAccessToken(token: string) {
  runtimeAccessToken = token
}

export function getAuthMode(): AuthMode | null {
  if (runtimeAccessToken || process.env.RING_ACCESS_TOKEN) return 'access_token'
  if (process.env.RING_REFRESH_TOKEN) return 'refresh_token'
  return null
}

export async function getAccessToken(): Promise<string> {
  // Check runtime token first (entered from Playground UI)
  if (runtimeAccessToken) {
    return runtimeAccessToken
  }

  // Check env access token
  if (process.env.RING_ACCESS_TOKEN) {
    return process.env.RING_ACCESS_TOKEN
  }

  // Refresh token flow
  if (process.env.RING_REFRESH_TOKEN) {
    if (!process.env.RING_CLIENT_ID || !process.env.RING_CLIENT_SECRET) {
      throw new Error(
        'RING_CLIENT_ID and RING_CLIENT_SECRET are required when using RING_REFRESH_TOKEN'
      )
    }

    if (cachedToken && Date.now() < cachedToken.expiresAt) {
      return cachedToken.token
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: process.env.RING_REFRESH_TOKEN,
      client_id: process.env.RING_CLIENT_ID,
      client_secret: process.env.RING_CLIENT_SECRET,
    })

    const res = await fetch('https://oauth.ring.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Token refresh failed: ${res.status} - ${err}`)
    }

    const data = await res.json()
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    }
    return cachedToken.token
  }

  throw new Error(
    'No Ring credentials found. Paste a token from the Ring Developer Playground in the header bar or set RING_ACCESS_TOKEN.'
  )
}
