package com.towerdefense.game;

import android.util.Log;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;
import org.json.JSONObject;
import org.json.JSONArray;
import java.net.InetSocketAddress;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

public class LocalRoomWebSocketServer extends WebSocketServer {
    private static final int MAX_PLAYERS = 4;
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private final Map<String, Room> rooms = new HashMap<>();
    private final Map<WebSocket, Client> clients = new HashMap<>();
    private final SecureRandom random = new SecureRandom();

    static class Client {
        WebSocket socket; Room room; int id = -1; String name = "Player";
        Client(WebSocket socket) { this.socket = socket; }
    }
    static class Room {
        String code; boolean started = false; List<Client> players = new ArrayList<>();
        Room(String code) { this.code = code; }
    }

    public LocalRoomWebSocketServer(int port) {
        super(new InetSocketAddress("0.0.0.0", port));
        setReuseAddr(true);
    }

    @Override public void onOpen(WebSocket conn, ClientHandshake handshake) {
        clients.put(conn, new Client(conn));
    }

    @Override public void onMessage(WebSocket conn, String message) {
        Client c = clients.get(conn);
        if (c == null) return;
        try {
            JSONObject m = new JSONObject(message);
            String type = m.optString("t", "");
            switch (type) {
                case "create": {
                    leave(c);
                    String code = newCode();
                    Room r = new Room(code); r.players.add(c);
                    c.room = r; c.id = 0; c.name = clean(m.optString("name", "Player"));
                    rooms.put(code, r);
                    send(c, obj("t","created","code",code,"id",0));
                    lobby(r); break;
                }
                case "join": {
                    leave(c);
                    String code = m.optString("code", "").trim().toUpperCase();
                    Room r = rooms.get(code);
                    if (r == null) { error(c, "noroom"); break; }
                    if (r.started) { error(c, "started"); break; }
                    if (r.players.size() >= MAX_PLAYERS) { error(c, "full"); break; }
                    int id = 1; while (hasId(r, id)) id++;
                    c.room = r; c.id = id; c.name = clean(m.optString("name", "Player"));
                    r.players.add(c);
                    send(c, obj("t","joined","code",r.code,"id",id)); lobby(r); break;
                }
                case "start": {
                    Room r = c.room;
                    if (r != null && c.id == 0 && !r.started) {
                        r.started = true;
                        JSONObject out = new JSONObject(); out.put("t","start");
                        out.put("cfg", m.optJSONObject("cfg") == null ? new JSONObject() : m.optJSONObject("cfg"));
                        out.put("players", roster(r)); broadcast(r, out.toString());
                    }
                    break;
                }
                case "cmd": {
                    Room r = c.room;
                    if (r != null && c.id != 0) {
                        Client host = findHost(r);
                        if (host != null) {
                            JSONObject out = new JSONObject(); out.put("t","cmd"); out.put("from",c.id);
                            out.put("d",m.optJSONObject("d") == null ? new JSONObject() : m.optJSONObject("d"));
                            send(host, out.toString());
                        }
                    }
                    break;
                }
                case "s": {
                    Room r = c.room;
                    if (r != null && c.id == 0) broadcastExcept(r, conn, message);
                    break;
                }
            }
        } catch (Exception e) { Log.w("LocalRoomServer", "Bad client message", e); }
    }

    @Override public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        Client c = clients.remove(conn); if (c != null) leave(c);
    }
    @Override public void onError(WebSocket conn, Exception ex) { Log.w("LocalRoomServer", "WebSocket error", ex); }
    @Override public void onStart() { Log.i("LocalRoomServer", "LAN WebSocket server started on " + getPort()); }

    private void leave(Client c) {
        Room r = c.room; if (r == null) return;
        c.room = null; r.players.remove(c);
        if (c.id == 0) {
            for (Client p : new ArrayList<>(r.players)) { send(p, obj("t","closed")); p.room = null; }
            r.players.clear(); rooms.remove(r.code); return;
        }
        Client h = findHost(r);
        if (h != null) send(h, obj("t","left","id",c.id));
        if (!r.started) lobby(r);
    }
    private boolean hasId(Room r, int id) { for (Client p:r.players) if (p.id==id) return true; return false; }
    private Client findHost(Room r) { for (Client p:r.players) if (p.id==0) return p; return null; }
    private String newCode() {
        String s;
        do { StringBuilder b = new StringBuilder(); for(int i=0;i<4;i++) b.append(ALPHABET.charAt(random.nextInt(ALPHABET.length()))); s=b.toString(); }
        while (rooms.containsKey(s));
        return s;
    }
    private String clean(String s) {
        String value = s == null ? "Player" : s;
        value = value.replace("<", "").replace(">", "").replace("&", "")
                     .replace(String.valueOf((char) 34), "").replace("'", "");
        if (value.trim().isEmpty()) value = "Player";
        return value.substring(0, Math.min(14, value.length()));
    }
    private JSONArray roster(Room r) {
        JSONArray a = new JSONArray();
        for (Client p:r.players) { JSONObject o = new JSONObject(); try { o.put("id",p.id); o.put("name",p.name); } catch(Exception ignored){} a.put(o); }
        return a;
    }
    private void lobby(Room r) {
        JSONObject o = new JSONObject();
        try { o.put("t","lobby"); o.put("code",r.code); o.put("started",r.started); o.put("players",roster(r)); } catch(Exception ignored){}
        broadcast(r,o.toString());
    }
    private JSONObject obj(Object... pairs) {
        JSONObject o = new JSONObject();
        try { for(int i=0;i<pairs.length;i+=2) o.put(String.valueOf(pairs[i]),pairs[i+1]); } catch(Exception ignored){}
        return o;
    }
    private void error(Client c,String msg) { send(c,obj("t","err","msg",msg)); }
    private void send(Client c,Object o) { if(c!=null && c.socket.isOpen()) c.socket.send(o instanceof String?(String)o:((JSONObject)o).toString()); }
    private void broadcast(Room r,String s) { for(Client p:new ArrayList<>(r.players)) if(p.socket.isOpen()) p.socket.send(s); }
    private void broadcastExcept(Room r,WebSocket except,String s) { for(Client p:new ArrayList<>(r.players)) if(p.socket!=except && p.socket.isOpen()) p.socket.send(s); }
}
