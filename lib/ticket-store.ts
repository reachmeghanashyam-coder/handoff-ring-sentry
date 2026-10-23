import { DeliveryTicket, PlacementRisk, TicketStatus } from './types/ticket';
import crypto from 'crypto';

class TicketStore {
  private tickets: Map<string, DeliveryTicket> = new Map();

  constructor() {
    this.seedInitialTickets();
  }

  private seedInitialTickets() {
    const now = new Date();
    const arrived1 = new Date(now.getTime() - 8 * 60 * 1000).toISOString(); // 8 mins ago
    const arrived2 = new Date(now.getTime() - 22 * 60 * 1000).toISOString(); // 22 mins ago

    const ticket1: DeliveryTicket = {
      id: 'DEL-842',
      ringDeviceId: 'front_doorbell_pro2',
      ringDeviceName: 'Front Entrance Doorbell',
      carrierDetected: 'FedEx',
      arrivedAt: arrived1,
      slaMinutes: 15,
      dwellSeconds: 480,
      status: 'MONITORED',
      placement: {
        classification: 'SHELTERED',
        confidence: 0.94,
        hazardNotes: 'Placed under the front awning out of the rain. Pathway is clear.',
        snapshotUrl: '/box.png',
        analyzedAt: arrived1,
      },
      timeline: [
        {
          timestamp: arrived1,
          stage: 'Delivery Arrived',
          description: 'FedEx dropped off a box at the front entrance.',
        },
        {
          timestamp: arrived1,
          stage: 'Spot Check',
          description: 'Camera confirmed the box is under the awning and safe from rain.',
        },
      ],
      contentHash: crypto.createHash('sha256').update(arrived1 + 'DEL-842').digest('hex'),
    };

    const ticket2: DeliveryTicket = {
      id: 'DEL-819',
      ringDeviceId: 'front_doorbell_pro2',
      ringDeviceName: 'Front Entrance Doorbell',
      carrierDetected: 'Amazon',
      arrivedAt: arrived2,
      slaMinutes: 15,
      dwellSeconds: 1320,
      status: 'SLA_BREACHED',
      placement: {
        classification: 'EXPOSED',
        confidence: 0.89,
        hazardNotes: 'Left on the sidewalk near the curb. Visible to people walking by.',
        snapshotUrl: '/box.png',
        analyzedAt: arrived2,
      },
      timeline: [
        {
          timestamp: arrived2,
          stage: 'Delivery Arrived',
          description: 'Amazon Prime delivered a package outside.',
        },
        {
          timestamp: arrived2,
          stage: 'Spot Check',
          description: 'Package was left on the open sidewalk with no cover.',
        },
        {
          timestamp: new Date(new Date(arrived2).getTime() + 15 * 60 * 1000).toISOString(),
          stage: 'Attention Needed',
          description: 'Package has been outside for more than 15 minutes. Alerted reception.',
        },
      ],
      contentHash: crypto.createHash('sha256').update(arrived2 + 'DEL-819').digest('hex'),
    };

    this.tickets.set(ticket1.id, ticket1);
    this.tickets.set(ticket2.id, ticket2);
  }

  public getAllTickets(): DeliveryTicket[] {
    const list = Array.from(this.tickets.values());
    const now = Date.now();

    return list.map((t) => {
      if (t.status === 'MONITORED' || t.status === 'SLA_BREACHED' || t.status === 'INTAKE') {
        const elapsedSec = Math.floor((now - new Date(t.arrivedAt).getTime()) / 1000);
        const isBreached = elapsedSec > t.slaMinutes * 60;
        return {
          ...t,
          dwellSeconds: elapsedSec,
          status: isBreached ? 'SLA_BREACHED' : t.status === 'INTAKE' ? 'MONITORED' : t.status,
        };
      }
      return t;
    }).sort((a, b) => new Date(b.arrivedAt).getTime() - new Date(a.arrivedAt).getTime());
  }

  public getTicketById(id: string): DeliveryTicket | undefined {
    return this.tickets.get(id);
  }

  public createTicket(data: Partial<DeliveryTicket>): DeliveryTicket {
    const now = new Date().toISOString();
    const id = `DEL-${Math.floor(100 + Math.random() * 900)}`;
    
    const newTicket: DeliveryTicket = {
      id,
      ringDeviceId: data.ringDeviceId || 'front_doorbell_pro2',
      ringDeviceName: data.ringDeviceName || 'Front Entrance Doorbell',
      carrierDetected: data.carrierDetected || 'Amazon',
      arrivedAt: now,
      slaMinutes: data.slaMinutes || 15,
      dwellSeconds: 0,
      status: 'MONITORED',
      placement: data.placement || {
        classification: 'SHELTERED',
        confidence: 0.92,
        hazardNotes: 'Placed under the doorway awning, clear of the main walkway.',
        snapshotUrl: '/box.png',
        analyzedAt: now,
      },
      timeline: [
        {
          timestamp: now,
          stage: 'Delivery Arrived',
          description: `${data.carrierDetected || 'Amazon'} dropped off a package at the front door.`,
        },
        {
          timestamp: now,
          stage: 'Spot Check',
          description: 'Checked camera angle: package is under cover.',
        },
      ],
      contentHash: crypto.createHash('sha256').update(now + id).digest('hex'),
    };

    this.tickets.set(id, newTicket);
    return newTicket;
  }

  public resolveTicket(id: string, staffName: string, notes?: string, boxCondition?: 'INTACT_UNDAMAGED' | 'DAMAGED_CRUSHED' | 'MISSING'): DeliveryTicket | null {
    const ticket = this.tickets.get(id);
    if (!ticket) return null;

    const now = new Date().toISOString();
    const finalDwell = Math.floor((Date.now() - new Date(ticket.arrivedAt).getTime()) / 1000);
    const condition = boxCondition || 'INTACT_UNDAMAGED';

    ticket.status = 'RESOLVED_CONFIRMED';
    ticket.dwellSeconds = finalDwell;
    ticket.resolution = {
      resolvedAt: now,
      resolvedBy: staffName,
      resolutionMethod: 'MANUAL_STAFF_ACKNOWLEDGMENT',
      boxCondition: condition,
      contentsVerified: condition === 'INTACT_UNDAMAGED',
      notes: notes || 'Brought inside by staff.',
    };

    ticket.timeline.push({
      timestamp: now,
      stage: 'Physical Intake & Inspection',
      description: `${staffName} retrieved package. Physical Health: ${condition === 'INTACT_UNDAMAGED' ? 'Seal Intact & Undamaged' : 'Packaging Damaged'}. Logged into internal inventory.`,
    });

    ticket.contentHash = crypto.createHash('sha256').update(JSON.stringify(ticket)).digest('hex');
    this.tickets.set(id, ticket);
    return ticket;
  }

  public flagException(id: string, notes: string): DeliveryTicket | null {
    const ticket = this.tickets.get(id);
    if (!ticket) return null;

    const now = new Date().toISOString();
    ticket.status = 'UNATTENDED_REMOVAL';
    ticket.resolution = {
      resolvedAt: now,
      resolvedBy: 'Front Desk',
      resolutionMethod: 'EXCEPTION_REPORTED',
      notes,
    };

    ticket.timeline.push({
      timestamp: now,
      stage: 'Marked Missing',
      description: `${notes}. Delivery record saved for carrier claim.`,
    });

    ticket.contentHash = crypto.createHash('sha256').update(JSON.stringify(ticket)).digest('hex');
    this.tickets.set(id, ticket);
    return ticket;
  }
}

const globalForStore = global as unknown as { ticketStore: TicketStore };
export const ticketStore = globalForStore.ticketStore || new TicketStore();
if (process.env.NODE_ENV !== 'production') globalForStore.ticketStore = ticketStore;
