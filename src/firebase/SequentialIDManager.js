// SequentialIDManager.js
// Gestisce l'assegnazione di ID sequenziali univoci agli utenti
// Ogni nuovo utente riceve il numero successivo (001, 002, 003...)

import { 
  getFirestore, 
  doc, 
  runTransaction, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SequentialIDManager {
  constructor() {
    this.db = null;
    this.localIDKey = '@GhostBridge:UserID';
    this.counterDoc = 'system/userCounter';
  }

  // Inizializza con Firestore
  initialize(firestoreInstance) {
    this.db = firestoreInstance;
  }

  // Ottiene o crea un ID sequenziale per l'utente
  async getUserID() {
    try {
      // Prima controlla se l'utente ha già un ID salvato localmente
      const existingID = await this.getLocalID();
      if (existingID) {
        console.log('ID esistente trovato:', existingID);
        return existingID;
      }

      // Se non ha un ID, ne genera uno nuovo
      const newID = await this.generateNewID();
      
      // Salva l'ID localmente
      await this.saveLocalID(newID);
      
      console.log('Nuovo ID assegnato:', newID);
      return newID;
    } catch (error) {
      console.error('Errore getUserID:', error);
      throw error;
    }
  }

  // Genera un nuovo ID sequenziale usando una transazione Firestore
  async generateNewID() {
    if (!this.db) {
      throw new Error('Firestore non inizializzato');
    }

    return runTransaction(this.db, async (transaction) => {
      const counterRef = doc(this.db, this.counterDoc);
      
      // Legge il contatore corrente
      const counterDoc = await transaction.get(counterRef);
      
      let nextNumber;
      if (!counterDoc.exists()) {
        // Primo utente in assoluto
        nextNumber = 1;
        transaction.set(counterRef, { 
          lastAssignedNumber: 1,
          totalUsers: 1,
          lastUpdated: new Date()
        });
      } else {
        // Incrementa il contatore
        const currentNumber = counterDoc.data().lastAssignedNumber || 0;
        nextNumber = currentNumber + 1;
        
        transaction.update(counterRef, {
          lastAssignedNumber: nextNumber,
          totalUsers: nextNumber,
          lastUpdated: new Date()
        });
      }

      // Crea il documento utente con il nuovo ID
      const userID = this.formatID(nextNumber);
      const userRef = doc(this.db, 'users', userID);
      
      transaction.set(userRef, {
        userID: userID,
        sequentialNumber: nextNumber,
        createdAt: new Date(),
        firstSeen: new Date(),
        platform: Platform.OS,
        active: true
      });

      return userID;
    });
  }

  // Formatta il numero in ID (es: 1 -> "001", 100 -> "100")
  formatID(number) {
    // Usa padding di zeri fino a 6 cifre per supportare fino a 999,999 utenti
    return String(number).padStart(6, '0');
  }

  // Recupera l'ID salvato localmente
  async getLocalID() {
    try {
      const id = await AsyncStorage.getItem(this.localIDKey);
      return id;
    } catch (error) {
      console.error('Errore getLocalID:', error);
      return null;
    }
  }

  // Salva l'ID localmente
  async saveLocalID(id) {
    try {
      await AsyncStorage.setItem(this.localIDKey, id);
    } catch (error) {
      console.error('Errore saveLocalID:', error);
    }
  }

  // Verifica se un ID esiste già (per debug/admin)
  async checkIDExists(id) {
    if (!this.db) return false;
    
    try {
      const userRef = doc(this.db, 'users', id);
      const userDoc = await getDoc(userRef);
      return userDoc.exists();
    } catch (error) {
      console.error('Errore checkIDExists:', error);
      return false;
    }
  }

  // Ottiene statistiche del sistema (per admin)
  async getSystemStats() {
    if (!this.db) return null;
    
    try {
      const counterRef = doc(this.db, this.counterDoc);
      const counterDoc = await getDoc(counterRef);
      
      if (counterDoc.exists()) {
        return counterDoc.data();
      }
      
      return {
        lastAssignedNumber: 0,
        totalUsers: 0,
        lastUpdated: null
      };
    } catch (error) {
      console.error('Errore getSystemStats:', error);
      return null;
    }
  }

  // Resetta l'ID locale (per testing/debug)
  async resetLocalID() {
    try {
      await AsyncStorage.removeItem(this.localIDKey);
      console.log('ID locale resettato');
    } catch (error) {
      console.error('Errore resetLocalID:', error);
    }
  }
}

// Singleton
export default new SequentialIDManager();