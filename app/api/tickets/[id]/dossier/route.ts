import { NextRequest, NextResponse } from 'next/server';
import { ticketStore } from '@/lib/ticket-store';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const ticket = ticketStore.getTicketById(id);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Delivery Summary - ${ticket.id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #1e293b; line-height: 1.6; }
    .header { border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0; }
    .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
    .badge-sheltered { background: #dcfce7; color: #166534; }
    .badge-exposed { background: #fee2e2; color: #991b1b; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
    .card h3 { margin-top: 0; margin-bottom: 10px; font-size: 13px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
    .timeline { list-style: none; padding-left: 0; margin-top: 16px; }
    .timeline li { margin-bottom: 14px; padding-left: 20px; position: relative; }
    .timeline li::before { content: ""; position: absolute; left: 2px; top: 7px; width: 8px; height: 8px; border-radius: 50%; background: #0284c7; }
    .hash { font-family: monospace; font-size: 11px; background: #f1f5f9; padding: 10px; border-radius: 6px; word-break: break-all; margin-top: 24px; border: 1px solid #cbd5e1; color: #64748b; }
    .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8; display: flex; justify-content: space-between; }
    @media print { body { margin: 20px; } button { display: none; } }
  </style>
</head>
<body>
  <div style="display: flex; justify-content: flex-end; margin-bottom: 16px;">
    <button onclick="window.print()" style="background: #0284c7; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px;">
      Print / Save PDF
    </button>
  </div>

  <div class="header">
    <div>
      <h1 class="title">Delivery Summary & Evidence</h1>
      <div class="subtitle">Front Door Camera Record · Amazon Ring</div>
    </div>
    <div style="text-align: right;">
      <div style="font-weight: 700; font-size: 18px; color: #0284c7;">${ticket.id}</div>
      <div class="subtitle">${new Date(ticket.arrivedAt).toLocaleDateString()} at ${new Date(ticket.arrivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h3>Drop-Off Details</h3>
      <p><strong>Carrier:</strong> ${ticket.carrierDetected}</p>
      <p><strong>Camera:</strong> ${ticket.ringDeviceName || 'Front Door'}</p>
      <p><strong>Drop Time:</strong> ${new Date(ticket.arrivedAt).toLocaleTimeString()}</p>
      <p><strong>Target Pickup Window:</strong> Under ${ticket.slaMinutes} minutes</p>
    </div>

    <div class="card">
      <h3>Where It Was Placed</h3>
      <p><strong>Cover:</strong> 
        <span class="badge ${ticket.placement.classification === 'SHELTERED' ? 'badge-sheltered' : 'badge-exposed'}">
          ${ticket.placement.classification === 'SHELTERED' ? 'Under Cover' : 'Open Sidewalk'}
        </span>
      </p>
      <p><strong>Camera Check:</strong> ${ticket.placement.hazardNotes}</p>
      <p><strong>Time Outside:</strong> <strong>${Math.floor(ticket.dwellSeconds / 60)} min ${ticket.dwellSeconds % 60} sec</strong></p>
    </div>
  </div>

  <div class="card" style="margin-bottom: 24px;">
    <h3>Current Status</h3>
    ${ticket.status === 'RESOLVED_CONFIRMED' ? `
      <p style="color: #166534; font-weight: 600; margin: 0;">✓ Brought inside by ${ticket.resolution?.resolvedBy || 'staff'} at ${new Date(ticket.resolution?.resolvedAt || '').toLocaleTimeString()}.</p>
    ` : ticket.status === 'SLA_BREACHED' ? `
      <p style="color: #991b1b; font-weight: 600; margin: 0;">⚠ Still outside after ${Math.floor(ticket.dwellSeconds / 60)} minutes. Needs attention.</p>
    ` : ticket.status === 'UNATTENDED_REMOVAL' ? `
      <p style="color: #991b1b; font-weight: 600; margin: 0;">✕ Reported missing. Record prepared for delivery dispute.</p>
    ` : `
      <p style="color: #0284c7; font-weight: 600; margin: 0;">• Waiting outside for pickup.</p>
    `}
  </div>

  <div class="card">
    <h3>Timeline of What Happened</h3>
    <ul class="timeline">
      ${ticket.timeline.map((evt: { timestamp: string; stage: string; description: string }) => `
        <li>
          <strong>${new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong> — 
          <span style="font-weight: 600; color: #0284c7;">${evt.stage}</span><br>
          <span style="color: #475569;">${evt.description}</span>
        </li>
      `).join('')}
    </ul>
  </div>

  <div class="hash">
    <strong>Verification Hash:</strong> ${ticket.contentHash || 'N/A'}<br>
    <span style="font-size: 10px; color: #94a3b8;">This code confirms this record has not been altered since it was created.</span>
  </div>

  <div class="footer">
    <div>Handoff for Ring · Simple Front-Desk Receiving</div>
    <div>Ready to attach to carrier claims or internal records</div>
  </div>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Export failed' }, { status: 500 });
  }
}
