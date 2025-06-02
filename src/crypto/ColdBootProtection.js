/**
 * Cold Boot Attack Protection
 * Protects against memory extraction attacks when device is physically compromised
 */

import './cryptoPolyfill';
import { NativeModules, Platform, AppState, DeviceEventEmitter } from 'react-native';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

class ColdBootProtection {
  constructor() {
    this.protectionActive = false;
    this.memoryScrambler = null;
    this.keyFragments = new Map();
    this.decoyData = [];
    this.scrambleInterval = null;
    this.temperatureMonitor = null;
    this.lastActivityTime = Date.now();
    
    // Protection parameters
    this.config = {
      scrambleFrequency: 100, // ms
      decoyDataSize: 1024 * 1024, // 1MB of decoy data
      fragmentCount: 5, // Split keys into 5 fragments
      temperatureThreshold: 10, // Celsius - detect rapid cooling
      inactivityTimeout: 30000, // 30 seconds
      memoryWipePatterns: 7 // Number of overwrite patterns
    };
    
    this.initialize();
  }

  /**
   * Initialize cold boot protection
   */
  async initialize() {
    try {
      // Start memory scrambling
      this.startMemoryScrambling();
      
      // Initialize REAL temperature monitoring
      await this.initializeRealTemperatureMonitor();
      
      // Setup app state monitoring
      this.setupAppStateMonitoring();
      
      // Generate decoy data
      this.generateDecoyData();
      
      // Setup device lock monitoring
      this.setupDeviceLockMonitoring();
      
      console.log('🧊 Cold boot protection initialized');
      this.protectionActive = true;
      
    } catch (error) {
      console.error('Cold boot protection initialization failed:', error);
    }
  }

  /**
   * Initialize REAL temperature monitoring with hardware sensor
   */
  async initializeRealTemperatureMonitor() {
    try {
      const { RealTemperatureSensor } = NativeModules;
      
      if (!RealTemperatureSensor) {
        console.warn('⚠️ Real temperature sensor module not available - Cold boot protection limited');
        this.temperatureMonitor = null;
        return;
      }
      
      // Check if REAL hardware temperature sensor is available
      const sensorInfo = await RealTemperatureSensor.isTemperatureSensorAvailable();
      
      if (!sensorInfo.available) {
        console.warn('⚠️ No hardware temperature sensor found - Cold boot protection limited');
        this.temperatureMonitor = null;
        return;
      }
      
      console.log(`🌡️ REAL temperature sensor detected: ${sensorInfo.sensorName} (${sensorInfo.vendor})`);
      
      this.temperatureMonitor = {
        available: true,
        sensorInfo,
        getCurrentTemperature: async () => {
          const result = await RealTemperatureSensor.getCurrentTemperature();
          if (!result.available) {
            throw new Error('Temperature sensor not providing data');
          }
          return {
            temperature: result.temperature,
            baseline: result.baseline,
            delta: result.delta,
            timestamp: Date.now()
          };
        },
        startMonitoring: async () => {
          await RealTemperatureSensor.startTemperatureMonitoring();
          console.log('🌡️ REAL temperature monitoring started');
          
          // Set up real-time monitoring
          this.setupRealTimeTemperatureAlerts();
        },
        stopMonitoring: async () => {
          await RealTemperatureSensor.stopTemperatureMonitoring();
          console.log('🌡️ REAL temperature monitoring stopped');
        },
        performColdBootDetection: async () => {
          return await RealTemperatureSensor.performColdBootDetection();
        }
      };
      
      // Start monitoring immediately
      await this.temperatureMonitor.startMonitoring();
      
    } catch (error) {
      console.error('💀 REAL temperature monitoring initialization failed:', error.message);
      this.temperatureMonitor = null;
    }
  }

  /**
   * Setup real-time temperature alerts
   */
  setupRealTimeTemperatureAlerts() {
    // Listen for temperature readings
    DeviceEventEmitter.addListener('temperatureReading', (data) => {
      if (data.coldBootAlert) {
        console.log('🚨 COLD BOOT ATTACK DETECTED - Temperature drop detected!');
        this.triggerEmergencyBurn('cold_boot_temperature_drop');
      }
    });
    
    // Listen for cold boot threat detection
    DeviceEventEmitter.addListener('coldBootThreatDetected', (data) => {
      console.log('🚨 COLD BOOT THREAT DETECTED:', data);
      if (data.recommendation === 'EMERGENCY_BURN_RECOMMENDED') {
        this.triggerEmergencyBurn('cold_boot_threat_analysis');
      }
    });
  }

  /**
   * Perform REAL cold boot detection analysis
   */
  async performColdBootDetection() {
    if (!this.temperatureMonitor || !this.temperatureMonitor.available) {
      return {
        available: false,
        error: 'No hardware temperature sensor available',
        recommendation: 'upgrade_hardware'
      };
    }
    
    try {
      const detection = await this.temperatureMonitor.performColdBootDetection();
      
      if (detection.coldBootSuspected || detection.rapidCooling) {
        console.log('🚨 COLD BOOT ATTACK ANALYSIS:', detection);
      }
      
      return detection;
      
    } catch (error) {
      console.error('💀 Cold boot detection failed:', error.message);
      return {
        available: false,
        error: error.message,
        recommendation: 'sensor_error'
      };
    }
  }

  /**
   * Start continuous memory scrambling
   */
  startMemoryScrambling() {
    this.memoryScrambler = {
      activeKeys: new Map(),
      scramblerKey: nacl.randomBytes(32),
      iteration: 0
    };

    this.scrambleInterval = setInterval(() => {
      this.scrambleMemory();
    }, this.config.scrambleFrequency);
  }

  /**
   * Scramble sensitive data in memory
   */
  scrambleMemory() {
    try {
      // Increment iteration
      this.memoryScrambler.iteration++;
      
      // Re-encrypt all active keys with new scrambler key
      this.memoryScrambler.activeKeys.forEach((encryptedData, keyId) => {
        // Decrypt with old key
        const oldKey = this.deriveScrambleKey(this.memoryScrambler.iteration - 1);
        const decrypted = this.decryptWithKey(encryptedData, oldKey);
        
        if (decrypted) {
          // Re-encrypt with new key
          const newKey = this.deriveScrambleKey(this.memoryScrambler.iteration);
          const reEncrypted = this.encryptWithKey(decrypted, newKey);
          
          // Update stored data
          this.memoryScrambler.activeKeys.set(keyId, reEncrypted);
          
          // Secure wipe old data
          this.secureWipeMemory(encryptedData);
        }
      });
      
      // Rotate scrambler key
      this.rotateScrambleKey();
      
      // Shuffle decoy data
      this.shuffleDecoyData();
      
    } catch (error) {
      console.error('Memory scrambling error:', error);
    }
  }

  /**
   * Trigger emergency memory burn
   */
  async triggerEmergencyBurn(reason = 'unknown') {
    console.log(`🔥 EMERGENCY BURN TRIGGERED - Reason: ${reason}`);
    
    try {
      // Stop all monitoring
      if (this.temperatureMonitor && this.temperatureMonitor.available) {
        await this.temperatureMonitor.stopMonitoring();
      }
      
      // Clear all sensitive data
      this.secureWipeAllMemory();
      
      // Clear key fragments
      this.keyFragments.clear();
      
      // Stop scrambling
      if (this.scrambleInterval) {
        clearInterval(this.scrambleInterval);
        this.scrambleInterval = null;
      }
      
      // Clear decoy data
      this.decoyData = [];
      
      // Mark protection as inactive
      this.protectionActive = false;
      
      console.log('🔥 Emergency burn completed');
      
    } catch (error) {
      console.error('Emergency burn failed:', error);
    }
  }

  /**
   * Secure wipe all memory
   */
  secureWipeAllMemory() {
    // Multiple pass wipe
    for (let pass = 0; pass < this.config.memoryWipePatterns; pass++) {
      this.memoryScrambler.activeKeys.forEach((data, key) => {
        this.secureWipeMemory(data);
      });
    }
    
    // Clear the map
    this.memoryScrambler.activeKeys.clear();
    
    // Wipe scrambler key
    if (this.memoryScrambler.scramblerKey) {
      this.secureWipeMemory(this.memoryScrambler.scramblerKey);
      this.memoryScrambler.scramblerKey = null;
    }
  }

  /**
   * Secure memory wipe (limited in JavaScript)
   */
  secureWipeMemory(data) {
    if (data instanceof Uint8Array) {
      // Overwrite with random data multiple times
      for (let pass = 0; pass < 3; pass++) {
        crypto.getRandomValues(data);
      }
      // Final zero pass
      data.fill(0);
    }
  }

  /**
   * Generate decoy data
   */
  generateDecoyData() {
    this.decoyData = [];
    const chunkSize = 1024; // 1KB chunks
    const numChunks = this.config.decoyDataSize / chunkSize;
    
    for (let i = 0; i < numChunks; i++) {
      const chunk = nacl.randomBytes(chunkSize);
      this.decoyData.push(chunk);
    }
    
    console.log(`🎭 Generated ${this.decoyData.length} decoy data chunks`);
  }

  /**
   * Shuffle decoy data
   */
  shuffleDecoyData() {
    if (this.decoyData.length > 0) {
      // Fisher-Yates shuffle
      for (let i = this.decoyData.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.decoyData[i], this.decoyData[j]] = [this.decoyData[j], this.decoyData[i]];
      }
      
      // Replace some chunks with new random data
      const replaceCount = Math.floor(this.decoyData.length * 0.1);
      for (let i = 0; i < replaceCount; i++) {
        const index = Math.floor(Math.random() * this.decoyData.length);
        this.decoyData[index] = nacl.randomBytes(1024);
      }
    }
  }

  /**
   * Setup app state monitoring
   */
  setupAppStateMonitoring() {
    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App going to background - potential attack vector
        this.lastActivityTime = Date.now();
        console.log('📱 App backgrounded - increasing protection level');
        
        // Trigger immediate scramble
        this.scrambleMemory();
      }
    });
  }

  /**
   * Setup device lock monitoring
   */
  setupDeviceLockMonitoring() {
    // This would require additional native modules for device lock detection
    console.log('🔒 Device lock monitoring setup (requires native implementation)');
  }

  /**
   * Derive scramble key for iteration
   */
  deriveScrambleKey(iteration) {
    const salt = Buffer.concat([
      Buffer.from('coldboot-protection'),
      Buffer.from(iteration.toString())
    ]);
    
    const crypto = require('react-native-crypto');
    return crypto.pbkdf2Sync(
      this.memoryScrambler.scramblerKey,
      salt,
      1000,
      32,
      'sha256'
    );
  }

  /**
   * Rotate the main scrambler key
   */
  rotateScrambleKey() {
    const oldKey = this.memoryScrambler.scramblerKey;
    this.memoryScrambler.scramblerKey = nacl.randomBytes(32);
    
    // XOR with old key for continuity
    for (let i = 0; i < 32; i++) {
      this.memoryScrambler.scramblerKey[i] ^= oldKey[i];
    }
    
    // Secure wipe old key
    this.secureWipeMemory(oldKey);
  }

  /**
   * Encrypt data with key
   */
  encryptWithKey(data, key) {
    const nonce = nacl.randomBytes(24);
    const encrypted = nacl.secretbox(Buffer.from(data), nonce, key);
    return Buffer.concat([nonce, encrypted]);
  }

  /**
   * Decrypt data with key
   */
  decryptWithKey(encryptedData, key) {
    if (encryptedData.length < 24) return null;
    
    const nonce = encryptedData.slice(0, 24);
    const ciphertext = encryptedData.slice(24);
    
    return nacl.secretbox.open(ciphertext, nonce, key);
  }

  /**
   * Get protection status
   */
  getStatus() {
    return {
      active: this.protectionActive,
      temperatureMonitor: this.temperatureMonitor ? {
        available: this.temperatureMonitor.available,
        sensorName: this.temperatureMonitor.sensorInfo?.sensorName || 'Unknown'
      } : null,
      memoryScrambler: this.memoryScrambler ? {
        iteration: this.memoryScrambler.iteration,
        activeKeys: this.memoryScrambler.activeKeys.size
      } : null,
      decoyDataChunks: this.decoyData.length,
      lastActivity: this.lastActivityTime
    };
  }

  /**
   * Emergency destroy
   */
  destroy() {
    this.triggerEmergencyBurn('manual_destroy');
  }
}

export default ColdBootProtection;