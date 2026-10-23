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
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'%3E%3Crect width='32' height='32' rx='10' fill='%2304060A'/%3E%3Crect x='0.5' y='0.5' width='31' height='31' rx='9.5' stroke='%2300D4FF' stroke-opacity='0.5'/%3E%3Cpath d='M16 6L7 11V21L16 26L25 21V11L16 6Z' stroke='%2300D4FF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M7 11L16 16L25 11' stroke='%2300D4FF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M16 16V26' stroke='%2300E599' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='23' cy='9' r='2.5' fill='%2300D4FF'/%3E%3C/svg%3E">
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
    <h3>Resolution & Custody Verdict</h3>
    ${ticket.status === 'RESOLVED_CONFIRMED' ? `
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <p style="color: #065f46; font-weight: 700; margin: 0; font-size: 15px;">✓ Custody Transferred · Final Receipt Confirmed</p>
          <span style="background: #10b981; color: white; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">VERIFIED SAFE</span>
        </div>
        <p style="color: #047857; margin: 0 0 6px 0; font-size: 13px;">
          Retrieved from porch and logged into inventory by <strong>${ticket.resolution?.resolvedBy || 'Front Desk'}</strong> on ${new Date(ticket.resolution?.resolvedAt || '').toLocaleDateString()} at ${new Date(ticket.resolution?.resolvedAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
        </p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; padding-top: 8px; border-top: 1px solid #d1fae5; font-size: 12px; color: #065f46;">
          <div><strong>Package Condition:</strong> <span style="color: #047857;">${ticket.resolution?.boxCondition === 'DAMAGED_CRUSHED' ? '⚠ Exterior Damaged' : '✓ Seal Intact · Box Undamaged'}</span></div>
          <div><strong>Contents Audit:</strong> <span style="color: #047857;">${ticket.resolution?.contentsVerified ? '✓ Received in Good Health' : 'Pending Internal Inspection'}</span></div>
          <div><strong>Total Outside Duration:</strong> ${Math.floor(ticket.dwellSeconds / 60)} min ${ticket.dwellSeconds % 60} sec</div>
          <div><strong>Custody Handoff:</strong> Internal Front-Desk Verified</div>
        </div>
      </div>
    ` : ticket.status === 'UNATTENDED_REMOVAL' ? `
      <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <p style="color: #9f1239; font-weight: 700; margin: 0; font-size: 15px;">✕ Missing Package · Claim Evidence Dossier</p>
          <span style="background: #f43f5e; color: white; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">CLAIM FILED</span>
        </div>
        <p style="color: #be123c; margin: 0; font-size: 13px;">Checked porch; package was not found. Carrier delivery dispute evidence locked.</p>
        <div style="margin-top: 8px; font-size: 12px; color: #9f1239;">
          <strong>Verdict:</strong> Package absent from recorded drop coordinates. Carrier notified.
        </div>
      </div>
    ` : ticket.status === 'SLA_BREACHED' ? `
      <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 14px;">
        <p style="color: #9a3412; font-weight: 700; margin: 0 0 4px 0; font-size: 14px;">⚠ Overdue · Exceeded 15-Minute Threshold</p>
        <p style="color: #c2410c; margin: 0; font-size: 13px;">Package has been outside for ${Math.floor(ticket.dwellSeconds / 60)} minutes. Final health check pending physical retrieval.</p>
      </div>
    ` : `
      <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 14px;">
        <p style="color: #0369a1; font-weight: 700; margin: 0 0 4px 0; font-size: 14px;">• In Progress · Within Safe Pickup Window</p>
        <p style="color: #0284c7; margin: 0; font-size: 13px;">Delivered recently. Final condition inspection will be logged upon front-desk retrieval.</p>
      </div>
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
