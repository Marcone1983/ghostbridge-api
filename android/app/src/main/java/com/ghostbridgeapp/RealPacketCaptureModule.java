package com.ghostbridgeapp;

import android.content.Context;
import android.net.TrafficStats;
import android.os.Handler;
import android.os.Looper;
import android.os.Process;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class RealPacketCaptureModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "RealPacketCapture";
    private ReactApplicationContext reactContext;
    private boolean isCapturing = false;
    private ExecutorService captureExecutor;
    private Handler mainHandler;
    
    // Network monitoring data
    private Map<String, ConnectionInfo> activeConnections = new HashMap<>();
    private List<PacketInfo> capturedPackets = new ArrayList<>();
    private long startTime;
    private int uid;
    
    // Traffic statistics
    private long lastRxBytes = 0;
    private long lastTxBytes = 0;
    private long lastTimestamp = 0;

    public RealPacketCaptureModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
        this.mainHandler = new Handler(Looper.getMainLooper());
        this.captureExecutor = Executors.newSingleThreadExecutor();
        this.uid = Process.myUid();
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void startPacketCapture(Promise promise) {
        try {
            if (isCapturing) {
                promise.reject("ALREADY_CAPTURING", "Packet capture already in progress");
                return;
            }

            isCapturing = true;
            startTime = System.currentTimeMillis();
            activeConnections.clear();
            capturedPackets.clear();
            
            // Initialize traffic stats baseline
            lastRxBytes = TrafficStats.getUidRxBytes(uid);
            lastTxBytes = TrafficStats.getUidTxBytes(uid);
            lastTimestamp = System.currentTimeMillis();
            
            // Start monitoring in background thread
            captureExecutor.execute(this::performPacketCapture);
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("method", "real_network_monitoring");
            result.putLong("startTime", startTime);
            result.putInt("uid", uid);
            
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("CAPTURE_START_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopPacketCapture(Promise promise) {
        try {
            isCapturing = false;
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putLong("duration", System.currentTimeMillis() - startTime);
            result.putInt("packetsCapture", capturedPackets.size());
            result.putInt("connections", activeConnections.size());
            
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("CAPTURE_STOP_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getNetworkStatistics(Promise promise) {
        try {
            long currentRxBytes = TrafficStats.getUidRxBytes(uid);
            long currentTxBytes = TrafficStats.getUidTxBytes(uid);
            long currentTime = System.currentTimeMillis();
            
            long rxDelta = currentRxBytes - lastRxBytes;
            long txDelta = currentTxBytes - lastTxBytes;
            long timeDelta = currentTime - lastTimestamp;
            
            WritableMap stats = Arguments.createMap();
            stats.putDouble("rxBytes", currentRxBytes);
            stats.putDouble("txBytes", currentTxBytes);
            stats.putDouble("rxBytesPerSec", timeDelta > 0 ? (rxDelta * 1000.0 / timeDelta) : 0);
            stats.putDouble("txBytesPerSec", timeDelta > 0 ? (txDelta * 1000.0 / timeDelta) : 0);
            stats.putInt("activeConnections", activeConnections.size());
            stats.putLong("timestamp", currentTime);
            
            // Update for next calculation
            lastRxBytes = currentRxBytes;
            lastTxBytes = currentTxBytes;
            lastTimestamp = currentTime;
            
            promise.resolve(stats);
            
        } catch (Exception e) {
            promise.reject("STATS_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getActiveConnections(Promise promise) {
        try {
            WritableArray connections = Arguments.createArray();
            
            for (ConnectionInfo conn : activeConnections.values()) {
                WritableMap connMap = Arguments.createMap();
                connMap.putString("protocol", conn.protocol);
                connMap.putString("localAddress", conn.localAddress);
                connMap.putInt("localPort", conn.localPort);
                connMap.putString("remoteAddress", conn.remoteAddress);
                connMap.putInt("remotePort", conn.remotePort);
                connMap.putString("state", conn.state);
                connMap.putLong("firstSeen", conn.firstSeen);
                connMap.putLong("lastSeen", conn.lastSeen);
                connMap.putInt("uid", conn.uid);
                
                connections.pushMap(connMap);
            }
            
            promise.resolve(connections);
            
        } catch (Exception e) {
            promise.reject("CONNECTIONS_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void analyzeTrafficPatterns(Promise promise) {
        try {
            WritableMap analysis = Arguments.createMap();
            
            // Analyze connection patterns
            Map<String, Integer> protocolCounts = new HashMap<>();
            Map<String, Integer> portCounts = new HashMap<>();
            Map<String, Integer> hostCounts = new HashMap<>();
            
            for (ConnectionInfo conn : activeConnections.values()) {
                // Protocol analysis
                protocolCounts.put(conn.protocol, 
                    protocolCounts.getOrDefault(conn.protocol, 0) + 1);
                
                // Port analysis
                String port = String.valueOf(conn.remotePort);
                portCounts.put(port, portCounts.getOrDefault(port, 0) + 1);
                
                // Host analysis
                hostCounts.put(conn.remoteAddress, 
                    hostCounts.getOrDefault(conn.remoteAddress, 0) + 1);
            }
            
            // Check for suspicious patterns
            WritableArray suspiciousActivities = Arguments.createArray();
            
            // Check for port scanning (many different ports to same host)
            for (Map.Entry<String, Integer> entry : hostCounts.entrySet()) {
                if (entry.getValue() > 10) { // More than 10 connections to same host
                    WritableMap suspicious = Arguments.createMap();
                    suspicious.putString("type", "potential_port_scan");
                    suspicious.putString("target", entry.getKey());
                    suspicious.putInt("connections", entry.getValue());
                    suspicious.putString("severity", "medium");
                    suspiciousActivities.pushMap(suspicious);
                }
            }
            
            // Check for unusual protocols
            for (Map.Entry<String, Integer> entry : protocolCounts.entrySet()) {
                if (!entry.getKey().equals("tcp") && !entry.getKey().equals("udp")) {
                    WritableMap suspicious = Arguments.createMap();
                    suspicious.putString("type", "unusual_protocol");
                    suspicious.putString("protocol", entry.getKey());
                    suspicious.putInt("count", entry.getValue());
                    suspicious.putString("severity", "low");
                    suspiciousActivities.pushMap(suspicious);
                }
            }
            
            // Traffic volume analysis
            long currentRx = TrafficStats.getUidRxBytes(uid);
            long currentTx = TrafficStats.getUidTxBytes(uid);
            long totalTraffic = currentRx + currentTx;
            
            if (totalTraffic > 50 * 1024 * 1024) { // > 50MB
                WritableMap suspicious = Arguments.createMap();
                suspicious.putString("type", "high_data_transfer");
                suspicious.putDouble("totalMB", totalTraffic / (1024.0 * 1024.0));
                suspicious.putString("severity", "high");
                suspiciousActivities.pushMap(suspicious);
            }
            
            analysis.putArray("suspiciousActivities", suspiciousActivities);
            analysis.putMap("protocolDistribution", createMapFromCounts(protocolCounts));
            analysis.putMap("portDistribution", createMapFromCounts(portCounts));
            analysis.putMap("hostDistribution", createMapFromCounts(hostCounts));
            analysis.putLong("totalTrafficBytes", totalTraffic);
            analysis.putLong("analysisTime", System.currentTimeMillis());
            
            promise.resolve(analysis);
            
        } catch (Exception e) {
            promise.reject("ANALYSIS_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void detectAnomalies(Promise promise) {
        try {
            WritableArray anomalies = Arguments.createArray();
            long currentTime = System.currentTimeMillis();
            
            // Analyze recent connection patterns
            List<ConnectionInfo> recentConnections = new ArrayList<>();
            for (ConnectionInfo conn : activeConnections.values()) {
                if (currentTime - conn.lastSeen < 60000) { // Last minute
                    recentConnections.add(conn);
                }
            }
            
            // Connection frequency anomaly
            if (recentConnections.size() > 20) {
                WritableMap anomaly = Arguments.createMap();
                anomaly.putString("type", "connection_frequency_spike");
                anomaly.putInt("connections", recentConnections.size());
                anomaly.putString("timeframe", "1_minute");
                anomaly.putString("severity", "high");
                anomaly.putString("description", "Unusual number of connections in short time");
                anomalies.pushMap(anomaly);
            }
            
            // Suspicious port usage
            List<Integer> suspiciousPorts = List.of(22, 23, 135, 139, 445, 1433, 3389);
            for (ConnectionInfo conn : recentConnections) {
                if (suspiciousPorts.contains(conn.remotePort)) {
                    WritableMap anomaly = Arguments.createMap();
                    anomaly.putString("type", "suspicious_port_access");
                    anomaly.putInt("port", conn.remotePort);
                    anomaly.putString("remoteAddress", conn.remoteAddress);
                    anomaly.putString("severity", "medium");
                    anomaly.putString("description", "Access to potentially sensitive port");
                    anomalies.pushMap(anomaly);
                }
            }
            
            // Geographic anomaly detection (simplified)
            for (ConnectionInfo conn : recentConnections) {
                if (isIPFromUnusualLocation(conn.remoteAddress)) {
                    WritableMap anomaly = Arguments.createMap();
                    anomaly.putString("type", "unusual_geographic_location");
                    anomaly.putString("remoteAddress", conn.remoteAddress);
                    anomaly.putString("severity", "medium");
                    anomaly.putString("description", "Connection to unusual geographic location");
                    anomalies.pushMap(anomaly);
                }
            }
            
            WritableMap result = Arguments.createMap();
            result.putArray("anomalies", anomalies);
            result.putInt("totalConnections", activeConnections.size());
            result.putInt("recentConnections", recentConnections.size());
            result.putLong("detectionTime", currentTime);
            
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("ANOMALY_DETECTION_ERROR", e.getMessage());
        }
    }

    private void performPacketCapture() {
        try {
            while (isCapturing) {
                // Read network connections from /proc/net/tcp and /proc/net/udp
                readTcpConnections();
                readUdpConnections();
                
                // Monitor traffic statistics
                monitorTrafficStats();
                
                // Check for new connections and emit events
                checkForNewConnections();
                
                // Sleep for monitoring interval
                Thread.sleep(1000); // 1 second intervals
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            sendEvent("packetCaptureError", e.getMessage());
        }
    }

    private void readTcpConnections() {
        try (BufferedReader reader = new BufferedReader(new FileReader("/proc/net/tcp"))) {
            String line;
            reader.readLine(); // Skip header
            
            while ((line = reader.readLine()) != null) {
                ConnectionInfo conn = parseTcpLine(line);
                if (conn != null && conn.uid == uid) {
                    String key = conn.getKey();
                    ConnectionInfo existing = activeConnections.get(key);
                    
                    if (existing == null) {
                        conn.firstSeen = System.currentTimeMillis();
                        activeConnections.put(key, conn);
                        
                        // Emit new connection event
                        emitConnectionEvent(conn, "new_connection");
                    } else {
                        existing.lastSeen = System.currentTimeMillis();
                        existing.state = conn.state;
                    }
                }
            }
        } catch (IOException e) {
            // Handle error silently
        }
    }

    private void readUdpConnections() {
        try (BufferedReader reader = new BufferedReader(new FileReader("/proc/net/udp"))) {
            String line;
            reader.readLine(); // Skip header
            
            while ((line = reader.readLine()) != null) {
                ConnectionInfo conn = parseUdpLine(line);
                if (conn != null && conn.uid == uid) {
                    String key = conn.getKey();
                    ConnectionInfo existing = activeConnections.get(key);
                    
                    if (existing == null) {
                        conn.firstSeen = System.currentTimeMillis();
                        activeConnections.put(key, conn);
                        
                        // Emit new connection event
                        emitConnectionEvent(conn, "new_connection");
                    } else {
                        existing.lastSeen = System.currentTimeMillis();
                    }
                }
            }
        } catch (IOException e) {
            // Handle error silently
        }
    }

    private ConnectionInfo parseTcpLine(String line) {
        try {
            String[] parts = line.trim().split("\\s+");
            if (parts.length < 8) return null;
            
            ConnectionInfo conn = new ConnectionInfo();
            conn.protocol = "tcp";
            
            // Parse local address
            String[] localAddr = parts[1].split(":");
            conn.localAddress = parseHexAddress(localAddr[0]);
            conn.localPort = Integer.parseInt(localAddr[1], 16);
            
            // Parse remote address
            String[] remoteAddr = parts[2].split(":");
            conn.remoteAddress = parseHexAddress(remoteAddr[0]);
            conn.remotePort = Integer.parseInt(remoteAddr[1], 16);
            
            // Parse state
            int state = Integer.parseInt(parts[3], 16);
            conn.state = getTcpState(state);
            
            // Parse UID
            conn.uid = Integer.parseInt(parts[7]);
            
            conn.lastSeen = System.currentTimeMillis();
            
            return conn;
            
        } catch (Exception e) {
            return null;
        }
    }

    private ConnectionInfo parseUdpLine(String line) {
        try {
            String[] parts = line.trim().split("\\s+");
            if (parts.length < 8) return null;
            
            ConnectionInfo conn = new ConnectionInfo();
            conn.protocol = "udp";
            
            // Parse local address
            String[] localAddr = parts[1].split(":");
            conn.localAddress = parseHexAddress(localAddr[0]);
            conn.localPort = Integer.parseInt(localAddr[1], 16);
            
            // Parse remote address
            String[] remoteAddr = parts[2].split(":");
            conn.remoteAddress = parseHexAddress(remoteAddr[0]);
            conn.remotePort = Integer.parseInt(remoteAddr[1], 16);
            
            conn.state = "ESTABLISHED";
            conn.uid = Integer.parseInt(parts[7]);
            conn.lastSeen = System.currentTimeMillis();
            
            return conn;
            
        } catch (Exception e) {
            return null;
        }
    }

    private String parseHexAddress(String hexAddr) {
        try {
            long addr = Long.parseLong(hexAddr, 16);
            return String.format("%d.%d.%d.%d",
                (addr) & 0xFF,
                (addr >> 8) & 0xFF,
                (addr >> 16) & 0xFF,
                (addr >> 24) & 0xFF);
        } catch (Exception e) {
            return "0.0.0.0";
        }
    }

    private String getTcpState(int state) {
        switch (state) {
            case 1: return "ESTABLISHED";
            case 2: return "SYN_SENT";
            case 3: return "SYN_RECV";
            case 4: return "FIN_WAIT1";
            case 5: return "FIN_WAIT2";
            case 6: return "TIME_WAIT";
            case 7: return "CLOSE";
            case 8: return "CLOSE_WAIT";
            case 9: return "LAST_ACK";
            case 10: return "LISTEN";
            case 11: return "CLOSING";
            default: return "UNKNOWN";
        }
    }

    private void monitorTrafficStats() {
        long currentRx = TrafficStats.getUidRxBytes(uid);
        long currentTx = TrafficStats.getUidTxBytes(uid);
        long currentTime = System.currentTimeMillis();
        
        if (lastTimestamp > 0) {
            long rxDelta = currentRx - lastRxBytes;
            long txDelta = currentTx - lastTxBytes;
            long timeDelta = currentTime - lastTimestamp;
            
            if (timeDelta > 0) {
                double rxRate = (rxDelta * 1000.0) / timeDelta; // bytes per second
                double txRate = (txDelta * 1000.0) / timeDelta;
                
                // Check for traffic spikes
                if (rxRate > 1024 * 1024 || txRate > 1024 * 1024) { // > 1MB/s
                    WritableMap event = Arguments.createMap();
                    event.putString("type", "traffic_spike");
                    event.putDouble("rxRate", rxRate);
                    event.putDouble("txRate", txRate);
                    event.putLong("timestamp", currentTime);
                    
                    sendEvent("trafficAnomaly", event);
                }
            }
        }
        
        lastRxBytes = currentRx;
        lastTxBytes = currentTx;
        lastTimestamp = currentTime;
    }

    private void checkForNewConnections() {
        // Clean up old connections
        long currentTime = System.currentTimeMillis();
        activeConnections.entrySet().removeIf(entry -> 
            currentTime - entry.getValue().lastSeen > 300000); // 5 minutes old
    }

    private void emitConnectionEvent(ConnectionInfo conn, String eventType) {
        WritableMap event = Arguments.createMap();
        event.putString("type", eventType);
        event.putString("protocol", conn.protocol);
        event.putString("localAddress", conn.localAddress);
        event.putInt("localPort", conn.localPort);
        event.putString("remoteAddress", conn.remoteAddress);
        event.putInt("remotePort", conn.remotePort);
        event.putString("state", conn.state);
        event.putLong("timestamp", System.currentTimeMillis());
        
        sendEvent("networkConnection", event);
    }

    private WritableMap createMapFromCounts(Map<String, Integer> counts) {
        WritableMap map = Arguments.createMap();
        for (Map.Entry<String, Integer> entry : counts.entrySet()) {
            map.putInt(entry.getKey(), entry.getValue());
        }
        return map;
    }

    private boolean isIPFromUnusualLocation(String ip) {
        // Simplified geographic checking
        // In production, use proper GeoIP database
        try {
            String[] parts = ip.split("\\.");
            int firstOctet = Integer.parseInt(parts[0]);
            
            // Check for some unusual ranges (simplified)
            return firstOctet > 200 || firstOctet < 10;
            
        } catch (Exception e) {
            return false;
        }
    }

    private void sendEvent(String eventName, Object data) {
        if (reactContext.hasActiveReactInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, data);
        }
    }

    // Inner class for connection information
    private static class ConnectionInfo {
        String protocol;
        String localAddress;
        int localPort;
        String remoteAddress;
        int remotePort;
        String state;
        long firstSeen;
        long lastSeen;
        int uid;
        
        String getKey() {
            return protocol + ":" + localAddress + ":" + localPort + 
                   "->" + remoteAddress + ":" + remotePort;
        }
    }

    // Inner class for packet information
    private static class PacketInfo {
        long timestamp;
        String protocol;
        String source;
        String destination;
        int size;
        String flags;
    }
}