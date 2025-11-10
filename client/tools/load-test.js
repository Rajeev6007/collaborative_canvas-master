// tools/load-test.js
// Usage: node tools/load-test.js <wsUrl> <numClients> <durationSec>
// Example: node tools/load-test.js ws://localhost:3000 50 20
//
// The script opens <numClients> WebSocket connections to wsUrl,
// joins the "loadroom" room, and each client sends short stroke bursts
// at random intervals for <durationSec> seconds. It reports simple stats.

const WebSocket = require('ws');

const [, , wsUrl = 'ws://localhost:3000', numClientsRaw = '20', durationRaw = '15'] = process.argv;
const NUM_CLIENTS = Math.max(1, Number(numClientsRaw) || 20);
const DURATION = Math.max(5, Number(durationRaw) || 15) * 1000;

console.log(`Load test: connecting ${NUM_CLIENTS} clients to ${wsUrl} for ${DURATION/1000}s`);

let clients = [];
let sentPoints = 0;
let receivedMsgs = 0;
let connected = 0;

function randomId() { return 'lt-' + Math.random().toString(36).slice(2,8); }

function makeClient(i) {
  const ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    connected++;
    // join
    ws.send(JSON.stringify({ type: 'join', payload: { roomId: 'loadroom', userId: randomId(), color: '#888', name: 'lt' + i } }));
    // request initial state
    ws.send(JSON.stringify({ type: 'request_state', payload: {} }));
    // start periodic sending after short random delay
    setTimeout(() => startSending(ws), Math.random() * 800);
  });

  ws.on('message', (m) => {
    receivedMsgs++;
    // ignore payloads
  });

  ws.on('close', () => { /* ignore */ });
  ws.on('error', (e) => { /* ignore */ });

  return ws;
}

function startSending(ws) {
  const sendStrokeBurst = () => {
    if (ws.readyState !== WebSocket.OPEN) return;
    // 1) stroke_start
    ws.send(JSON.stringify({ type: 'stroke_start', payload: { color: '#000', width: 3, tool: 'brush' } }));
    // server will give strokeId; to keep it simple for load test we create a synthetic id locally
    const sid = 's-' + Math.random().toString(36).slice(2,8);
    // broadcast stroke_started so server + other clients can handle it (some servers expect server id; it's fine)
    ws.send(JSON.stringify({ type: 'stroke_started', payload: { strokeId: sid, userId: 'lt', color: '#000', width: 3, tool: 'brush' } }));
    // send 6-20 points in quick succession (simulate fast stroke)
    const pts = 6 + Math.floor(Math.random() * 15);
    for (let p = 0; p < pts; p++) {
      sentPoints++;
      ws.send(JSON.stringify({ type: 'stroke_point', payload: { strokeId: sid, x: Math.random() * 800, y: Math.random() * 500 } }));
    }
    // stroke_end
    ws.send(JSON.stringify({ type: 'stroke_end', payload: { strokeId: sid } }));
  };

  // schedule bursts every 200-800ms (random)
  const interval = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) {
      clearInterval(interval);
      return;
    }
    // small chance to sleep longer (simulate sporadic users)
    if (Math.random() < 0.15) return;
    sendStrokeBurst();
  }, 200 + Math.random() * 600);

  // store the interval so we can clear
  ws._lt_interval = interval;
}

(async function run() {
  for (let i = 0; i < NUM_CLIENTS; i++) {
    clients.push(makeClient(i));
    // small stagger to avoid connection storm
    await new Promise(r => setTimeout(r, 30));
  }

  const start = Date.now();
  const statsInterval = setInterval(() => {
    console.log(`connected: ${connected}/${NUM_CLIENTS}  sentPoints: ${sentPoints}  receivedMsgs: ${receivedMsgs}`);
  }, 2000);

  await new Promise(r => setTimeout(r, DURATION));

  // teardown
  for (const c of clients) {
    try {
      if (c._lt_interval) clearInterval(c._lt_interval);
      c.close();
    } catch(e) {}
  }
  clearInterval(statsInterval);
  console.log('DONE. summary:');
  console.log(`  total sentPoints: ${sentPoints}`);
  console.log(`  total receivedMsgs: ${receivedMsgs}`);
  console.log(`  elapsed: ${(Date.now()-start)/1000}s`);
  process.exit(0);
})();
