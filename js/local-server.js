// Native Android LAN WebSocket server. Browser builds keep using server/server.js.
import { registerPlugin, Capacitor } from '@capacitor/core';

const LocalRoomServer = registerPlugin('LocalRoomServer');

export const isNativeAndroid = () => Capacitor.getPlatform() === 'android';

export async function startLocalRoomServer() {
  if (!isNativeAndroid()) return null;
  return LocalRoomServer.startServer({ port: 8765 });
}

export async function stopLocalRoomServer() {
  if (!isNativeAndroid()) return;
  try { await LocalRoomServer.stopServer(); } catch (e) { console.warn('Could not stop local room server', e); }
}
