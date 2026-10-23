import { NextRequest, NextResponse } from 'next/server';
import { ticketStore } from '@/lib/ticket-store';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { staffName, notes, action } = body;

    if (action === 'flag_exception') {
      const ticket = ticketStore.flagException(id, notes || 'Item unverified / missing after delivery');
      if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      return NextResponse.json({ ticket });
    }

    if (!staffName) {
      return NextResponse.json({ error: 'Staff name is required to confirm physical custody' }, { status: 400 });
    }

    const ticket = ticketStore.resolveTicket(id, staffName, notes, body.boxCondition);
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

    return NextResponse.json({ ticket });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Resolution failed' }, { status: 500 });
  }
}
