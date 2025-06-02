/**
 * SIMPLE MESSAGE BRIDGE - WORKING IMMEDIATELY
 * Uses local storage + simple server for immediate functionality
 * Can be upgraded to real Firebase later
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

class SimpleMessageBridge {
  constructor() {
    this.localMessages = new Map();
    this.serverUrl = 'http://localhost:3000'; // Local server or change to your server
    this.useLocalStorage = true; // Set to false to use server
  }

  /**
   * Generate Ghost Code
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
   * Validate Ghost Code format
   */
  validateGhostCode(ghostCode) {
    if (!ghostCode || typeof ghostCode !== 'string') {
      return false;
    }
    
    const pattern = /^GHOST[A-Z0-9]{4}$/;
    return pattern.test(ghostCode);
  }

  /**
   * Send message - LOCAL STORAGE VERSION
   */
  async sendMessageLocal(ghostCode, encryptedData, metadata = {}) {
    try {
      console.log(`📤 Sending message locally to Ghost Code: ${ghostCode}`);
      
      if (!this.validateGhostCode(ghostCode)) {
        throw new Error('Invalid Ghost Code format');
      }
      
      const messageData = {
        encryptedData: encryptedData,
        metadata: {
          ...metadata,
          timestamp: Date.now(),
          platform: 'local'
        },
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        delivered: false,
        burnAfterReading: true
      };
      
      // Store in AsyncStorage
      await AsyncStorage.setItem(`ghost_${ghostCode}`, JSON.stringify(messageData));
      
      console.log(`✅ Message sent locally to ${ghostCode}`);
      
      return {
        success: true,
        ghostCode: ghostCode,
        timestamp: messageData.metadata.timestamp,
        expiresAt: messageData.expiresAt,
        method: 'local_storage'
      };
      
    } catch (error) {
      console.error('❌ Local send error:', error);
      throw new Error(`Failed to send message locally: ${error.message}`);
    }
  }

  /**
   * Retrieve message - LOCAL STORAGE VERSION
   */
  async retrieveMessageLocal(ghostCode) {
    try {
      console.log(`📥 Retrieving message locally for Ghost Code: ${ghostCode}`);
      
      if (!this.validateGhostCode(ghostCode)) {
        throw new Error('Invalid Ghost Code format');
      }
      
      // Get from AsyncStorage
      const messageDataString = await AsyncStorage.getItem(`ghost_${ghostCode}`);
      
      if (!messageDataString) {
        throw new Error('Ghost Code not found');
      }
      
      const messageData = JSON.parse(messageDataString);
      
      // Check if expired
      if (Date.now() > messageData.expiresAt) {
        await AsyncStorage.removeItem(`ghost_${ghostCode}`);
        throw new Error('Message has expired and been destroyed');
      }
      
      // Mark as delivered and delete if burn after reading
      if (messageData.burnAfterReading) {
        await AsyncStorage.removeItem(`ghost_${ghostCode}`);
        console.log(`🔥 Message ${ghostCode} burned after reading`);
      } else {
        messageData.delivered = true;
        await AsyncStorage.setItem(`ghost_${ghostCode}`, JSON.stringify(messageData));
      }
      
      console.log(`✅ Message retrieved locally for ${ghostCode}`);
      
      return {
        success: true,
        encryptedData: messageData.encryptedData,
        metadata: messageData.metadata,
        burned: messageData.burnAfterReading,
        method: 'local_storage'
      };
      
    } catch (error) {
      console.error('❌ Local retrieve error:', error);
      throw new Error(`Failed to retrieve message locally: ${error.message}`);
    }
  }

  /**
   * Send message - SERVER VERSION (when server is available)
   */
  async sendMessageServer(ghostCode, encryptedData, metadata = {}) {
    try {
      console.log(`📤 Sending message to server for Ghost Code: ${ghostCode}`);
      
      if (!this.validateGhostCode(ghostCode)) {
        throw new Error('Invalid Ghost Code format');
      }
      
      const response = await fetch(`${this.serverUrl}/api/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ghostCode: ghostCode,
          encryptedData: encryptedData,
          metadata: {
            ...metadata,
            timestamp: Date.now()
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const result = await response.json();
      
      console.log(`✅ Message sent to server for ${ghostCode}`);
      
      return {
        success: true,
        ghostCode: ghostCode,
        timestamp: result.timestamp,
        expiresAt: result.expiresAt,
        method: 'server'
      };
      
    } catch (error) {
      console.error('❌ Server send error:', error);
      throw new Error(`Failed to send message to server: ${error.message}`);
    }
  }

  /**
   * Retrieve message - SERVER VERSION
   */
  async retrieveMessageServer(ghostCode) {
    try {
      console.log(`📥 Retrieving message from server for Ghost Code: ${ghostCode}`);
      
      if (!this.validateGhostCode(ghostCode)) {
        throw new Error('Invalid Ghost Code format');
      }
      
      const response = await fetch(`${this.serverUrl}/api/messages/retrieve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ghostCode: ghostCode
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Message not found');
      }
      
      console.log(`✅ Message retrieved from server for ${ghostCode}`);
      
      return {
        success: true,
        encryptedData: result.encryptedData,
        metadata: result.metadata,
        burned: result.burned,
        method: 'server'
      };
      
    } catch (error) {
      console.error('❌ Server retrieve error:', error);
      throw new Error(`Failed to retrieve message from server: ${error.message}`);
    }
  }

  /**
   * Main send method - tries server first, falls back to local
   */
  async sendMessage(ghostCode, encryptedData, metadata = {}) {
    try {
      if (this.useLocalStorage) {
        return await this.sendMessageLocal(ghostCode, encryptedData, metadata);
      } else {
        // Try server first
        try {
          return await this.sendMessageServer(ghostCode, encryptedData, metadata);
        } catch (serverError) {
          console.warn('Server failed, falling back to local storage:', serverError.message);
          return await this.sendMessageLocal(ghostCode, encryptedData, metadata);
        }
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Main retrieve method - tries server first, falls back to local
   */
  async retrieveMessage(ghostCode) {
    try {
      if (this.useLocalStorage) {
        return await this.retrieveMessageLocal(ghostCode);
      } else {
        // Try server first
        try {
          return await this.retrieveMessageServer(ghostCode);
        } catch (serverError) {
          console.warn('Server failed, trying local storage:', serverError.message);
          return await this.retrieveMessageLocal(ghostCode);
        }
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * List all local messages (for debugging)
   */
  async listLocalMessages() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const ghostKeys = keys.filter(key => key.startsWith('ghost_'));
      
      const messages = [];
      for (const key of ghostKeys) {
        const messageDataString = await AsyncStorage.getItem(key);
        if (messageDataString) {
          const messageData = JSON.parse(messageDataString);
          const ghostCode = key.replace('ghost_', '');
          
          // Check if expired
          if (Date.now() <= messageData.expiresAt) {
            messages.push({
              ghostCode,
              timestamp: messageData.metadata.timestamp,
              delivered: messageData.delivered,
              expiresAt: messageData.expiresAt
            });
          } else {
            // Clean up expired message
            await AsyncStorage.removeItem(key);
          }
        }
      }
      
      return messages;
    } catch (error) {
      console.error('List messages error:', error);
      return [];
    }
  }

  /**
   * Clear all local messages
   */
  async clearAllMessages() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const ghostKeys = keys.filter(key => key.startsWith('ghost_'));
      
      await AsyncStorage.multiRemove(ghostKeys);
      
      console.log(`🧹 Cleared ${ghostKeys.length} local messages`);
      
      return ghostKeys.length;
    } catch (error) {
      console.error('Clear messages error:', error);
      return 0;
    }
  }

  /**
   * Initialize - set up local storage or check server
   */
  async initialize() {
    try {
      console.log('📱 Initializing Simple Message Bridge...');
      
      if (this.useLocalStorage) {
        console.log('✅ Using local storage for messages');
        return true;
      } else {
        // Try to ping server
        try {
          const response = await fetch(`${this.serverUrl}/api/health`, {
            method: 'GET',
            timeout: 5000
          });
          
          if (response.ok) {
            console.log('✅ Server is available');
            return true;
          } else {
            console.warn('⚠️ Server not responding, using local storage');
            this.useLocalStorage = true;
            return true;
          }
        } catch (error) {
          console.warn('⚠️ Server not available, using local storage:', error.message);
          this.useLocalStorage = true;
          return true;
        }
      }
    } catch (error) {
      console.error('❌ Initialize error:', error);
      throw error;
    }
  }
}

export default new SimpleMessageBridge();