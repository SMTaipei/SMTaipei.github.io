// Stale-operator tests.
//
// An operator whose far end vanished without a close frame must stop holding
// its code: another device may take it, and a display must not be told that
// somebody is hosting. A live one — keepalives or state — keeps it. Needs the
// Worker running with a short threshold so this does not take minutes:
//
//   npx wrangler dev --port 8787 --local --var OP_STALE_MS:4000
//   node test/stale.test.mjs
const BASE = process.env.RELAY || "ws://127.0.0.1:8787/room/";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function open(code, role, dev) {
  return new Promise((res) => {
    const ws = new WebSocket(BASE + code + "?role=" + role + "&dev=" + dev);
    ws.got = [];
    ws.onmessage = (e) => ws.got.push(JSON.parse(e.data));
    ws.onclose = (e) => { ws.closed = e.code; };
    ws.onopen = () => res(ws);
  });
}
const tag = (ws) => ws.got.map((m) => m.t + (m.on !== undefined ? ":" + m.on : "") + (m.n !== undefined ? m.n : ""));
let fail = 0;
function check(name, ok, info) { console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  " + JSON.stringify(info))); if (!ok) fail++; }
const rnd = () => String(100000 + Math.floor(Math.random() * 899999));

// 1. Silent operator, then another device takes the code; the display reaches it.
{
  const code = rnd();
  const zombie = await open(code, "op", "devA");
  await wait(5500);
  const op2 = await open(code, "op", "devB");
  await wait(400);
  const disp = await open(code, "display", "devC");
  await wait(600);
  check("a silent operator does not keep its code from another device", !tag(op2).includes("taken"), tag(op2));
  check("the silent operator is hung up on", zombie.closed === 4002 || zombie.readyState >= 2, zombie.closed);
  check("the display is told there is a host", tag(disp).includes("host:true"), tag(disp));
  check("the new operator is asked for the state", tag(op2).includes("need"), tag(op2));
}

// 2. Silent operator, display arrives alone: told nobody is hosting.
{
  const code = rnd();
  await open(code, "op", "devA");
  await wait(5500);
  const disp = await open(code, "display", "devC");
  await wait(600);
  check("a display is not told a silent operator is hosting", tag(disp).includes("host:false") && !tag(disp).includes("host:true"), tag(disp));
}

// 3. A live operator (keepalives) keeps its code against another device.
{
  const code = rnd();
  const live = await open(code, "op", "devA");
  const beat = setInterval(() => live.send('{"t":"k"}'), 1000);
  await wait(5500);
  const other = await open(code, "op", "devB");
  await wait(500);
  clearInterval(beat);
  check("a live operator still refuses a different device", tag(other).includes("taken"), tag(other));
  check("and is not hung up on", live.readyState === 1, live.closed);
}

// 4. A live operator talking only in state updates also counts as alive.
{
  const code = rnd();
  const live = await open(code, "op", "devA");
  const beat = setInterval(() => live.send(JSON.stringify({ t: "s", d: { x: 1 } })), 1000);
  await wait(5500);
  const disp = await open(code, "display", "devC");
  await wait(500);
  clearInterval(beat);
  check("an operator sending state is still the host", tag(disp).includes("host:true") && live.readyState === 1, tag(disp));
}
console.log(fail ? fail + " failed" : "all passed");
process.exit(fail ? 1 : 0);
