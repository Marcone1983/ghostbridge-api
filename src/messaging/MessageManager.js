// MessageManager.js
// Gestisce l'invio e la ricezione di messaggi Ghost Code e Steganografici

import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { db, storage } from '../firebase/firebaseConfig';
import AuthManager from '../firebase/AuthManager';
import GhostCrypto from '../crypto/GhostCrypto';
import RealSteganography from '../crypto/RealSteganography';
import RNFS from 'react-native-fs';

class MessageManager {
  constructor() {
    this.messagesCollection = 'messages';
    this.activeListeners = new Map();
    this.messageHandlers = [];
  }

  // Invia un messaggio Ghost Code (testo cifrato)
  async sendGhostCode(recipientID, text, password) {
    try {
      if (!AuthManager.isAuthenticated()) {
        throw new Error('Utente non autenticato');
      }

      const senderID = AuthManager.getGhostID();
      const senderUID = AuthManager.getCurrentUser().uid;

      // Cifra il testo usando GhostCrypto
      const ghostCrypto = new GhostCrypto();
      const encrypted = await ghostCrypto.encryptMessage(text, password);
      const ghostCode = `GHOST:${encrypted.nonce}:${encrypted.ciphertext}:${encrypted.salt}`;

      // Crea il documento del messaggio
      const messageData = {
        senderId: senderID,
        senderUID: senderUID,
        recipientId: recipientID,
        recipientUID: await this.getUIDFromGhostID(recipientID), // Necessario per le rules
        encryptedPayload: ghostCode,
        type: 'ghostcode',
        timestamp: serverTimestamp(),
        ttl: 3600, // 1 ora
        read: false
      };

      const docRef = await addDoc(collection(db, this.messagesCollection), messageData);
      
      console.log('Ghost Code inviato:', docRef.id);
      return {
        success: true,
        messageId: docRef.id
      };
    } catch (error) {
      console.error('Errore invio Ghost Code:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Invia un messaggio steganografico (nascosto in PNG)
  async sendStegoMessage(recipientID, imagePath, text) {
    try {
      if (!AuthManager.isAuthenticated()) {
        throw new Error('Utente non autenticato');
      }

      const senderID = AuthManager.getGhostID();
      const senderUID = AuthManager.getCurrentUser().uid;
      const messageId = `stego_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Crea il PNG steganografico usando RealSteganography
      const steganography = new RealSteganography();
      const tempStegoPath = `${RNFS.TemporaryDirectoryPath}/stego_${messageId}.png`;
      
      // Leggi l'immagine originale
      const imageBase64 = await RNFS.readFile(imagePath, 'base64');
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      
      // Cifra il testo prima di nasconderlo
      const ghostCrypto = new GhostCrypto();
      const password = ghostCrypto.generatePassword(32); // Password random per stego
      const encrypted = await ghostCrypto.encryptMessage(text, password);
      const hiddenData = JSON.stringify({ encrypted, password });
      
      // Nascondi nell'immagine
      const stegoImage = await steganography.hideData(imageBuffer, hiddenData, { encrypt: false });
      
      // Salva l'immagine stego
      await RNFS.writeFile(tempStegoPath, stegoImage.toString('base64'), 'base64');

      // Carica su Firebase Storage
      const fileRef = ref(storage, `stego_images/${messageId}.png`);
      const fileData = await RNFS.readFile(tempStegoPath, 'base64');
      const blob = await fetch(`data:image/png;base64,${fileData}`).then(r => r.blob());
      
      await uploadBytes(fileRef, blob, { contentType: 'image/png' });
      const downloadURL = await getDownloadURL(fileRef);

      // Elimina il file temporaneo
      await RNFS.unlink(tempStegoPath);

      // Crea il documento del messaggio
      const messageData = {
        senderId: senderID,
        senderUID: senderUID,
        recipientId: recipientID,
        recipientUID: await this.getUIDFromGhostID(recipientID),
        encryptedPayload: downloadURL,
        type: 'stegotext',
        timestamp: serverTimestamp(),
        ttl: 3600,
        read: false
      };

      const docRef = await addDoc(collection(db, this.messagesCollection), messageData);
      
      console.log('Messaggio steganografico inviato:', docRef.id);
      return {
        success: true,
        messageId: docRef.id
      };
    } catch (error) {
      console.error('Errore invio messaggio steganografico:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Ascolta i messaggi in arrivo
  startListeningForMessages() {
    if (!AuthManager.isAuthenticated()) {
      console.error('Utente non autenticato');
      return null;
    }

    const myUID = AuthManager.getCurrentUser().uid;
    const myGhostID = AuthManager.getGhostID();

    // Query per i messaggi non letti destinati a me
    const q = query(
      collection(db, this.messagesCollection),
      where('recipientUID', '==', myUID),
      where('read', '==', false)
    );

    // Listener real-time
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      for (const change of querySnapshot.docChanges()) {
        if (change.type === 'added') {
          const messageData = change.doc.data();
          const messageId = change.doc.id;
          
          console.log('Nuovo messaggio ricevuto:', messageId);
          
          // Processa il messaggio
          await this.processIncomingMessage(messageId, messageData);
        }
      }
    }, (error) => {
      console.error('Errore listener messaggi:', error);
    });

    // Salva il listener per poterlo fermare dopo
    this.activeListeners.set('main', unsubscribe);
    
    return unsubscribe;
  }

  // Processa un messaggio in arrivo
  async processIncomingMessage(messageId, messageData) {
    try {
      let decryptedContent = null;
      
      if (messageData.type === 'ghostcode') {
        // Messaggio Ghost Code - richiede password per decifrare
        // Notifica l'app che serve la password
        this.notifyHandlers({
          type: 'ghostcode_received',
          messageId: messageId,
          senderId: messageData.senderId,
          timestamp: messageData.timestamp,
          needsPassword: true
        });
      } else if (messageData.type === 'stegotext') {
        // Messaggio steganografico
        decryptedContent = await this.extractStegoMessage(messageData.encryptedPayload);
        
        this.notifyHandlers({
          type: 'stegotext_received',
          messageId: messageId,
          senderId: messageData.senderId,
          timestamp: messageData.timestamp,
          content: decryptedContent
        });
        
        // Marca come letto automaticamente
        await this.markAsRead(messageId);
      }
    } catch (error) {
      console.error('Errore processamento messaggio:', error);
      this.notifyHandlers({
        type: 'error',
        messageId: messageId,
        error: error.message
      });
    }
  }

  // Decifra un Ghost Code con password
  async decryptGhostCode(messageId, password) {
    try {
      const docRef = doc(db, this.messagesCollection, messageId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Messaggio non trovato');
      }
      
      const messageData = docSnap.data();
      
      if (messageData.type !== 'ghostcode') {
        throw new Error('Non è un Ghost Code');
      }
      
      // Decifra usando GhostCrypto
      const ghostCrypto = new GhostCrypto();
      const parts = messageData.encryptedPayload.split(':');
      if (parts[0] !== 'GHOST' || parts.length !== 4) {
        throw new Error('Formato Ghost Code non valido');
      }
      
      const [_, nonce, ciphertext, salt] = parts;
      const plainText = await ghostCrypto.decryptMessage(
        { nonce, ciphertext, salt }, 
        password
      );
      
      // Marca come letto
      await this.markAsRead(messageId);
      
      return {
        success: true,
        content: plainText,
        senderId: messageData.senderId
      };
    } catch (error) {
      console.error('Errore decifratura Ghost Code:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Estrae il messaggio da un PNG steganografico
  async extractStegoMessage(downloadURL) {
    try {
      // Scarica il PNG
      const localPath = `${RNFS.TemporaryDirectoryPath}/received_${Date.now()}.png`;
      await RNFS.downloadFile({
        fromUrl: downloadURL,
        toFile: localPath
      }).promise;
      
      // Estrai il testo nascosto usando RealSteganography
      const steganography = new RealSteganography();
      const imageBase64 = await RNFS.readFile(localPath, 'base64');
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      
      // Estrai i dati nascosti
      const hiddenDataStr = await steganography.extractData(imageBuffer);
      const { encrypted, password } = JSON.parse(hiddenDataStr);
      
      // Decifra il messaggio
      const ghostCrypto = new GhostCrypto();
      const hiddenText = await ghostCrypto.decryptMessage(encrypted, password);
      
      // Elimina il file temporaneo
      await RNFS.unlink(localPath);
      
      return hiddenText;
    } catch (error) {
      console.error('Errore estrazione steganografica:', error);
      throw error;
    }
  }

  // Marca un messaggio come letto
  async markAsRead(messageId) {
    try {
      const docRef = doc(db, this.messagesCollection, messageId);
      await updateDoc(docRef, {
        read: true,
        readAt: serverTimestamp()
      });
      
      // Il messaggio verrà automaticamente eliminato dalla Cloud Function
      console.log('Messaggio marcato come letto:', messageId);
    } catch (error) {
      console.error('Errore marcatura messaggio:', error);
    }
  }

  // Elimina un messaggio
  async deleteMessage(messageId) {
    try {
      const docRef = doc(db, this.messagesCollection, messageId);
      await deleteDoc(docRef);
      console.log('Messaggio eliminato:', messageId);
    } catch (error) {
      console.error('Errore eliminazione messaggio:', error);
    }
  }

  // Ottiene l'UID Firebase da un Ghost ID (necessario per le rules)
  async getUIDFromGhostID(ghostID) {
    try {
      // Query nella collezione users
      const userDoc = await getDoc(doc(db, 'users', ghostID));
      if (userDoc.exists()) {
        return userDoc.data().firebaseUID || null;
      }
      return null;
    } catch (error) {
      console.error('Errore getUIDFromGhostID:', error);
      return null;
    }
  }

  // Aggiunge un handler per i messaggi
  addMessageHandler(handler) {
    this.messageHandlers.push(handler);
    
    // Ritorna funzione per rimuovere l'handler
    return () => {
      const index = this.messageHandlers.indexOf(handler);
      if (index > -1) {
        this.messageHandlers.splice(index, 1);
      }
    };
  }

  // Notifica tutti gli handler
  notifyHandlers(message) {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Errore nell\'handler:', error);
      }
    });
  }

  // Ferma tutti i listener
  stopAllListeners() {
    this.activeListeners.forEach((unsubscribe, key) => {
      unsubscribe();
    });
    this.activeListeners.clear();
  }
}

// Singleton
export default new MessageManager();