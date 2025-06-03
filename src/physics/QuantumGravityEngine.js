/**
 * QUANTUM GRAVITY ENGINE - G→0_P Implementation
 * Revolutionary gravity nullification at quantum scales
 * Controls mesh routing, protocol TTL, and threat response
 * 
 * G = G₀ * e^(-E/E_P)
 * When E → E_P, G → 0 (gravity disappears)
 */

import LRUCache from '../utils/LRUCache';

class QuantumGravityEngine {
  constructor() {
    // Physical constants (normalized)
    this.G0 = 1.0; // Base gravitational constant
    this.E_PLANCK = 1.0; // Planck energy (normalized)
    
    // System energy components weights (α, β, γ from the paper)
    this.WEIGHTS = {
      TRAFFIC_PRESSURE: 0.4,  // α - Network load
      CPU_LOAD: 0.3,         // β - Computational stress  
      THREAT_LEVEL: 0.3      // γ - Security threats
    };
    
    // Thresholds
    this.QUANTUM_MODE_THRESHOLD = 1e-4; // When G_eff < this, enter quantum mode
    this.MIN_G = 1e-10; // Minimum G to avoid singularities
    
    // LRU Cache for exp() calculations (256 entries as specified)
    this._expCache = new LRUCache(256);
    
    // Metrics
    this.metrics = {
      totalCalculations: 0,
      quantumModeActivations: 0,
      averageEnergy: 0,
      maxEnergyObserved: 0
    };
  }

  /**
   * Calculate effective gravitational constant based on system energy
   * G_eff = G₀ * e^(-E/E_P)
   * Uses LRU cache for exp() calculations
   */
  calculateEffectiveG(energy) {
    // Normalize energy to [0, 1+]
    const normalizedEnergy = Math.max(0, energy);
    
    // Round to 3 decimal places for cache key
    const cacheKey = Math.round(normalizedEnergy * 1000) / 1000;
    
    // Check LRU cache first
    const cachedValue = this._expCache.get(cacheKey);
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    // Calculate G_eff = G₀ * e^(-E/E_P)
    const exponent = -normalizedEnergy / this.E_PLANCK;
    const G_eff = this.G0 * Math.exp(exponent);
    
    // Apply minimum threshold
    const result = Math.max(this.MIN_G, G_eff);
    
    // Update LRU cache
    this._expCache.set(cacheKey, result);
    
    // Update metrics
    this.metrics.totalCalculations++;
    this.metrics.maxEnergyObserved = Math.max(this.metrics.maxEnergyObserved, normalizedEnergy);
    
    return result;
  }

  /**
   * Compute system energy from multiple sources
   */
  computeSystemEnergy(params = {}) {
    const {
      packetsPerSecond = 0,
      cpuLoad = 0,          // 0-1
      batteryDrain = 0,     // 0-1
      threatScore = 0,      // 0-1
      activeConnections = 0,
      memoryPressure = 0    // 0-1
    } = params;
    
    // Normalize traffic pressure (assume 10k pps = energy 1.0)
    const trafficPressure = packetsPerSecond / 10000;
    
    // Combined computational stress
    const computationalStress = (cpuLoad + batteryDrain + memoryPressure) / 3;
    
    // Calculate weighted energy
    const energy = 
      this.WEIGHTS.TRAFFIC_PRESSURE * trafficPressure +
      this.WEIGHTS.CPU_LOAD * computationalStress +
      this.WEIGHTS.THREAT_LEVEL * threatScore;
    
    // Add connection pressure (logarithmic)
    const connectionPressure = Math.log10(1 + activeConnections) / 4;
    
    const totalEnergy = energy + connectionPressure * 0.1;
    
    // Update running average
    this.metrics.averageEnergy = 
      (this.metrics.averageEnergy * 0.95) + (totalEnergy * 0.05);
    
    return totalEnergy;
  }

  /**
   * Check if system is in quantum mode (G ≈ 0)
   */
  isQuantumMode(G_eff) {
    const isQuantum = G_eff < this.QUANTUM_MODE_THRESHOLD;
    if (isQuantum) {
      this.metrics.quantumModeActivations++;
    }
    return isQuantum;
  }

  /**
   * Calculate routing weight modifier based on gravity
   * Low G = fast routing (near teleportation)
   * High G = normal routing
   */
  getRoutingWeightModifier(G_eff) {
    if (this.isQuantumMode(G_eff)) {
      return 0.001; // Near-instant routing (teleportation)
    }
    
    // Smooth scaling: as G decreases, routing gets faster
    return Math.pow(G_eff, 0.5);
  }

  /**
   * Calculate protocol TTL scaling based on gravity
   * Low G = short TTL (protocols evaporate quickly)
   * High G = normal TTL
   */
  getProtocolTTLScaling(G_eff) {
    if (this.isQuantumMode(G_eff)) {
      return 0.01; // 1% of normal TTL (evaporate in milliseconds)
    }
    
    // Ensure minimum TTL of 1% even at high gravity
    return Math.max(0.01, G_eff);
  }

  /**
   * Calculate threat intelligence sync frequency based on gravity
   * Low G = high frequency (faster learning)
   * High G = normal frequency
   */
  getThreatSyncFrequency(G_eff, baseFrequencyMs = 300000) {
    if (this.isQuantumMode(G_eff)) {
      return 1000; // Sync every second in quantum mode
    }
    
    // Inverse relationship: lower G = higher frequency
    const scaling = Math.max(0.01, G_eff);
    return Math.round(baseFrequencyMs * scaling);
  }

  /**
   * Determine if a node should be isolated based on its local gravity
   * Nodes with extremely low G are automatically isolated
   */
  shouldIsolateNode(nodeEnergy) {
    const G_eff = this.calculateEffectiveG(nodeEnergy);
    
    // If gravity is essentially zero, isolate the node
    return G_eff < this.MIN_G * 10;
  }

  /**
   * Get comprehensive quantum state for a given energy level
   */
  getQuantumState(energy) {
    const G_eff = this.calculateEffectiveG(energy);
    const isQuantum = this.isQuantumMode(G_eff);
    
    return {
      energy,
      G_eff,
      isQuantumMode: isQuantum,
      routingWeight: this.getRoutingWeightModifier(G_eff),
      protocolTTL: this.getProtocolTTLScaling(G_eff),
      syncFrequency: this.getThreatSyncFrequency(G_eff),
      effects: {
        teleportation: isQuantum,
        instantEvaporation: isQuantum,
        temporalSync: isQuantum,
        masslessRouting: G_eff < 0.01,
        acceleratedLearning: G_eff < 0.1
      }
    };
  }

  /**
   * Anti-flood stabilizer using gravity
   * High traffic → high energy → low gravity → expensive routing
   */
  calculateFloodPenalty(packetsPerSecond, sourceNode) {
    const energy = this.computeSystemEnergy({ packetsPerSecond });
    const G_eff = this.calculateEffectiveG(energy);
    
    // As gravity decreases, penalty increases exponentially
    const penalty = 1 / (G_eff + this.MIN_G);
    
    return {
      shouldThrottle: penalty > 1000,
      routingPenalty: penalty,
      suggestedDelay: Math.round(penalty * 10) // ms
    };
  }

  /**
   * Get real-time metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this._expCache.size,
      quantumModePercentage: 
        (this.metrics.quantumModeActivations / this.metrics.totalCalculations) * 100
    };
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache() {
    this._expCache.clear();
    this._lastComputeTime = 0;
  }
}

// Singleton instance
const quantumGravityEngine = new QuantumGravityEngine();

export default quantumGravityEngine;