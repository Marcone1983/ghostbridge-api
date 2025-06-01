import { initializeApp } from 'firebase/app';
  import { getDatabase, ref, get, remove } from
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
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({
          error: 'Missing required field: code'
        });
      }

      const upperCode = code.toUpperCase();

      // Leggi da Firebase Realtime Database
      const snapshot = await get(ref(database,
  `messages/${upperCode}`));
      const messageData = snapshot.val();

      if (!messageData) {
        return res.status(404).json({
          error: 'Message not found',
          message: 'Ghost Code not found or message
  has expired',
          code: upperCode
        });
      }

      if (messageData.burned) {
        return res.status(410).json({
          error: 'Message burned',
          message: 'This message has been permanently
  destroyed'
        });
      }

      // Cancella il messaggio da Firebase (burn after
   reading)
      await remove(ref(database,
  `messages/${upperCode}`));

      console.log('📬 Message retrieved and burned
  from Firebase:', {
        code: upperCode,
        timestamp: messageData.timestamp
      });

      res.status(200).json({
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
      });

    } catch (error) {
      console.error('❌ Firebase read error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve message from
  Firebase'
      });
    }
}
