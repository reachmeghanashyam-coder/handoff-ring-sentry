// Automated API & Route Health Test Runner for Gate 1 (B05 - B08)

async function testApiHealth() {
  console.log('====================================================');
  console.log('GATE 1: HTTP API HEALTH & ERROR RESILIENCE SUITE');
  console.log('====================================================\n');

  const BASE_URL = 'http://localhost:3000';

  // Test B05: GET /api/tickets returns 200 with ticket list
  const res1 = await fetch(`${BASE_URL}/api/tickets`);
  console.log(`[B05a] GET /api/tickets -> Status: ${res1.status} (Expected: 200)`);
  const data1 = await res1.json();
  console.log(`  Tickets count: ${data1.tickets?.length || 0}`);

  // Test B05b: GET /api/tickets/[id]/dossier returns 200 HTML
  if (data1.tickets && data1.tickets.length > 0) {
    const testId = data1.tickets[0].id;
    const res2 = await fetch(`${BASE_URL}/api/tickets/${testId}/dossier`);
    console.log(`[B05b] GET /api/tickets/${testId}/dossier -> Status: ${res2.status} (Expected: 200)`);
    const contentType = res2.headers.get('content-type');
    console.log(`  Content-Type: ${contentType}`);
  }

  // Test B06: Request nonexistent ticket ID -> Expect 404
  const res3 = await fetch(`${BASE_URL}/api/tickets/DEL-NONEXISTENT-999/dossier`);
  console.log(`[B06] GET /api/tickets/DEL-NONEXISTENT-999/dossier -> Status: ${res3.status} (Expected: 404)`);

  // Test B07: Resolve nonexistent ticket -> Expect 404
  const res4 = await fetch(`${BASE_URL}/api/tickets/DEL-NONEXISTENT-999/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staffName: 'Tester' }),
  });
  console.log(`[B07a] POST /api/tickets/DEL-NONEXISTENT-999/resolve -> Status: ${res4.status} (Expected: 404)`);

  // Test B07b: Resolve without staffName -> Expect 400
  if (data1.tickets && data1.tickets.length > 0) {
    const testId = data1.tickets[0].id;
    const res5 = await fetch(`${BASE_URL}/api/tickets/${testId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    console.log(`[B07b] POST /api/tickets/${testId}/resolve (Missing staffName) -> Status: ${res5.status} (Expected: 400)`);
  }

  console.log('\n====================================================');
  console.log('API HEALTH CHECKS COMPLETE');
  console.log('====================================================');
}

testApiHealth().catch(err => {
  console.error('API health check error:', err);
  process.exit(1);
});
