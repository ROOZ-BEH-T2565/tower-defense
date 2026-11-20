// Native Android LAN WebSocket server. Browser builds keep using server/server.js.
let localRoomServer;

function getCapacitor() {
  return globalThis.Capacitor || null;
}

async function getLocalRoomServer() {
  if (localRoomServer) return localRoomServer;
  const { registerPlugin } = await import('@capacitor/core');
  localRoomServer = registerPlugin('LocalRoomServer');
  return localRoomServer;
}

export function isNativeAndroid() {
  try { return getCapacitor()?.getPlatform?.() === 'android'; } catch { return false; }
}

export async function startLocalRoomServer() {
  if (!isNativeAndroid()) return null;
  const plugin = await getLocalRoomServer();
  return plugin.startServer({ port: 8765 });
}

export async function stopLocalRoomServer() {
  if (!isNativeAndroid()) return;
  try {
    const plugin = await getLocalRoomServer();
    await plugin.stopServer();
  } catch (e) {
    console.warn('Could not stop local room server', e);
  }
}
