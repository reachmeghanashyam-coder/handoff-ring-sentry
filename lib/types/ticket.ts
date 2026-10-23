export type PlacementRisk = 'SHELTERED' | 'EXPOSED' | 'OCCLUDED_UNCERTAIN';

export type TicketStatus = 
  | 'INTAKE' 
  | 'MONITORED' 
  | 'SLA_BREACHED' 
  | 'RESOLVED_CONFIRMED' 
  | 'UNATTENDED_REMOVAL';

export interface PlacementAudit {
  classification: PlacementRisk;
  confidence: number;
  hazardNotes: string;
  snapshotUrl?: string;
  analyzedAt: string;
}

export interface TimelineEvent {
  timestamp: string;
  stage: string;
  description: string;
}

export interface DeliveryTicket {
  id: string;                     // e.g. "HND-842-OCT2026"
  ringDeviceId: string;
  ringDeviceName?: string;
  carrierDetected: 'Amazon' | 'FedEx' | 'UPS' | 'USPS' | 'Courier / Unspecified';
  arrivedAt: string;              // ISO8601
  slaMinutes: number;             // e.g. 15 (or 0.16 for 10s demo)
  dwellSeconds: number;           // Live calculated elapsed time
  status: TicketStatus;
  placement: PlacementAudit;
  resolution?: {
    resolvedAt: string;
    resolvedBy: string;
    resolutionMethod: 'MANUAL_STAFF_ACKNOWLEDGMENT' | 'EXCEPTION_REPORTED';
    notes?: string;
    boxCondition?: 'INTACT_UNDAMAGED' | 'DAMAGED_CRUSHED' | 'MISSING';
    contentsVerified?: boolean;
  };
  timeline: TimelineEvent[];
  contentHash?: string;           // Cryptographic hash for provenance audit
}
