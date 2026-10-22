import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/auth'
import { fetchWithSystemCA } from '@/lib/fetch-helper'

const API_BASE = 'https://api.amazonvision.com'

export async function POST(request: NextRequest) {
  try {
    const { sdpOffer, deviceId } = await request.json()

    if (!sdpOffer) {
      return NextResponse.json({ error: 'Missing sdpOffer' }, { status: 400 })
    }

    const token = await getAccessToken()

    // If no device ID was provided, discover device first
    let resolvedDeviceId = deviceId
    if (!resolvedDeviceId) {
      const devRes = await fetchWithSystemCA(`${API_BASE}/v1/devices`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (devRes.ok) {
        const devData = await devRes.json()
        if (devData.data && devData.data.length > 0) {
          resolvedDeviceId = devData.data[0].id
        }
      }
    }

    if (!resolvedDeviceId) {
      return NextResponse.json(
        { error: 'No Ring device discovered on this account.' },
        { status: 400 }
      )
    }

    const whepUrl = `${API_BASE}/v1/devices/${resolvedDeviceId}/media/streaming/whep/sessions`

    const response = await fetchWithSystemCA(whepUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/sdp',
      },
      body: sdpOffer,
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: `WHEP failed: ${response.status} - ${error}` },
        { status: response.status }
      )
    }

    const sdpAnswer = await response.text()
    const sessionUrl = response.headers.get('Location')

    return NextResponse.json({ sdpAnswer, sessionUrl })
  } catch (error) {
    console.error('Stream error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Stream failed' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { sessionUrl } = await request.json()
    if (!sessionUrl) {
      return NextResponse.json({ error: 'Missing sessionUrl' }, { status: 400 })
    }

    const token = await getAccessToken()
    await fetchWithSystemCA(sessionUrl, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Teardown failed' },
      { status: 500 }
    )
  }
}
