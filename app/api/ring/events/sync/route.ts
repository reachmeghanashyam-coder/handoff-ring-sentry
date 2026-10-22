import { NextRequest, NextResponse } from 'next/server';
import { ticketStore } from '@/lib/ticket-store';
import { getAccessToken } from '@/lib/auth';
import { fetchWithSystemCA } from '@/lib/fetch-helper';

const API_BASE = 'https://api.amazonvision.com';

// Track already-ingested Ring event IDs in memory to strictly prevent duplicate tickets
const ingestedRingEventIds = new Set<string>();

export async function POST(req: NextRequest) {
  try {
    let token: string;
    try {
      token = await getAccessToken();
    } catch {
      return NextResponse.json(
        { error: 'No active Ring Playground token found. Please connect your token in the header bar.', code: 'UNAUTHORIZED_NO_TOKEN' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    let deviceId = body.deviceId || process.env.NEXT_PUBLIC_RING_DEVICE_ID;

    // Auto-discover device if none provided
    if (!deviceId) {
      const devRes = await fetchWithSystemCA(`${API_BASE}/v1/devices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (devRes.ok) {
        const devData = await devRes.json();
        if (devData.data && devData.data.length > 0) {
          deviceId = devData.data[0].id;
        }
      }
    }

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID required for Ring event sync' }, { status: 400 });
    }

    // Call official Ring Event History API
    const res = await fetchWithSystemCA(`${API_BASE}/v1/history/devices/${deviceId}/events`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Ring Event History API returned ${res.status}: ${err}` }, { status: res.status });
    }

    const json = await res.json();
    const events: any[] = json?.data || [];

    if (events.length === 0) {
      return NextResponse.json({ 
        message: 'No events returned from Ring device event history.',
        eventCount: 0 
      });
    }

    const latest = events[0];
    const eventId = latest.id;
    const eventType = latest.attributes?.event_type || 'Ring Event';
    const startMs = latest.attributes?.start || Date.now();
    const eventTimestamp = new Date(startMs).toISOString();

    // Deduplication check
    if (ingestedRingEventIds.has(eventId)) {
      return NextResponse.json({
        message: 'Event has already been ingested. Deduplicated safely.',
        ringEventId: eventId,
        duplicate: true
      });
    }

    ingestedRingEventIds.add(eventId);

    const newTicket = ticketStore.createTicket({
      ringDeviceId: deviceId,
      ringDeviceName: 'Playground Camera (Ring Live)',
      carrierDetected: 'Amazon',
      arrivedAt: eventTimestamp,
      slaMinutes: 15,
      placement: {
        classification: 'SHELTERED',
        confidence: 0.94,
        hazardNotes: `Grounded to Ring History Event ID: ${eventId} (${eventType})`,
        analyzedAt: eventTimestamp,
      },
    });

    return NextResponse.json({ 
      success: true, 
      ingestedCount: 1, 
      ticket: newTicket,
      ringEventId: eventId,
      eventType,
      eventTimestamp,
      duplicate: false
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
