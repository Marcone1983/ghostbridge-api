/**
 * FIREBASE BEACON IMPLEMENTATION
 * Real-time mesh network discovery using Firebase Realtime Database
 * Integrates with existing Firebase config (google-services.json)
 */

import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import { DeviceInfo } from 'react-native-device-info';
import quantumGravityEngine from '../physics/QuantumGravityEngine';

class FirebaseBeacon {
  constructor() {
    this.nodeId = null;
    this.beaconRef = null;
    this.nodesRef = null;
    this.isActive = false;
    this.lastBeaconUpdate = 0;
    this.discoveredNodes = new Map();
    this.energyLevel = 0;
    this.lastTransition = 0;
    this.COOLDOWN_MS = 1000; // 1 second cooldown for quantum transitions
    
    // Performance optimization
    this.beaconInterval = null;
    this.updateFrequency = 30000; // 30s normal, 500ms quantum mode
    
    this.metrics = {
      beaconsReceived: 0,
      nodesDiscovered: 0,
      quantumTransitions: 0,
      firebaseErrors: 0
    };
  }

  /**
   * Initialize Firebase beacon system
   */
  async initialize(nodeId) {
    try {
      console.log('🔥 Initializing Firebase beacon system...');
      
      this.nodeId = nodeId;
      
      // Ensure Firebase auth (anonymous if needed)
      if (!auth().currentUser) {
        await auth().signInAnonymously();
      }
      
      // Setup database references
      this.nodesRef = database().ref('/quantum_mesh_beacons');
      this.beaconRef = this.nodesRef.child(this.nodeId);
      
      // Start beacon broadcasting
      await this.startBeaconBroadcast();
      
      // Listen for other nodes
      await this.startNodeDiscovery();
      
      this.isActive = true;
      console.log('✅ Firebase beacon system initialized');
      
      return { success: true, nodeId: this.nodeId };
      
    } catch (error) {
      this.metrics.firebaseErrors++;
      console.error('Firebase beacon initialization failed:', error.message);
      throw new Error(`Firebase beacon init failed: ${error.message}`);
    }
  }

  /**
   * Start broadcasting beacon with quantum state
   */
  async startBeaconBroadcast() {
    const broadcastBeacon = async () => {
      try {
        if (!this.isActive) return;
        
        // Get current system energy for G calculation
        const systemEnergy = await this.calculateNodeEnergy();
        const G_eff = quantumGravityEngine.calculateEffectiveG(systemEnergy);
        const isQuantumMode = quantumGravityEngine.isQuantumMode(G_eff);
        
        // Check cooldown for quantum transitions
        const now = Date.now();
        const wasQuantum = this.energyLevel > 950; // Previous quantum state
        if (wasQuantum && !isQuantumMode && (now - this.lastTransition) < this.COOLDOWN_MS) {
          // Force quantum mode to prevent oscillation
          isQuantumMode = true;
          console.log(`🔄 Cooldown active for ${this.nodeId}, maintaining quantum mode`);
        }
        
        if (wasQuantum !== isQuantumMode) {
          this.lastTransition = now;
          this.metrics.quantumTransitions++;
        }
        
        this.energyLevel = systemEnergy;
        
        const beaconData = {
          nodeId: this.nodeId,
          timestamp: now,
          lastSeen: now,
          capabilities: ['QUANTUM_MESH', 'KYBER768', 'DILITHIUM3', 'G_NULLIFICATION'],
          status: 'ACTIVE',
          quantumState: {
            energy: systemEnergy,
            G_eff: G_eff,
            isQuantumMode: isQuantumMode,
            canTeleport: isQuantumMode,
            routing: isQuantumMode ? 'QUANTUM_TELEPORT' : 'CLASSICAL'
          },
          deviceInfo: await this.getDeviceInfo(),
          version: '1.0.0-quantum'
        };
        
        // Set beacon with TTL (auto-cleanup)
        await this.beaconRef.set(beaconData);
        await this.beaconRef.onDisconnect().remove();
        
        this.lastBeaconUpdate = now;
        
        // Adjust frequency based on quantum mode
        if (isQuantumMode) {
          this.updateFrequency = 500; // 500ms in quantum mode
          console.log(`⚛️ ${this.nodeId} in QUANTUM MODE - high frequency beacon`);
        } else {
          this.updateFrequency = 30000; // 30s in classical mode
        }
        
      } catch (error) {
        this.metrics.firebaseErrors++;
        console.error('Beacon broadcast failed:', error.message);
      }
    };
    
    // Initial broadcast
    await broadcastBeacon();
    
    // Schedule periodic broadcasts
    this.beaconInterval = setInterval(broadcastBeacon, this.updateFrequency);
  }

  /**
   * Listen for other nodes in the mesh
   */
  async startNodeDiscovery() {
    try {
      this.nodesRef.on('child_added', (snapshot) => {
        this.handleNodeDiscovered(snapshot);
      });
      
      this.nodesRef.on('child_changed', (snapshot) => {
        this.handleNodeUpdated(snapshot);
      });
      
      this.nodesRef.on('child_removed', (snapshot) => {
        this.handleNodeRemoved(snapshot);
      });
      
      console.log('👂 Firebase node discovery active');
      
    } catch (error) {
      this.metrics.firebaseErrors++;
      console.error('Node discovery setup failed:', error.message);
    }
  }

  /**
   * Handle new node discovered
   */
  handleNodeDiscovered(snapshot) {
    try {
      const nodeData = snapshot.val();
      const discoveredNodeId = snapshot.key;
      
      if (discoveredNodeId === this.nodeId) return; // Ignore self
      
      console.log(`🔍 Discovered node: ${discoveredNodeId}`);
      
      // Validate node data
      if (this.validateNodeData(nodeData)) {
        this.discoveredNodes.set(discoveredNodeId, {
          ...nodeData,
          discoveredAt: Date.now(),
          isQuantum: nodeData.quantumState?.isQuantumMode || false
        });
        
        this.metrics.nodesDiscovered++;
        this.metrics.beaconsReceived++;
        
        // Notify mesh network
        this.notifyMeshNetwork('NODE_DISCOVERED', discoveredNodeId, nodeData);
        
        // Log quantum nodes specially
        if (nodeData.quantumState?.isQuantumMode) {
          console.log(`⚛️ Quantum node discovered: ${discoveredNodeId} (E=${nodeData.quantumState.energy})`);
        }
      }
      
    } catch (error) {
      console.error('Failed to handle discovered node:', error.message);
    }
  }

  /**
   * Handle node update
   */
  handleNodeUpdated(snapshot) {
    try {
      const nodeData = snapshot.val();
      const nodeId = snapshot.key;
      
      if (nodeId === this.nodeId) return;
      
      if (this.discoveredNodes.has(nodeId)) {
        const oldData = this.discoveredNodes.get(nodeId);
        const wasQuantum = oldData.isQuantum;
        const isQuantum = nodeData.quantumState?.isQuantumMode || false;
        
        // Log quantum transitions
        if (wasQuantum !== isQuantum) {
          const transition = isQuantum ? 'classical→quantum' : 'quantum→classical';
          console.log(`🔄 Node ${nodeId} transition: ${transition}`);
        }
        
        this.discoveredNodes.set(nodeId, {
          ...nodeData,
          discoveredAt: oldData.discoveredAt,
          lastUpdated: Date.now(),
          isQuantum: isQuantum
        });
        
        this.notifyMeshNetwork('NODE_UPDATED', nodeId, nodeData);
      }
      
    } catch (error) {
      console.error('Failed to handle node update:', error.message);
    }
  }

  /**
   * Handle node removal
   */
  handleNodeRemoved(snapshot) {
    try {
      const nodeId = snapshot.key;
      
      if (this.discoveredNodes.has(nodeId)) {
        console.log(`📡 Node disconnected: ${nodeId}`);
        this.discoveredNodes.delete(nodeId);
        this.notifyMeshNetwork('NODE_REMOVED', nodeId, null);
      }
      
    } catch (error) {
      console.error('Failed to handle node removal:', error.message);
    }
  }

  /**
   * Calculate current node energy for G calculation
   */
  async calculateNodeEnergy() {
    try {
      // Combine multiple energy sources for realistic calculation
      const cpuUsage = await this.getCPUUsage();
      const batteryDrain = await this.getBatteryDrain();
      const networkLoad = await this.getNetworkLoad();
      const threatLevel = await this.getThreatLevel();
      
      // Weighted energy calculation (scale 0-1000 for "playable" range)
      const energy = (
        cpuUsage * 300 +        // CPU contributes up to 300
        batteryDrain * 200 +    // Battery drain up to 200
        networkLoad * 300 +     // Network load up to 300
        threatLevel * 200       // Threat level up to 200
      );
      
      return Math.min(1000, energy); // Cap at 1000 (E_planck equivalent)
      
    } catch (error) {
      console.error('Energy calculation failed:', error.message);
      return 100; // Default low energy
    }
  }

  /**
   * Validate node data integrity
   */
  validateNodeData(nodeData) {
    if (!nodeData || !nodeData.nodeId || !nodeData.timestamp) {
      return false;
    }
    
    // Check if beacon is too old (>5 minutes)
    const age = Date.now() - nodeData.timestamp;
    if (age > 300000) {
      return false;
    }
    
    // Validate capabilities
    if (!nodeData.capabilities || !Array.isArray(nodeData.capabilities)) {
      return false;
    }
    
    return true;
  }

  /**
   * Get device information for beacon
   */
  async getDeviceInfo() {
    try {
      return {
        model: await DeviceInfo.getModel(),
        platform: await DeviceInfo.getSystemName(),
        version: await DeviceInfo.getSystemVersion(),
        appVersion: await DeviceInfo.getVersion()
      };
    } catch (error) {
      return { model: 'unknown', platform: 'unknown' };
    }
  }

  /**
   * Notify mesh network of node changes
   */
  notifyMeshNetwork(event, nodeId, nodeData) {
    // This would integrate with QuantumMeshNetwork
    // For now, we'll emit a custom event
    const eventData = {
      type: 'FIREBASE_BEACON_EVENT',
      event,
      nodeId,
      nodeData,
      timestamp: Date.now()
    };
    
    // Could use DeviceEventEmitter here for React Native
    console.log(`📢 Mesh event: ${event} for ${nodeId}`);
  }

  /**
   * Get current discovered nodes
   */
  getDiscoveredNodes() {
    return Array.from(this.discoveredNodes.entries()).map(([nodeId, data]) => ({
      nodeId,
      ...data
    }));
  }

  /**
   * Get quantum nodes only
   */
  getQuantumNodes() {
    return this.getDiscoveredNodes().filter(node => node.isQuantum);
  }

  /**
   * Get beacon metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      discoveredNodes: this.discoveredNodes.size,
      quantumNodes: this.getQuantumNodes().length,
      isActive: this.isActive,
      currentEnergy: this.energyLevel,
      updateFrequency: this.updateFrequency
    };
  }

  /**
   * Cleanup and disconnect
   */
  async disconnect() {
    try {
      this.isActive = false;
      
      if (this.beaconInterval) {
        clearInterval(this.beaconInterval);
      }
      
      if (this.beaconRef) {
        await this.beaconRef.remove();
        this.beaconRef.off();
      }
      
      if (this.nodesRef) {
        this.nodesRef.off();
      }
      
      console.log('🔥 Firebase beacon disconnected');
      
    } catch (error) {
      console.error('Firebase beacon disconnect failed:', error.message);
    }
  }

  // Helper methods for energy calculation
  async getCPUUsage() {
    // Would use native module in production
    return Math.random() * 0.8; // 0-80%
  }

  async getBatteryDrain() {
    // Would use battery info in production
    return Math.random() * 0.3; // 0-30%
  }

  async getNetworkLoad() {
    // Would measure actual network usage
    return Math.random() * 0.5; // 0-50%
  }

  async getThreatLevel() {
    // Would integrate with AdaptiveThreatIntelligence
    return Math.random() * 0.2; // 0-20%
  }
}

export default FirebaseBeacon;