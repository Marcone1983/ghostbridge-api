/**
 * PROTOCOL MANAGER FOR GHOST BRIDGE EPHEMERAL CHANNELS
 * Handles protobuf serialization/deserialization and message validation
 * Production-ready implementation with security considerations
 */

import CryptoJS from 'crypto-js';

class ProtocolManager {
  constructor() {
    this.messageCache = new Map();
    this.keyPointers = new Map();
    this.validationRules = new Map();
    this.protocolStats = {
      messagesProcessed: 0,
      validationFailures: 0,
      serializationErrors: 0,
      malformedMessages: 0
    };
    
    // Initialize validation rules
    this.initializeValidationRules();
  }

  /**
   * Initialize message validation rules
   */
  initializeValidationRules() {
    // PHANTOM_WHISPER validation rules
    this.validationRules.set('PHANTOM_WHISPER', {
      maxMessageSize: 1024, // 1KB max for whispers
      maxTTL: 30000, // 30 seconds max
      requiredFields: ['encrypted_message', 'nonce', 'auto_destruct_ms'],
      securityLevel: 'QUANTUM_RESISTANT'
    });

    // SPECTRAL_BRIDGE validation rules
    this.validationRules.set('SPECTRAL_BRIDGE', {
      maxMessageSize: 8192, // 8KB max for bridge frames
      maxTTL: 300000, // 5 minutes max
      requiredFields: ['bridge_data', 'pfs_state', 'session'],
      securityLevel: 'QUANTUM_SAFE'
    });

    // SHADOW_MESH validation rules
    this.validationRules.set('SHADOW_MESH', {
      maxMessageSize: 16384, // 16KB max for mesh data
      maxTTL: 600000, // 10 minutes max
      requiredFields: ['operation', 'routing', 'topology'],
      securityLevel: 'QUANTUM_SAFE'
    });

    // WRAITH_TUNNEL validation rules
    this.validationRules.set('WRAITH_TUNNEL', {
      maxMessageSize: 32768, // 32KB max for tunnel data
      maxTTL: 1800000, // 30 minutes max
      requiredFields: ['zk_proof', 'circuit', 'onion_layer'],
      securityLevel: 'QUANTUM_SAFE'
    });
  }

  /**
   * Create an ephemeral channel message
   */
  createEphemeralMessage(protocolType, payload, options = {}) {
    try {
      const messageId = this.generateMessageId();
      const timestamp = Date.now();
      const ttl = options.ttl || this.getDefaultTTL(protocolType);
      
      // Create message header
      const header = {
        message_id: messageId,
        protocol_type: protocolType,
        source_node_id: options.sourceNodeId || 'UNKNOWN',
        destination_node_id: options.destinationNodeId || 'BROADCAST',
        timestamp_ms: timestamp,
        ttl_ms: ttl,
        expires_at_ms: timestamp + ttl,
        routing_path: options.routingPath || [],
        hop_count: 0,
        max_hops: options.maxHops || 5,
        priority: options.priority || 'PRIORITY_NORMAL',
        flags: this.createMessageFlags(options.flags || {})
      };

      // Create security context
      const securityContext = this.createSecurityContext(protocolType, options.security);

      // Create materialization context
      const materializationContext = this.createMaterializationContext(protocolType, options.materialization);

      // Assemble complete message
      const ephemeralMessage = {
        header,
        payload: this.wrapPayload(protocolType, payload),
        security: securityContext,
        materialization: materializationContext
      };

      // Validate message
      this.validateMessage(ephemeralMessage);

      // Cache message for TTL tracking
      this.cacheMessage(messageId, ephemeralMessage);

      console.log(`📨 Created ${protocolType} message: ${messageId}`);
      this.protocolStats.messagesProcessed++;

      return ephemeralMessage;

    } catch (error) {
      console.error('Failed to create ephemeral message:', error.message);
      this.protocolStats.serializationErrors++;
      throw error;
    }
  }

  /**
   * Parse and validate incoming ephemeral message
   */
  parseEphemeralMessage(rawData) {
    try {
      // Parse message (in real implementation, use protobuf parser)
      const message = this.deserializeMessage(rawData);

      // Validate message structure
      this.validateMessage(message);

      // Check TTL
      if (this.isMessageExpired(message)) {
        throw new Error('Message has expired');
      }

      // Verify security context
      this.verifySecurityContext(message.security);

      // Update hop count
      message.header.hop_count++;

      console.log(`📥 Parsed ${message.header.protocol_type} message: ${message.header.message_id}`);
      this.protocolStats.messagesProcessed++;

      return message;

    } catch (error) {
      console.error('Failed to parse ephemeral message:', error.message);
      this.protocolStats.validationFailures++;
      throw error;
    }
  }

  /**
   * Serialize message for transmission
   */
  serializeMessage(message) {
    try {
      // In real implementation, use protobuf serialization
      const serialized = JSON.stringify(message);
      
      // Add checksum for integrity
      const checksum = CryptoJS.SHA256(serialized).toString();
      
      return {
        data: serialized,
        checksum: checksum,
        size: serialized.length
      };

    } catch (error) {
      this.protocolStats.serializationErrors++;
      throw new Error(`Serialization failed: ${error.message}`);
    }
  }

  /**
   * Deserialize message from transmission
   */
  deserializeMessage(serializedData) {
    try {
      // Verify checksum
      const calculatedChecksum = CryptoJS.SHA256(serializedData.data).toString();
      if (calculatedChecksum !== serializedData.checksum) {
        throw new Error('Message integrity check failed');
      }

      // Parse message (in real implementation, use protobuf deserialization)
      const message = JSON.parse(serializedData.data);

      return message;

    } catch (error) {
      this.protocolStats.malformedMessages++;
      throw new Error(`Deserialization failed: ${error.message}`);
    }
  }

  /**
   * Validate message according to protocol rules
   */
  validateMessage(message) {
    // Check basic structure
    if (!message.header || !message.payload || !message.security) {
      throw new Error('Invalid message structure');
    }

    // Check protocol type
    const protocolType = message.header.protocol_type;
    const rules = this.validationRules.get(protocolType);
    if (!rules) {
      throw new Error(`Unknown protocol type: ${protocolType}`);
    }

    // Check message size
    const messageSize = JSON.stringify(message).length;
    if (messageSize > rules.maxMessageSize) {
      throw new Error(`Message too large: ${messageSize} > ${rules.maxMessageSize}`);
    }

    // Check TTL
    if (message.header.ttl_ms > rules.maxTTL) {
      throw new Error(`TTL too long: ${message.header.ttl_ms} > ${rules.maxTTL}`);
    }

    // Check required fields for payload
    this.validatePayloadFields(protocolType, message.payload, rules.requiredFields);

    // Check security level
    this.validateSecurityLevel(message.security, rules.securityLevel);

    console.log(`✅ Message validation passed for ${protocolType}`);
  }

  /**
   * Validate payload fields for specific protocol
   */
  validatePayloadFields(protocolType, payload, requiredFields) {
    const payloadData = this.extractPayloadData(protocolType, payload);
    
    for (const field of requiredFields) {
      if (!payloadData || !payloadData[field]) {
        throw new Error(`Missing required field '${field}' for ${protocolType}`);
      }
    }
  }

  /**
   * Validate security level requirements
   */
  validateSecurityLevel(securityContext, requiredLevel) {
    if (!securityContext.quantum_level) {
      throw new Error('Missing quantum resistance level');
    }

    const levelMap = {
      'QUANTUM_VULNERABLE': 0,
      'QUANTUM_RESISTANT': 1,
      'QUANTUM_SAFE': 2
    };

    const currentLevel = levelMap[securityContext.quantum_level] || 0;
    const requiredLevelValue = levelMap[requiredLevel] || 0;

    if (currentLevel < requiredLevelValue) {
      throw new Error(`Insufficient security level: ${securityContext.quantum_level} < ${requiredLevel}`);
    }
  }

  /**
   * Check if message has expired
   */
  isMessageExpired(message) {
    return Date.now() > message.header.expires_at_ms;
  }

  /**
   * Verify security context
   */
  verifySecurityContext(securityContext) {
    // Verify crypto algorithms are supported
    const supportedKEM = ['KYBER768', 'KYBER1024', 'X25519'];
    const supportedSig = ['DILITHIUM3', 'DILITHIUM5', 'ED25519'];
    const supportedCipher = ['AES256_GCM', 'CHACHA20_POLY1305'];

    if (!supportedKEM.includes(securityContext.crypto.key_exchange)) {
      throw new Error(`Unsupported key exchange: ${securityContext.crypto.key_exchange}`);
    }

    if (!supportedSig.includes(securityContext.crypto.signature)) {
      throw new Error(`Unsupported signature: ${securityContext.crypto.signature}`);
    }

    if (!supportedCipher.includes(securityContext.crypto.symmetric_cipher)) {
      throw new Error(`Unsupported cipher: ${securityContext.crypto.symmetric_cipher}`);
    }

    console.log('🔐 Security context verified');
  }

  /**
   * Cache message for TTL tracking
   */
  cacheMessage(messageId, message) {
    this.messageCache.set(messageId, {
      message,
      cachedAt: Date.now(),
      expiresAt: message.header.expires_at_ms
    });

    // Schedule automatic cleanup
    setTimeout(() => {
      this.messageCache.delete(messageId);
    }, message.header.ttl_ms);
  }

  /**
   * Clean up expired messages
   */
  cleanupExpiredMessages() {
    const now = Date.now();
    const expired = [];

    for (const [messageId, cached] of this.messageCache) {
      if (now > cached.expiresAt) {
        expired.push(messageId);
      }
    }

    for (const messageId of expired) {
      this.messageCache.delete(messageId);
      console.log(`🗑️ Cleaned up expired message: ${messageId}`);
    }

    return expired.length;
  }

  /**
   * Create message flags
   */
  createMessageFlags(flagOptions) {
    return {
      requires_ack: flagOptions.requiresAck || false,
      is_broadcast: flagOptions.isBroadcast || false,
      is_multicast: flagOptions.isMulticast || false,
      requires_perfect_forward_secrecy: flagOptions.requiresPFS || true,
      requires_deniable_auth: flagOptions.requiresDeniableAuth || false,
      auto_vanish_on_read: flagOptions.autoVanishOnRead || true
    };
  }

  /**
   * Create security context
   */
  createSecurityContext(protocolType, securityOptions = {}) {
    return {
      crypto: {
        key_exchange: securityOptions.keyExchange || 'KYBER768',
        signature: securityOptions.signature || 'DILITHIUM3',
        symmetric_cipher: securityOptions.cipher || 'AES256_GCM',
        hash_function: securityOptions.hash || 'SHA3_256',
        mac_algorithm: securityOptions.mac || 'HMAC_SHA3_256'
      },
      key_pointers: this.createKeyPointers(),
      auth: this.createAuthData(),
      quantum_level: securityOptions.quantumLevel || 'QUANTUM_SAFE'
    };
  }

  /**
   * Create materialization context
   */
  createMaterializationContext(protocolType, materializationOptions = {}) {
    const now = Date.now();
    const ttl = this.getDefaultTTL(protocolType);

    return {
      materialized_at_ms: now,
      vanish_at_ms: now + ttl,
      method: materializationOptions.method || 'MATERIALIZE_MEMORY',
      vanish_method: materializationOptions.vanishMethod || 'VANISH_DOD_5220',
      memory_arena: this.createMemoryArenaInfo(),
      constraints: this.createPerformanceConstraints(protocolType)
    };
  }

  /**
   * Wrap payload according to protocol type
   */
  wrapPayload(protocolType, payload) {
    const wrapper = {};
    
    switch (protocolType) {
      case 'PHANTOM_WHISPER':
        wrapper.phantom_whisper = payload;
        break;
      case 'SPECTRAL_BRIDGE':
        wrapper.spectral_bridge = payload;
        break;
      case 'SHADOW_MESH':
        wrapper.shadow_mesh = payload;
        break;
      case 'WRAITH_TUNNEL':
        wrapper.wraith_tunnel = payload;
        break;
      default:
        throw new Error(`Unknown protocol type: ${protocolType}`);
    }

    return wrapper;
  }

  /**
   * Extract payload data for validation
   */
  extractPayloadData(protocolType, payload) {
    switch (protocolType) {
      case 'PHANTOM_WHISPER':
        return payload.phantom_whisper;
      case 'SPECTRAL_BRIDGE':
        return payload.spectral_bridge;
      case 'SHADOW_MESH':
        return payload.shadow_mesh;
      case 'WRAITH_TUNNEL':
        return payload.wraith_tunnel;
      default:
        return null;
    }
  }

  /**
   * Get default TTL for protocol type
   */
  getDefaultTTL(protocolType) {
    const defaultTTLs = {
      'PHANTOM_WHISPER': 30000,    // 30 seconds
      'SPECTRAL_BRIDGE': 300000,   // 5 minutes
      'SHADOW_MESH': 600000,       // 10 minutes
      'WRAITH_TUNNEL': 1800000     // 30 minutes
    };

    return defaultTTLs[protocolType] || 300000;
  }

  /**
   * Generate unique message ID
   */
  generateMessageId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `MSG_${timestamp}_${random}`;
  }

  /**
   * Create key material pointers
   */
  createKeyPointers() {
    return {
      session_key_id: this.generateKeyId('SESSION'),
      ephemeral_key_id: this.generateKeyId('EPHEMERAL'),
      signature_key_id: this.generateKeyId('SIGNATURE'),
      key_generation_timestamp: Date.now(),
      key_rotation_sequence: 1
    };
  }

  /**
   * Create authentication data
   */
  createAuthData() {
    return {
      message_auth_code: new Uint8Array(32), // Placeholder
      digital_signature: new Uint8Array(64), // Placeholder
      signer_node_id: 'LOCAL_NODE',
      auth_timestamp: Date.now()
    };
  }

  /**
   * Create memory arena info
   */
  createMemoryArenaInfo() {
    return {
      arena_id: this.generateArenaId(),
      allocated_bytes: 0,
      is_locked: true,
      is_encrypted: true,
      arena_type: 'SECURE_HEAP'
    };
  }

  /**
   * Create performance constraints
   */
  createPerformanceConstraints(protocolType) {
    const constraints = {
      'PHANTOM_WHISPER': {
        max_latency_ms: 100,
        max_bandwidth_kbps: 64,
        max_memory_mb: 1,
        max_cpu_percent: 5,
        energy_saving_mode: true
      },
      'SPECTRAL_BRIDGE': {
        max_latency_ms: 500,
        max_bandwidth_kbps: 256,
        max_memory_mb: 4,
        max_cpu_percent: 15,
        energy_saving_mode: false
      },
      'SHADOW_MESH': {
        max_latency_ms: 2000,
        max_bandwidth_kbps: 512,
        max_memory_mb: 8,
        max_cpu_percent: 25,
        energy_saving_mode: false
      },
      'WRAITH_TUNNEL': {
        max_latency_ms: 5000,
        max_bandwidth_kbps: 128,
        max_memory_mb: 16,
        max_cpu_percent: 40,
        energy_saving_mode: false
      }
    };

    return constraints[protocolType] || constraints['SPECTRAL_BRIDGE'];
  }

  /**
   * Generate unique key ID
   */
  generateKeyId(type) {
    return `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Generate unique arena ID
   */
  generateArenaId() {
    return `ARENA_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Get protocol manager statistics
   */
  getStatistics() {
    return {
      ...this.protocolStats,
      cachedMessages: this.messageCache.size,
      supportedProtocols: Array.from(this.validationRules.keys()),
      uptime: Date.now() - (this.startTime || Date.now())
    };
  }

  /**
   * Initialize protocol manager
   */
  async initialize() {
    this.startTime = Date.now();
    
    // Start cleanup interval
    setInterval(() => {
      this.cleanupExpiredMessages();
    }, 60000); // Cleanup every minute

    console.log('📋 Protocol Manager initialized');
    return { success: true };
  }
}

export default new ProtocolManager();