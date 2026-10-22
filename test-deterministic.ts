// Deterministic Integration & Edge Case Verification Suite
// Runs independently of transient 30-minute cloud tokens while testing all server state machines

import crypto from 'crypto';

interface TestCase {
  id: string;
  name: string;
  pass: boolean;
  details: string;
}

const cases: TestCase[] = [];
const BASE = 'http://localhost:3000';

function record(id: string, name: string, pass: boolean, details: string) {
  cases.push({ id, name, pass, details });
  console.log(`${pass ? '✓ PASS' : '✗ FAIL'} [${id}] ${name} - ${details}`);
}

async function verify() {
  console.log('====================================================');
  console.log('DETERMINISTIC GATE VERIFICATION SUITE');
  console.log('====================================================\n');

  // Check 1: GET /api/tickets
  const tListRes = await fetch(`${BASE}/api/tickets`);
  const tListData = await tListRes.json();
  record('V01', 'Ticket queue query', tListRes.status === 200 && Array.isArray(tListData.tickets), `Status: ${tListRes.status}, Queue length: ${tListData.tickets?.length}`);

  // Check 2: POST /api/tickets (Intake creation)
  const createRes = await fetch(`${BASE}/api/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ringDeviceId: 'dev_integration_test',
      carrierDetected: 'Amazon',
      slaMinutes: 15,
      placement: {
        classification: 'SHELTERED',
        confidence: 0.94,
        hazardNotes: 'Under front awning',
        analyzedAt: new Date().toISOString()
      }
    })
  });
  const createData = await createRes.json();
  const createdId = createData.ticket?.id;
  record('V02', 'Ticket intake endpoint', createRes.status === 201 && createdId?.startsWith('DEL-'), `Status: ${createRes.status}, Ticket: ${createdId}`);

  // Check 3: Missing staff name rejection
  const badResolveRes = await fetch(`${BASE}/api/tickets/${createdId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  record('V03', 'Staff confirmation validation', badResolveRes.status === 400, `Status: ${badResolveRes.status} (Expected 400)`);

  // Check 4: Valid retrieval confirmation
  const goodResolveRes = await fetch(`${BASE}/api/tickets/${createdId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staffName: 'Dr. Jane Reception' })
  });
  const goodResolveData = await goodResolveRes.json();
  record('V04', 'Staff retrieval confirmation', goodResolveRes.status === 200 && goodResolveData.ticket?.status === 'RESOLVED_CONFIRMED', `Status: ${goodResolveData.ticket?.status}, ResolvedBy: ${goodResolveData.ticket?.resolution?.resolvedBy}`);

  // Check 5: Dossier HTML generation & integrity
  const dossierRes = await fetch(`${BASE}/api/tickets/${createdId}/dossier`);
  const dossierHtml = await dossierRes.text();
  const hasId = dossierHtml.includes(createdId);
  const hasHash = dossierHtml.includes('Verification Hash:');
  record('V05', 'Dossier generation & evidence matching', dossierRes.status === 200 && hasId && hasHash, `HTML status: ${dossierRes.status}, Matched Ticket ID: ${hasId}, Hash Present: ${hasHash}`);

  // Check 6: Nonexistent ticket 404
  const notFoundRes = await fetch(`${BASE}/api/tickets/DEL-NONEXISTENT-000/dossier`);
  record('V06', 'Nonexistent ticket lookup', notFoundRes.status === 404, `Status: ${notFoundRes.status} (Expected 404)`);

  // Check 7: Sync endpoint returns 401 when no token is active
  const syncNoToken = await fetch(`${BASE}/api/ring/events/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: 'test_dev' })
  });
  const syncJson = await syncNoToken.json();
  record('V07', 'Sync endpoint auth guardrail', syncNoToken.status === 401 && syncJson.code === 'UNAUTHORIZED_NO_TOKEN', `Status: ${syncNoToken.status}, Code: ${syncJson.code}`);

  // Check 8: Token validation against Ring API rejects invalid tokens
  const badTokenRes = await fetch(`${BASE}/api/ring/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'definitely_invalid_token_999' })
  });
  record('V08', 'Ring token validation against cloud', badTokenRes.status === 401, `Status: ${badTokenRes.status} (Expected 401)`);

  // Summary
  console.log('\n====================================================');
  const passCount = cases.filter(c => c.pass).length;
  console.log(`DETERMINISTIC VERIFICATION COMPLETE: ${passCount}/${cases.length} PASSED`);
  console.log('====================================================');

  if (passCount !== cases.length) process.exit(1);
}

verify().catch(e => {
  console.error('Fatal check error:', e);
  process.exit(1);
});
