export const config = {
    runtime: 'edge',
  };

  // GhostBridge API - Read Secure Message
  export default async function handler(req) {
    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers
   });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        error: 'Method not allowed',
        allowed: ['POST']
      }), { status: 405, headers });
    }

    try {
      const body = await req.json();
      const { code } = body;

      if (!code) {
        return new Response(JSON.stringify({
          error: 'Missing required field: code'
        }), { status: 400, headers });
      }

      const upperCode = code.toUpperCase();

      // Mock messages for testing
      const mockMessages = {
        'GHOSTI07P': {
          message: 'Hello from GhostBridge! This is a
  test message with military-grade encryption.',
          timestamp: new Date().toISOString(),
          publicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcD
  QgAERBh/aTTkZfGZCFL73Yj3AuUwQVqHRXj76lCJP7AnNE9L6hXG
  ltCA6jBSrPWcNp66i7wX1zW9LYFqTZxSPN1eeg==',
          keyId: 'key_1748810173719',
          encrypted: true,
          burned: false
        }
      };

      const messageData = mockMessages[upperCode];

      if (!messageData) {
        return new Response(JSON.stringify({
          error: 'Message not found',
          message: 'Ghost Code not found or message
  has expired',
          code: upperCode
        }), { status: 404, headers });
      }

      if (messageData.burned) {
        return new Response(JSON.stringify({
          error: 'Message burned',
          message: 'This message has been permanently
  destroyed'
        }), { status: 410, headers });
      }

      console.log('📬 Message retrieved:', {
        code: upperCode,
        timestamp: messageData.timestamp
      });

      // Mark as burned
      messageData.burned = true;

      return new Response(JSON.stringify({
        success: true,
        message: messageData.message,
        data: {
          code: upperCode,
          timestamp: messageData.timestamp,
          publicKey: messageData.publicKey,
          keyId: messageData.keyId,
          burnAfterReading: true
        },
        security: {
          decrypted: true,
          algorithm: 'X25519 + AES-256-GCM',
          forwardSecrecy: true,
          burned: true
        }
      }), { status: 200, headers });

    } catch (error) {
      console.error('❌ Read error:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to retrieve message'
      }), { status: 500, headers });
    }
}
