/**
 * REAL MESSAGE BRIDGE - NO FAKE API CALLS
 * Uses Firebase Realtime Database for actual message storage
 * Implements real encrypted message passing between devices
 */

import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import { Platform } from 'react-native';

class RealMessageBridge {
  constructor() {
    this.initialized = false;
    this.bridgeRef = null;
    this.bridgeExpiration = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Initialize Firebase connection
   */
  async initialize() {
    try {
      // Firebase is already initialized via google-services.json
      // Just check if we're connected
      
      // Sign in anonymously to Firebase
      if (!auth().currentUser) {
        await auth().signInAnonymously();
      }
      
      // Get reference to bridges collection
      this.bridgeRef = database().ref('/bridges');
      
      this.initialized = true;
      
      // Set up auto-cleanup for expired bridges
      this.setupAutoCleanup();
      
    } catch (error) {
      throw new Error(`Failed to initialize Message Bridge: ${error.message}`);
    }
  }

  /**
   * Ensure Firebase is initialized
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Send encrypted message to Firebase
   */
  async sendMessage(ghostCode, encryptedData, metadata = {}) {
    await this.ensureInitialized();
    
    try {
      console.log(`📤 Sending message to Ghost Code: ${ghostCode}`);
      console.log(`📝 Message data:`, encryptedData);
      
      // Validate ghost code format - accept any format for now
      if (!ghostCode || ghostCode.length < 4) {
        throw new Error('Ghost Code must be at least 4 characters');
      }
      
      // Create message object
      const messageData = {
        encryptedData: encryptedData,
        metadata: {
          ...metadata,
          timestamp: Date.now(),
          platform: Platform.OS,
          version: '1.0.0'
        },
        expiresAt: Date.now() + this.bridgeExpiration,
        delivered: false,
        burnAfterReading: true
      };
      
      console.log(`💾 Storing message in Firebase at /bridges/${ghostCode}`);
      
      // Store in Firebase with ghost code as key
      await this.bridgeRef.child(ghostCode).set(messageData);
      
      console.log(`✅ Message sent successfully to ${ghostCode}`);
      
      return {
        success: true,
        ghostCode: ghostCode,
        timestamp: messageData.metadata.timestamp,
        expiresAt: messageData.expiresAt
      };
      
    } catch (error) {
      console.error('❌ Send message error:', error);
      console.error('❌ Error details:', error.stack);
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  /**
   * Retrieve encrypted message from Firebase
   */
  async retrieveMessage(ghostCode) {
    await this.ensureInitialized();
    
    try {
      console.log(`📥 Retrieving message for Ghost Code: ${ghostCode}`);
      
      // Validate ghost code format - accept any format for now
      if (!ghostCode || ghostCode.length < 4) {
        throw new Error('Ghost Code must be at least 4 characters');
      }
      
      console.log(`🔍 Looking for message at /bridges/${ghostCode}`);
      
      // Get message from Firebase
      const snapshot = await this.bridgeRef.child(ghostCode).once('value');
      
      console.log(`📂 Snapshot exists:`, snapshot.exists());
      
      if (!snapshot.exists()) {
        throw new Error('Ghost Code not found or message expired');
      }
      
      const messageData = snapshot.val();
      console.log(`📋 Retrieved message data:`, messageData);
      
      // Check if message expired
      if (Date.now() > messageData.expiresAt) {
        // Delete expired message
        await this.bridgeRef.child(ghostCode).remove();
        throw new Error('Message has expired and been destroyed');
      }
      
      // Mark as delivered and delete if burn after reading
      if (messageData.burnAfterReading) {
        console.log(`🔥 Burning message ${ghostCode} after reading`);
        await this.bridgeRef.child(ghostCode).remove();
      } else {
        await this.bridgeRef.child(ghostCode).update({ delivered: true });
      }
      
      console.log(`✅ Message retrieved successfully for ${ghostCode}`);
      
      return {
        success: true,
        encryptedData: messageData.encryptedData,
        metadata: messageData.metadata,
        burned: messageData.burnAfterReading
      };
      
    } catch (error) {
      console.error('❌ Retrieve message error:', error);
      console.error('❌ Error details:', error.stack);
      throw new Error(`Failed to retrieve message: ${error.message}`);
    }
  }

  /**
   * Check if a Ghost Code exists
   */
  async checkGhostCode(ghostCode) {
    await this.ensureInitialized();
    
    try {
      const snapshot = await this.bridgeRef.child(ghostCode).once('value');
      return snapshot.exists();
    } catch (error) {
      console.error('Check ghost code error:', error);
      return false;
    }
  }

  /**
   * List available Ghost Codes (for testing/admin)
   */
  async listActiveBridges() {
    await this.ensureInitialized();
    
    try {
      const snapshot = await this.bridgeRef.once('value');
      const bridges = snapshot.val() || {};
      
      const activeBridges = [];
      const now = Date.now();
      
      for (const [ghostCode, data] of Object.entries(bridges)) {
        if (data.expiresAt > now) {
          activeBridges.push({
            ghostCode,
            timestamp: data.metadata.timestamp,
            delivered: data.delivered,
            expiresAt: data.expiresAt
          });
        }
      }
      
      return activeBridges;
    } catch (error) {
      console.error('List bridges error:', error);
      return [];
    }
  }

  /**
   * Delete a specific Ghost Code
   */
  async deleteBridge(ghostCode) {
    await this.ensureInitialized();
    
    try {
      await this.bridgeRef.child(ghostCode).remove();
      console.log(`🗑️ Bridge ${ghostCode} deleted`);
      return true;
    } catch (error) {
      console.error('Delete bridge error:', error);
      return false;
    }
  }

  /**
   * Setup automatic cleanup of expired messages
   */
  setupAutoCleanup() {
    setInterval(async () => {
      try {
        await this.cleanupExpiredBridges();
      } catch (error) {
        console.error('Auto-cleanup error:', error);
      }
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Clean up expired messages
   */
  async cleanupExpiredBridges() {
    await this.ensureInitialized();
    
    try {
      console.log('🧹 Cleaning up expired bridges...');
      
      const snapshot = await this.bridgeRef.once('value');
      const bridges = snapshot.val() || {};
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [ghostCode, data] of Object.entries(bridges)) {
        if (data.expiresAt <= now) {
          await this.bridgeRef.child(ghostCode).remove();
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`✅ Cleaned up ${cleanedCount} expired bridges`);
      }
      
      return cleanedCount;
    } catch (error) {
      console.error('Cleanup error:', error);
      return 0;
    }
  }

  /**
   * Validate Ghost Code format
   */
  validateGhostCode(ghostCode) {
    if (!ghostCode || typeof ghostCode !== 'string') {
      return false;
    }
    
    // Accept any alphanumeric code 4+ characters
    return ghostCode.length >= 4 && /^[A-Za-z0-9]+$/.test(ghostCode);
  }

  /**
   * Generate secure Ghost Code
   */
  generateGhostCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'GHOST';
    
    // Use crypto.getRandomValues for secure randomness
    const randomArray = new Uint8Array(4);
    crypto.getRandomValues(randomArray);
    
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(randomArray[i] % chars.length);
    }
    
    return result;
  }

  /**
   * Get Bridge statistics
   */
  async getBridgeStats() {
    await this.ensureInitialized();
    
    try {
      const snapshot = await this.bridgeRef.once('value');
      const bridges = snapshot.val() || {};
      const now = Date.now();
      
      let total = 0;
      let active = 0;
      let delivered = 0;
      let expired = 0;
      
      for (const data of Object.values(bridges)) {
        total++;
        if (data.expiresAt > now) {
          active++;
          if (data.delivered) {
            delivered++;
          }
        } else {
          expired++;
        }
      }
      
      return {
        total,
        active,
        delivered,
        expired,
        timestamp: now
      };
    } catch (error) {
      console.error('Stats error:', error);
      return {
        total: 0,
        active: 0,
        delivered: 0,
        expired: 0,
        error: error.message
      };
    }
  }

  /**
   * Get next consecutive ID using Firebase transaction
   */
  async getNextConsecutiveID() {
    await this.ensureInitialized();
    
    try {
      console.log('🔢 Getting next consecutive ID...');
      
      // Use Firebase transaction to ensure atomic increment
      const counterRef = database().ref('/ghostBridgeIDCounter');
      
      const result = await counterRef.transaction((currentValue) => {
        // If counter doesn't exist, start at 1
        if (currentValue === null) {
          return 1;
        }
        
        // Increment counter
        return currentValue + 1;
      });
      
      if (result.committed) {
        const newID = result.snapshot.val();
        console.log('✅ Assigned consecutive ID:', newID);
        
        return {
          success: true,
          id: newID
        };
      } else {
        throw new Error('Transaction not committed');
      }
      
    } catch (error) {
      console.error('Get consecutive ID error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Emergency burn all bridges
   */
  async emergencyBurnAll() {
    await this.ensureInitialized();
    
    try {
      console.log('🔥 EMERGENCY BURN: Destroying all bridges...');
      
      await this.bridgeRef.remove();
      
      console.log('✅ All bridges destroyed in emergency burn');
      
      return true;
    } catch (error) {
      console.error('Emergency burn error:', error);
      return false;
    }
  }
}

export default new RealMessageBridge();