import { NextRequest, NextResponse } from 'next/server';
import { ticketStore } from '@/lib/ticket-store';

export async function GET() {
  try {
    const tickets = ticketStore.getAllTickets();
    return NextResponse.json({ tickets });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch tickets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newTicket = ticketStore.createTicket(body);
    return NextResponse.json({ ticket: newTicket }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create ticket' }, { status: 500 });
  }
}
