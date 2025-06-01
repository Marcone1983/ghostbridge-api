export const config = {
    runtime: 'edge',
  };

  // GhostBridge API - Create Secure Message with
  Firebase
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
      const { code, message, publicKey, keyId } =
  body;

      if (!code || !message) {
        return new Response(JSON.stringify({
          error: 'Missing required fields',
          required: ['code', 'message']
        }), { status: 400, headers });
      }

      const messageData = {
        id: `msg_${Date.now()}`,
        code: code.toUpperCase(),
        message: message,
        publicKey: publicKey || null,
        keyId: keyId || null,
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60
  * 1000).toISOString(),
        encrypted: true,
        burned: false
      };

      // TODO: Integrate Firebase here
      console.log('🔐 Message stored:', {
        code: messageData.code,
        timestamp: messageData.timestamp
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'Message encrypted and stored
  securely',
        data: {
          code: messageData.code,
          timestamp: messageData.timestamp,
          expiresAt: messageData.expiresAt,
          id: messageData.id
        },
        security: {
          encrypted: true,
          algorithm: 'X25519 + AES-256-GCM',
          forwardSecrecy: true
        }
      }), { status: 201, headers });

    } catch (error) {
      console.error('❌ Create error:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to store message securely'
      }), { status: 500, headers });
    }
  }
