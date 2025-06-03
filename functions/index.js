// Cloud Functions per GhostBridge
// Auto-delete messaggi letti e cleanup periodico

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Funzione che si attiva quando un messaggio viene marcato come letto
exports.deleteOnRead = functions
  .region('europe-west1') // Stesso region del database
  .firestore
  .document('messages/{msgId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // Se il messaggio è stato appena marcato come letto
    if (!before.read && after.read) {
      console.log(`Messaggio ${context.params.msgId} letto, eliminazione in corso...`);
      
      try {
        // Se è un messaggio steganografico, elimina anche l'immagine da Storage
        if (after.type === 'stegotext' && after.encryptedPayload) {
          const storage = admin.storage();
          const fileUrl = after.encryptedPayload;
          
          // Estrai il path del file dall'URL
          const matches = fileUrl.match(/stego_images%2F(.+?)\.png/);
          if (matches && matches[1]) {
            const fileName = decodeURIComponent(matches[1]) + '.png';
            const file = storage.bucket().file(`stego_images/${fileName}`);
            
            try {
              await file.delete();
              console.log(`Immagine steganografica ${fileName} eliminata`);
            } catch (error) {
              console.error('Errore eliminazione immagine:', error);
            }
          }
        }
        
        // Elimina il documento del messaggio
        await change.after.ref.delete();
        console.log(`Messaggio ${context.params.msgId} eliminato con successo`);
        
      } catch (error) {
        console.error('Errore durante eliminazione:', error);
      }
    }
    
    return null;
  });

// Funzione schedulata per pulire messaggi scaduti (ogni 5 minuti)
exports.cleanupExpiredMessages = functions
  .region('europe-west1')
  .pubsub.schedule('every 5 minutes')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const db = admin.firestore();
    
    try {
      // Trova tutti i messaggi scaduti
      const expiredQuery = await db
        .collection('messages')
        .where('timestamp', '<', admin.firestore.Timestamp.fromMillis(
          Date.now() - (3600 * 1000) // 1 ora fa
        ))
        .where('read', '==', false)
        .get();
      
      if (expiredQuery.empty) {
        console.log('Nessun messaggio scaduto da eliminare');
        return null;
      }
      
      const batch = db.batch();
      const storage = admin.storage();
      const deletePromises = [];
      
      expiredQuery.forEach((doc) => {
        const data = doc.data();
        
        // Se è steganografico, aggiungi promise per eliminare l'immagine
        if (data.type === 'stegotext' && data.encryptedPayload) {
          const fileUrl = data.encryptedPayload;
          const matches = fileUrl.match(/stego_images%2F(.+?)\.png/);
          
          if (matches && matches[1]) {
            const fileName = decodeURIComponent(matches[1]) + '.png';
            const file = storage.bucket().file(`stego_images/${fileName}`);
            deletePromises.push(
              file.delete()
                .then(() => console.log(`Immagine ${fileName} eliminata`))
                .catch(err => console.error(`Errore eliminazione ${fileName}:`, err))
            );
          }
        }
        
        // Aggiungi al batch per eliminare il documento
        batch.delete(doc.ref);
      });
      
      // Esegui tutte le eliminazioni
      await Promise.all([
        batch.commit(),
        ...deletePromises
      ]);
      
      console.log(`Eliminati ${expiredQuery.size} messaggi scaduti`);
      
    } catch (error) {
      console.error('Errore cleanup messaggi:', error);
    }
    
    return null;
  });

// Funzione per aggiornare il contatore utenti (chiamata solo internamente)
exports.updateUserCounter = functions
  .region('europe-west1')
  .firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    const userId = context.params.userId;
    console.log(`Nuovo utente creato: ${userId}`);
    
    // Aggiorna statistiche globali
    const statsRef = admin.firestore().doc('system/stats');
    
    try {
      await admin.firestore().runTransaction(async (transaction) => {
        const statsDoc = await transaction.get(statsRef);
        
        if (!statsDoc.exists) {
          transaction.set(statsRef, {
            totalUsers: 1,
            lastUserCreated: admin.firestore.Timestamp.now(),
            activeUsers24h: 1
          });
        } else {
          const currentTotal = statsDoc.data().totalUsers || 0;
          transaction.update(statsRef, {
            totalUsers: currentTotal + 1,
            lastUserCreated: admin.firestore.Timestamp.now()
          });
        }
      });
      
      console.log('Statistiche utenti aggiornate');
    } catch (error) {
      console.error('Errore aggiornamento statistiche:', error);
    }
    
    return null;
  });

// Funzione per monitorare attività sospette
exports.monitorSuspiciousActivity = functions
  .region('europe-west1')
  .firestore
  .document('messages/{msgId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const senderId = data.senderId;
    
    // Controlla rate limiting per utente
    const recentMessages = await admin.firestore()
      .collection('messages')
      .where('senderId', '==', senderId)
      .where('timestamp', '>', admin.firestore.Timestamp.fromMillis(
        Date.now() - (60 * 1000) // Ultimo minuto
      ))
      .get();
    
    // Se più di 10 messaggi in un minuto, è sospetto
    if (recentMessages.size > 10) {
      console.warn(`Attività sospetta da utente ${senderId}: ${recentMessages.size} messaggi/minuto`);
      
      // Crea entry nel log di sicurezza
      await admin.firestore().collection('security_logs').add({
        type: 'RATE_LIMIT_WARNING',
        userId: senderId,
        messageCount: recentMessages.size,
        timestamp: admin.firestore.Timestamp.now(),
        action: 'MONITORED'
      });
    }
    
    return null;
  });

// Esporta per testing
if (process.env.NODE_ENV === 'test') {
  exports.testableAdmin = admin;
}