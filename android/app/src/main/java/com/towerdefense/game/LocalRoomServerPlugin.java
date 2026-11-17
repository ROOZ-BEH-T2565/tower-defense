package com.towerdefense.game;

import android.util.Log;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.net.Inet4Address;
import java.net.NetworkInterface;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;

@CapacitorPlugin(name = "LocalRoomServer")
public class LocalRoomServerPlugin extends Plugin {
    private LocalRoomWebSocketServer server;

    @PluginMethod
    public void startServer(PluginCall call) {
        int port = call.getInt("port", 8765);
        try {
            if (server == null) {
                LocalRoomWebSocketServer newServer = new LocalRoomWebSocketServer(port);
                newServer.start();
                // Wait for WebSocketServer.onStart so JavaScript does not race
                // the socket bind and attempt to connect too early.
                if (!newServer.awaitStarted(5000)) {
                    try { newServer.stop(250); } catch (Exception ignored) { }
                    throw new IllegalStateException("Local WebSocket server did not start on port " + port);
                }
                server = newServer;
            }
            com.getcapacitor.JSObject result = new com.getcapacitor.JSObject();
            result.put("port", port);
            result.put("addresses", getIPv4Addresses());
            call.resolve(result);
        } catch (Exception e) {
            Log.e("LocalRoomServer", "Unable to start LAN server", e);
            call.reject("Unable to start local server: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void stopServer(PluginCall call) {
        try {
            if (server != null) {
                server.stop(500);
                server = null;
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Unable to stop local server: " + e.getMessage(), e);
        }
    }

    private List<String> getIPv4Addresses() throws Exception {
        List<String> out = new ArrayList<>();
        List<String> preferred = new ArrayList<>();
        Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
        while (interfaces.hasMoreElements()) {
            NetworkInterface ni = interfaces.nextElement();
            if (!ni.isUp() || ni.isLoopback()) continue;
            Enumeration<java.net.InetAddress> addresses = ni.getInetAddresses();
            while (addresses.hasMoreElements()) {
                java.net.InetAddress address = addresses.nextElement();
                if (address instanceof Inet4Address && !address.isLoopbackAddress() && !address.isLinkLocalAddress()) {
                    String ip = address.getHostAddress();
                    String ifName = ni.getName().toLowerCase();
                    if (ifName.contains("wlan") || ifName.contains("ap") || ifName.contains("wifi")) preferred.add(ip);
                    else out.add(ip);
                }
            }
        }
        preferred.addAll(out);
        return preferred;
    }
}
