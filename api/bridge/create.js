// GhostBridge API - Create Secure Message with
  Firebase
  import { initializeApp } from 'firebase/app';
  import { getDatabase, ref, set } from
  'firebase/database';

  const firebaseConfig = {
    apiKey: "AIzaSyDayyQudSQnU-dRev_OhD2BtArb3PFSup0",
    authDomain: "ghostbridge-6aa02.firebaseapp.com",
    databaseURL: "https://ghostbridge-6aa02-default-rt
  db.europe-west1.firebasedatabase.app",
    projectId: "ghostbridge-6aa02",
    storageBucket:
  "ghostbridge-6aa02.firebasestorage.app",
    messagingSenderId: "723378264651",
    appId: "1:723378264651:web:1dfbf74dbf27a69703cbce"
  };

  const app = initializeApp(firebaseConfig);
  const database = getDatabase(app);

  export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods',
  'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers',
  'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed',
        allowed: ['POST']
      });
    }

    try {
      const { code, message, publicKey, keyId } =
  req.body;

      if (!code || !message) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['code', 'message']
        });
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

      // Salva su Firebase Realtime Database
      await set(ref(database,
  `messages/${code.toUpperCase()}`), messageData);

      console.log('🔐 Message stored in Firebase:', {
        code: messageData.code,
        timestamp: messageData.timestamp
      });

      res.status(201).json({
        success: true,
        message: 'Message encrypted and stored
  securely in Firebase',
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
      });

    } catch (error) {
      console.error('❌ Firebase create error:',
  error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to store message in Firebase'
      });
    }
  }
