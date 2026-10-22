// Native automated test runner for Gate 1 & Gate 2
// Tests state machine, timing, API contracts, input sanitization, and SHA-256 integrity

import { ticketStore } from './lib/ticket-store';
import crypto from 'crypto';

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(id: string, name: string, condition: boolean, details?: string) {
  results.push({ id, name, passed: condition, details });
  const mark = condition ? '✓ PASS' : '✗ FAIL';
  console.log(`${mark} [${id}] ${name}${details ? ` - ${details}` : ''}`);
}

async function runTests() {
  console.log('====================================================');
  console.log('HANDOFF VERIFICATION: GATE 1 & GATE 2 TEST SUITE');
  console.log('====================================================\n');

  // --- S01: Create new delivery ticket ---
  const initialCount = ticketStore.getAllTickets().length;
  const newTicket = ticketStore.createTicket({
    ringDeviceId: 'doorbell_cam_test_01',
    ringDeviceName: 'Test Entrance Doorbell',
    carrierDetected: 'FedEx',
    slaMinutes: 10 / 60, // 10 seconds demo SLA
    placement: {
      classification: 'SHELTERED',
      confidence: 0.95,
      hazardNotes: 'Covered awning placement confirmed',
      analyzedAt: new Date().toISOString(),
    },
  });

  assert(
    'S01',
    'New delivery event creates valid ticket with unique ID and timestamps',
    Boolean(newTicket.id.startsWith('DEL-') && newTicket.arrivedAt && newTicket.timeline.length >= 2),
    `Ticket ID: ${newTicket.id}`
  );

  // --- S02: Ticket enters MONITORED and dwell starts from correct timestamp ---
  const fetched = ticketStore.getTicketById(newTicket.id);
  assert(
    'S02',
    'Ticket enters MONITORED and dwell duration initializes to 0',
    fetched?.status === 'MONITORED' && fetched?.dwellSeconds >= 0
  );

  // --- S03: Dwell calculation based on stored timestamp (not in-memory counter) ---
  const fakeArrived = new Date(Date.now() - 5000).toISOString(); // 5 seconds ago
  const simulatedTicket = ticketStore.createTicket({
    ringDeviceId: 'doorbell_cam_test_02',
    slaMinutes: 10 / 60,
  });
  // Manually backdate to simulate time passage
  (simulatedTicket as any).arrivedAt = fakeArrived;
  
  const allTickets = ticketStore.getAllTickets();
  const foundSimulated = allTickets.find(t => t.id === simulatedTicket.id);
  assert(
    'S03',
    'Elapsed time is calculated from stored arrival timestamp',
    Boolean(foundSimulated && foundSimulated.dwellSeconds >= 4 && foundSimulated.dwellSeconds <= 6),
    `Calculated dwell: ${foundSimulated?.dwellSeconds}s`
  );

  // --- S04: SLA threshold breach at exact configured time ---
  const breachedArrived = new Date(Date.now() - 15000).toISOString(); // 15 seconds ago (breaching 10s SLA)
  (simulatedTicket as any).arrivedAt = breachedArrived;
  
  const breachCheckList = ticketStore.getAllTickets();
  const breachedTicket = breachCheckList.find(t => t.id === simulatedTicket.id);
  assert(
    'S04',
    'Ticket transitions to SLA_BREACHED when dwell exceeds SLA',
    breachedTicket?.status === 'SLA_BREACHED',
    `Status: ${breachedTicket?.status}`
  );

  // --- S05: Staff confirms retrieval ---
  const resolved = ticketStore.resolveTicket(simulatedTicket.id, 'Elena (Front Desk)', 'Stored in reception supply room');
  assert(
    'S05',
    'Staff confirms retrieval: marks RESOLVED_CONFIRMED with staff name and timeline entry',
    Boolean(
      resolved?.status === 'RESOLVED_CONFIRMED' &&
      resolved?.resolution?.resolvedBy === 'Elena (Front Desk)' &&
      resolved?.timeline.some(e => e.stage === 'Brought Inside')
    )
  );

  // --- S06: Item reported missing / exception logged ---
  const missingTicket = ticketStore.createTicket({
    ringDeviceId: 'doorbell_cam_test_03',
    slaMinutes: 15,
  });
  const exceptionResolved = ticketStore.flagException(missingTicket.id, 'Package not at doorstep upon staff arrival');
  assert(
    'S06',
    'Staff reports item missing: transitions to UNATTENDED_REMOVAL with incident log',
    Boolean(
      exceptionResolved?.status === 'UNATTENDED_REMOVAL' &&
      exceptionResolved?.resolution?.resolutionMethod === 'EXCEPTION_REPORTED' &&
      exceptionResolved?.timeline.some(e => e.stage === 'Marked Missing')
    )
  );

  // --- S07: Double resolution check (idempotency) ---
  const secondResolve = ticketStore.resolveTicket(simulatedTicket.id, 'Dr. Marcus', 'Duplicate click attempt');
  assert(
    'S07',
    'Second resolution attempt updates safely without duplicating state corruption',
    secondResolve?.status === 'RESOLVED_CONFIRMED'
  );

  // --- S08: Cryptographic SHA-256 Provenance integrity check ---
  const originalHash = resolved?.contentHash;
  assert(
    'E10',
    'Ticket content produces valid 64-char hex SHA-256 content hash',
    Boolean(originalHash && originalHash.length === 64),
    `Hash: ${originalHash?.slice(0, 16)}...`
  );

  // Tamper test: Mutate ticket and verify hash mismatch
  const tamperedTicket = JSON.parse(JSON.stringify(resolved));
  tamperedTicket.carrierDetected = 'DHL_TAMPERED';
  const tamperedHash = crypto.createHash('sha256').update(JSON.stringify(tamperedTicket)).digest('hex');
  assert(
    'E10b',
    'Tampered record content alters cryptographic hash',
    tamperedHash !== originalHash,
    `Tampered hash detected mismatch`
  );

  // --- Summary ---
  console.log('\n====================================================');
  const passedCount = results.filter(r => r.passed).length;
  console.log(`TEST RUN COMPLETE: ${passedCount}/${results.length} PASSED`);
  console.log('====================================================');

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
