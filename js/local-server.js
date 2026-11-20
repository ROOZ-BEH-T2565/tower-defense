// Native Android LAN WebSocket server. Browser builds keep using server/server.js.
let localRoomServer;

function getCapacitor() {
  return globalThis.Capacitor || null;
}

async function ensureLocalRoomServer() {
  if (localRoomServer) return;
  const { registerPlugin } = await import('@capacitor/core');
  // Capacitor plugin proxies are thenable-like in this runtime; never return/resolve them from async functions.
  localRoomServer = registerPlugin('LocalRoomServer');
}

export function isNativeAndroid() {
  try { return getCapacitor()?.getPlatform?.() === 'android'; } catch { return false; }
}

export async function startLocalRoomServer() {
  if (!isNativeAndroid()) return null;
  await ensureLocalRoomServer();
  return localRoomServer.startServer({ port: 8765 });
}

export async function stopLocalRoomServer() {
  if (!isNativeAndroid()) return;
  try {
    await ensureLocalRoomServer();
    await localRoomServer.stopServer();
  } catch (e) {
    console.warn('Could not stop local room server', e);
  }
}
