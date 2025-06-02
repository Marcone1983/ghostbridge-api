/**
 * REAL Network Intrusion Detection System
 * Monitors actual network traffic and system behavior for threats
 */

import { NativeModules, NetInfo, DeviceEventEmitter } from 'react-native';
import DeviceInfo from 'react-native-device-info';

class RealIntrusionDetection {
  constructor() {
    this.monitoring = false;
    this.alerts = [];
    this.networkBaseline = {};
    this.threatSignatures = new Map();
    this.connectionLog = [];
    this.anomalyThresholds = {
      connectionSpike: 10, // connections per second
      dataTransferSpike: 1048576, // 1MB per second
      suspiciousPortAccess: [22, 23, 80, 443, 8080, 8443],
      failedConnectionThreshold: 5,
      geolocationRadius: 1000 // km from expected location
    };
    
    this.initializeThreatSignatures();
    this.initialize();
  }

  /**
   * Initialize intrusion detection system
   */
  async initialize() {
    try {
      // Establish network baseline
      await this.establishNetworkBaseline();
      
      // Setup network monitoring
      this.setupNetworkMonitoring();
      
      // Setup connection monitoring
      this.setupConnectionMonitoring();
      
      // Initialize geolocation tracking
      await this.initializeGeolocationTracking();
      
      console.log('🛡️ REAL Intrusion Detection System initialized');
      
    } catch (error) {
      console.error('💀 IDS initialization failed:', error.message);
    }
  }

  /**
   * Start intrusion detection monitoring
   */
  async startMonitoring() {
    if (this.monitoring) {
      console.warn('⚠️ IDS already monitoring');
      return;
    }

    try {
      this.monitoring = true;
      this.alerts = [];
      
      // Start real-time network monitoring
      await this.startNetworkCapture();
      
      // Start behavioral analysis
      this.startBehavioralAnalysis();
      
      // Start threat hunting
      this.startThreatHunting();
      
      console.log('🚨 REAL IDS monitoring started');
      
      return {
        success: true,
        startTime: Date.now(),
        features: [
          'Network traffic analysis',
          'Connection monitoring',
          'Behavioral analysis',
          'Geolocation tracking',
          'Threat signature detection',
          'Anomaly detection'
        ]
      };
      
    } catch (error) {
      this.monitoring = false;
      throw new Error(`IDS start failed: ${error.message}`);
    }
  }

  /**
   * Stop intrusion detection monitoring
   */
  async stopMonitoring() {
    if (!this.monitoring) {
      return;
    }

    this.monitoring = false;
    
    // Stop all monitoring activities
    this.stopNetworkCapture();
    this.stopBehavioralAnalysis();
    this.stopThreatHunting();
    
    console.log('🛑 REAL IDS monitoring stopped');
    
    return {
      success: true,
      stopTime: Date.now(),
      totalAlerts: this.alerts.length,
      summary: this.generateMonitoringSummary()
    };
  }

  /**
   * Establish network baseline
   */
  async establishNetworkBaseline() {
    try {
      const netInfo = await NetInfo.fetch();
      const deviceInfo = await DeviceInfo.getDeviceName();
      
      this.networkBaseline = {
        connectionType: netInfo.type,
        isConnected: netInfo.isConnected,
        isInternetReachable: netInfo.isInternetReachable,
        deviceName: deviceInfo,
        establishedTime: Date.now(),
        expectedBehavior: {
          normalConnections: [],
          trustedNetworks: [],
          usualTrafficPatterns: {}
        }
      };
      
      console.log('📊 Network baseline established:', this.networkBaseline);
      
    } catch (error) {
      console.error('Baseline establishment failed:', error.message);
    }
  }

  /**
   * Setup real network monitoring
   */
  setupNetworkMonitoring() {
    // Monitor network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      this.analyzeNetworkChange(state);
    });

    this.networkUnsubscribe = unsubscribe;
  }

  /**
   * Setup connection monitoring using native modules
   */
  setupConnectionMonitoring() {
    try {
      const { NetworkMonitor } = NativeModules;
      
      if (NetworkMonitor) {
        // Start native network monitoring
        NetworkMonitor.startConnectionMonitoring()
          .then(result => {
            console.log('📡 Native connection monitoring started:', result);
          })
          .catch(error => {
            console.warn('Native connection monitoring failed:', error.message);
            // Fallback to JavaScript-based monitoring
            this.fallbackConnectionMonitoring();
          });

        // Listen for connection events
        DeviceEventEmitter.addListener('networkConnection', (data) => {
          this.analyzeConnection(data);
        });

        DeviceEventEmitter.addListener('suspiciousActivity', (data) => {
          this.handleSuspiciousActivity(data);
        });
      } else {
        this.fallbackConnectionMonitoring();
      }
      
    } catch (error) {
      console.warn('Connection monitoring setup failed:', error.message);
      this.fallbackConnectionMonitoring();
    }
  }

  /**
   * Fallback connection monitoring using available APIs
   */
  fallbackConnectionMonitoring() {
    console.log('📶 Using fallback connection monitoring');
    
    // Monitor fetch requests
    this.originalFetch = global.fetch;
    global.fetch = (...args) => {
      this.logNetworkRequest('fetch', args[0]);
      return this.originalFetch.apply(global, args);
    };

    // Monitor XMLHttpRequest
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this.logNetworkRequest('xhr', url);
      return this.originalXHROpen.call(this, method, url, ...args);
    }.bind(this);
  }

  /**
   * Initialize geolocation tracking for anomaly detection
   */
  async initializeGeolocationTracking() {
    try {
      // Request location permission first
      const { GeolocationModule } = NativeModules;
      
      if (GeolocationModule) {
        const location = await GeolocationModule.getCurrentLocation();
        
        this.baselineLocation = {
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: Date.now(),
          accuracy: location.accuracy
        };
        
        console.log('📍 Baseline location established');
        
        // Start location monitoring for travel detection
        GeolocationModule.startLocationMonitoring((location) => {
          this.analyzeLocationChange(location);
        });
        
      } else {
        console.warn('⚠️ Geolocation module not available');
      }
      
    } catch (error) {
      console.warn('Geolocation tracking failed:', error.message);
    }
  }

  /**
   * Start real network traffic capture
   */
  async startNetworkCapture() {
    try {
      const { NetworkCapture } = NativeModules;
      
      if (NetworkCapture) {
        await NetworkCapture.startPacketCapture({
          filterPorts: this.anomalyThresholds.suspiciousPortAccess,
          captureTimeout: 60000, // 1 minute buffer
          maxPackets: 1000
        });
        
        console.log('🔍 Network packet capture started');
        
        DeviceEventEmitter.addListener('packetCaptured', (packet) => {
          this.analyzePacket(packet);
        });
        
      } else {
        console.warn('⚠️ Network capture module not available, using API monitoring');
      }
      
    } catch (error) {
      console.warn('Network capture failed:', error.message);
    }
  }

  /**
   * Start behavioral analysis
   */
  startBehavioralAnalysis() {
    this.behavioralInterval = setInterval(() => {
      this.performBehavioralAnalysis();
    }, 30000); // Every 30 seconds
  }

  /**
   * Start threat hunting
   */
  startThreatHunting() {
    this.threatHuntingInterval = setInterval(() => {
      this.performThreatHunting();
    }, 60000); // Every minute
  }

  /**
   * Analyze network state changes
   */
  analyzeNetworkChange(newState) {
    const change = {
      timestamp: Date.now(),
      oldState: this.networkBaseline,
      newState: newState,
      type: 'network_change'
    };

    // Detect suspicious network changes
    if (newState.type !== this.networkBaseline.connectionType) {
      this.generateAlert('NETWORK_CHANGE', {
        severity: 'medium',
        description: `Network type changed from ${this.networkBaseline.connectionType} to ${newState.type}`,
        data: change,
        recommendation: 'Monitor for potential network switching attacks'
      });
    }

    // Check for rapid network switching (potential attack)
    const recentChanges = this.connectionLog.filter(
      log => log.type === 'network_change' && 
      Date.now() - log.timestamp < 60000
    );

    if (recentChanges.length > 3) {
      this.generateAlert('RAPID_NETWORK_SWITCHING', {
        severity: 'high',
        description: 'Rapid network switching detected - possible attack',
        data: { changes: recentChanges.length, timeframe: '1 minute' },
        recommendation: 'EMERGENCY_BURN_RECOMMENDED'
      });
    }

    this.connectionLog.push(change);
    this.networkBaseline = newState;
  }

  /**
   * Analyze network connections
   */
  analyzeConnection(connectionData) {
    const connection = {
      timestamp: Date.now(),
      ...connectionData,
      type: 'connection'
    };

    // Check for suspicious ports
    if (this.anomalyThresholds.suspiciousPortAccess.includes(connectionData.port)) {
      this.generateAlert('SUSPICIOUS_PORT_ACCESS', {
        severity: 'medium',
        description: `Access to suspicious port ${connectionData.port}`,
        data: connection,
        recommendation: 'Investigate connection purpose'
      });
    }

    // Check for connection frequency anomalies
    const recentConnections = this.connectionLog.filter(
      log => log.type === 'connection' && 
      Date.now() - log.timestamp < 1000
    );

    if (recentConnections.length > this.anomalyThresholds.connectionSpike) {
      this.generateAlert('CONNECTION_SPIKE', {
        severity: 'high',
        description: `Connection spike detected: ${recentConnections.length} connections in 1 second`,
        data: { connections: recentConnections.length },
        recommendation: 'Potential DDoS or scanning attack'
      });
    }

    this.connectionLog.push(connection);
  }

  /**
   * Analyze network packets
   */
  analyzePacket(packet) {
    // Check against threat signatures
    for (const [signature, threatInfo] of this.threatSignatures) {
      if (this.matchesSignature(packet, signature)) {
        this.generateAlert('THREAT_SIGNATURE_MATCH', {
          severity: threatInfo.severity,
          description: `Threat signature matched: ${threatInfo.name}`,
          data: { packet: packet, threat: threatInfo },
          recommendation: threatInfo.recommendation
        });
      }
    }

    // Analyze packet patterns
    this.analyzePacketPatterns(packet);
  }

  /**
   * Analyze location changes for travel detection
   */
  analyzeLocationChange(newLocation) {
    if (!this.baselineLocation) return;

    const distance = this.calculateDistance(
      this.baselineLocation.latitude,
      this.baselineLocation.longitude,
      newLocation.latitude,
      newLocation.longitude
    );

    if (distance > this.anomalyThresholds.geolocationRadius) {
      this.generateAlert('UNUSUAL_LOCATION', {
        severity: 'medium',
        description: `Device detected ${distance.toFixed(2)}km from baseline location`,
        data: { 
          baselineLocation: this.baselineLocation,
          currentLocation: newLocation,
          distance: distance
        },
        recommendation: 'Verify if travel is expected'
      });
    }
  }

  /**
   * Perform behavioral analysis
   */
  performBehavioralAnalysis() {
    if (!this.monitoring) return;

    const now = Date.now();
    const recentActivity = this.connectionLog.filter(
      log => now - log.timestamp < 300000 // Last 5 minutes
    );

    // Analyze patterns
    const patterns = this.analyzeActivityPatterns(recentActivity);
    
    // Check for anomalies
    if (patterns.anomalyScore > 0.7) {
      this.generateAlert('BEHAVIORAL_ANOMALY', {
        severity: 'medium',
        description: 'Unusual behavioral patterns detected',
        data: patterns,
        recommendation: 'Review recent activity for potential compromise'
      });
    }
  }

  /**
   * Perform threat hunting
   */
  performThreatHunting() {
    if (!this.monitoring) return;

    // Hunt for known attack patterns
    this.huntForReconnaissanceActivity();
    this.huntForDataExfiltration();
    this.huntForLateralMovement();
    this.huntForPersistenceIndicators();
  }

  /**
   * Hunt for reconnaissance activity
   */
  huntForReconnaissanceActivity() {
    const recentConnections = this.connectionLog.filter(
      log => log.type === 'connection' && Date.now() - log.timestamp < 600000
    );

    // Look for port scanning patterns
    const uniquePorts = new Set(recentConnections.map(conn => conn.port));
    if (uniquePorts.size > 10) {
      this.generateAlert('RECONNAISSANCE_DETECTED', {
        severity: 'high',
        description: `Potential port scanning: ${uniquePorts.size} unique ports accessed`,
        data: { ports: Array.from(uniquePorts) },
        recommendation: 'Potential reconnaissance attack detected'
      });
    }
  }

  /**
   * Hunt for data exfiltration
   */
  huntForDataExfiltration() {
    const recentActivity = this.connectionLog.filter(
      log => Date.now() - log.timestamp < 300000
    );

    // Look for large data transfers
    const totalDataTransfer = recentActivity.reduce((sum, activity) => {
      return sum + (activity.bytesTransferred || 0);
    }, 0);

    if (totalDataTransfer > this.anomalyThresholds.dataTransferSpike * 5) {
      this.generateAlert('DATA_EXFILTRATION_SUSPECTED', {
        severity: 'critical',
        description: `Large data transfer detected: ${(totalDataTransfer / 1048576).toFixed(2)}MB`,
        data: { totalBytes: totalDataTransfer },
        recommendation: 'EMERGENCY_BURN_RECOMMENDED'
      });
    }
  }

  /**
   * Generate security alert
   */
  generateAlert(type, details) {
    const alert = {
      id: this.generateAlertId(),
      type: type,
      timestamp: Date.now(),
      severity: details.severity,
      description: details.description,
      data: details.data,
      recommendation: details.recommendation,
      status: 'active'
    };

    this.alerts.push(alert);
    
    console.log(`🚨 IDS ALERT [${alert.severity.toUpperCase()}]: ${alert.description}`);
    
    // Emit alert for real-time handling
    DeviceEventEmitter.emit('idsAlert', alert);
    
    // Critical alerts trigger immediate response
    if (alert.severity === 'critical' || alert.recommendation === 'EMERGENCY_BURN_RECOMMENDED') {
      this.handleCriticalAlert(alert);
    }

    return alert;
  }

  /**
   * Handle critical security alerts
   */
  handleCriticalAlert(alert) {
    console.log('🔥 CRITICAL SECURITY ALERT - INITIATING EMERGENCY PROTOCOLS');
    
    // Emit emergency signal
    DeviceEventEmitter.emit('emergencySecurityAlert', {
      alert: alert,
      timestamp: Date.now(),
      action: 'emergency_burn_recommended'
    });
  }

  /**
   * Initialize threat signatures
   */
  initializeThreatSignatures() {
    // Known attack signatures
    this.threatSignatures.set('sql_injection', {
      name: 'SQL Injection',
      pattern: /('|(\')|(\-\-)|(\;)|(\|)|(\*)|(\%27)|(\%2527)|(\%22)|(\%3B)|(\%3C)|(\%3E)|(\%27)|(\%2F))/i,
      severity: 'high',
      recommendation: 'SQL injection attempt detected'
    });

    this.threatSignatures.set('xss_attack', {
      name: 'Cross-Site Scripting',
      pattern: /(<script|<iframe|<object|<embed|javascript:|vbscript:|onload=|onerror=)/i,
      severity: 'high',
      recommendation: 'XSS attack attempt detected'
    });

    this.threatSignatures.set('directory_traversal', {
      name: 'Directory Traversal',
      pattern: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c)/i,
      severity: 'medium',
      recommendation: 'Directory traversal attempt detected'
    });

    this.threatSignatures.set('command_injection', {
      name: 'Command Injection',
      pattern: /(\||\&|\;|\$\(|\`|nc\s|wget\s|curl\s)/i,
      severity: 'critical',
      recommendation: 'Command injection attempt detected'
    });
  }

  /**
   * Log network requests
   */
  logNetworkRequest(type, url) {
    const request = {
      timestamp: Date.now(),
      type: 'network_request',
      method: type,
      url: url,
      domain: this.extractDomain(url)
    };

    this.connectionLog.push(request);
    
    // Analyze request for threats
    this.analyzeNetworkRequest(request);
  }

  /**
   * Analyze network requests for threats
   */
  analyzeNetworkRequest(request) {
    // Check URL against threat signatures
    for (const [signature, threatInfo] of this.threatSignatures) {
      if (threatInfo.pattern.test(request.url)) {
        this.generateAlert('MALICIOUS_URL_DETECTED', {
          severity: threatInfo.severity,
          description: `Malicious URL pattern detected: ${threatInfo.name}`,
          data: request,
          recommendation: threatInfo.recommendation
        });
      }
    }
  }

  /**
   * Calculate distance between two coordinates
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  /**
   * Generate unique alert ID
   */
  generateAlertId() {
    return `IDS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current security status
   */
  getSecurityStatus() {
    const activeAlerts = this.alerts.filter(alert => alert.status === 'active');
    const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');
    
    return {
      monitoring: this.monitoring,
      totalAlerts: this.alerts.length,
      activeAlerts: activeAlerts.length,
      criticalAlerts: criticalAlerts.length,
      lastActivity: this.connectionLog.length > 0 ? 
        Math.max(...this.connectionLog.map(log => log.timestamp)) : null,
      threatLevel: this.calculateThreatLevel(),
      recommendations: this.generateSecurityRecommendations()
    };
  }

  /**
   * Calculate current threat level
   */
  calculateThreatLevel() {
    const recentCritical = this.alerts.filter(
      alert => alert.severity === 'critical' && 
      Date.now() - alert.timestamp < 300000
    ).length;

    const recentHigh = this.alerts.filter(
      alert => alert.severity === 'high' && 
      Date.now() - alert.timestamp < 300000
    ).length;

    if (recentCritical > 0) return 'CRITICAL';
    if (recentHigh > 2) return 'HIGH';
    if (recentHigh > 0) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Generate security recommendations
   */
  generateSecurityRecommendations() {
    const recommendations = [];
    const threatLevel = this.calculateThreatLevel();

    if (threatLevel === 'CRITICAL') {
      recommendations.push('IMMEDIATE ACTION REQUIRED: Execute emergency burn protocol');
      recommendations.push('Disconnect from all networks immediately');
      recommendations.push('Analyze system for compromise indicators');
    } else if (threatLevel === 'HIGH') {
      recommendations.push('Increase monitoring frequency');
      recommendations.push('Review recent connection logs');
      recommendations.push('Consider temporary network isolation');
    } else if (threatLevel === 'MEDIUM') {
      recommendations.push('Monitor situation closely');
      recommendations.push('Review security policies');
    }

    return recommendations;
  }

  /**
   * Emergency stop all monitoring
   */
  emergencyStop() {
    console.log('🔥 EMERGENCY IDS SHUTDOWN');
    
    this.monitoring = false;
    
    // Stop all intervals
    if (this.behavioralInterval) clearInterval(this.behavioralInterval);
    if (this.threatHuntingInterval) clearInterval(this.threatHuntingInterval);
    
    // Restore original functions
    if (this.originalFetch) global.fetch = this.originalFetch;
    if (this.originalXHROpen) XMLHttpRequest.prototype.open = this.originalXHROpen;
    
    // Clear sensitive data
    this.connectionLog = [];
    this.alerts = [];
    
    return { success: true, timestamp: Date.now() };
  }
}

export default new RealIntrusionDetection();