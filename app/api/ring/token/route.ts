import { NextRequest, NextResponse } from 'next/server'
import { setRuntimeAccessToken } from '@/lib/auth'
import { fetchWithSystemCA } from '@/lib/fetch-helper'

const API_BASE = 'https://api.amazonvision.com'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.token || typeof body.token !== 'string') {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const testToken = body.token.trim()

    // Call Ring devices endpoint to verify token
    const res = await fetchWithSystemCA(`${API_BASE}/v1/devices`, {
      headers: { Authorization: `Bearer ${testToken}` },
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json(
        { 
          error: `Ring cloud rejected token: ${res.status} - ${errText}`,
          statusCode: res.status 
        },
        { status: 401 }
      )
    }

    const json = await res.json()
    const devicesList = json?.data || []

    // Store in runtime auth
    setRuntimeAccessToken(testToken)

    const mappedDevices = Array.isArray(devicesList)
      ? devicesList.map((d: any) => ({
          id: d.id,
          name: d.attributes?.name || 'Playground Device',
          type: d.type
        }))
      : []

    return NextResponse.json({ 
      success: true, 
      deviceCount: mappedDevices.length,
      devices: mappedDevices,
      message: 'Token authenticated and accepted by Ring cloud' 
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Connection to Ring API failed' },
      { status: 500 }
    )
  }
}
