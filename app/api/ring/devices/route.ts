import { NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/auth'
import { fetchWithSystemCA } from '@/lib/fetch-helper'

const API_BASE = 'https://api.amazonvision.com'

export async function GET() {
  try {
    const token = await getAccessToken()

    const res = await fetchWithSystemCA(`${API_BASE}/v1/devices`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      const error = await res.text()
      return NextResponse.json(
        { devices: [], error: `Device discovery failed: ${res.status} - ${error}` },
        { status: res.status }
      )
    }

    const json = await res.json()
    const devicesList = json?.data || []

    const devices = Array.isArray(devicesList)
      ? devicesList.map((d: any) => ({
          id: d.id,
          name: d.attributes?.name || 'Playground Device',
          online: true,
          capabilities: { motionDetection: true },
        }))
      : []

    return NextResponse.json({ devices })
  } catch (error) {
    return NextResponse.json(
      { devices: [], error: error instanceof Error ? error.message : 'Discovery failed' },
      { status: 500 }
    )
  }
}
