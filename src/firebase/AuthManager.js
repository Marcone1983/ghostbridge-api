// AuthManager.js
// Gestisce l'autenticazione anonima e l'assegnazione degli ID sequenziali

import { 
  signInAnonymously, 
  onAuthStateChanged,
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { auth, db } from './firebaseConfig';
import SequentialIDManager from './SequentialIDManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.ghostID = null;
    this.authStateListeners = [];
    this.initialized = false;
  }

  // Inizializza l'autenticazione e ottiene/crea l'ID sequenziale
  async initialize() {
    if (this.initialized) return;

    try {
      // Inizializza il manager degli ID con Firestore
      SequentialIDManager.initialize(db);

      // Ascolta i cambiamenti di stato dell'autenticazione
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          // Utente autenticato (anonimamente)
          this.currentUser = user;
          
          // Ottieni o genera l'ID sequenziale
          try {
            this.ghostID = await SequentialIDManager.getUserID();
            console.log(`Utente autenticato con Ghost ID: ${this.ghostID}`);
            
            // Salva l'associazione UID Firebase -> Ghost ID
            await this.saveUIDMapping(user.uid, this.ghostID);
            
            // Notifica i listener
            this.notifyListeners({
              authenticated: true,
              user: user,
              ghostID: this.ghostID
            });
          } catch (error) {
            console.error('Errore nell\'ottenere Ghost ID:', error);
            this.notifyListeners({
              authenticated: false,
              error: error
            });
          }
        } else {
          // Nessun utente autenticato
          this.currentUser = null;
          this.ghostID = null;
          
          this.notifyListeners({
            authenticated: false
          });
        }
      });

      this.initialized = true;
    } catch (error) {
      console.error('Errore inizializzazione AuthManager:', error);
      throw error;
    }
  }

  // Esegue il login anonimo
  async loginAnonymously() {
    try {
      console.log('Avvio login anonimo...');
      const userCredential = await signInAnonymously(auth);
      console.log('Login anonimo completato:', userCredential.user.uid);
      
      // L'ID sequenziale verrà assegnato automaticamente dal listener onAuthStateChanged
      return {
        success: true,
        user: userCredential.user
      };
    } catch (error) {
      console.error('Errore login anonimo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Salva l'associazione tra UID Firebase e Ghost ID
  async saveUIDMapping(firebaseUID, ghostID) {
    try {
      // Salva localmente
      await AsyncStorage.setItem(`@GhostBridge:UID_${firebaseUID}`, ghostID);
      
      // Potremmo anche salvare su Firestore se necessario
      // Ma per privacy, meglio evitare
    } catch (error) {
      console.error('Errore saveUIDMapping:', error);
    }
  }

  // Ottiene il Ghost ID corrente
  getGhostID() {
    return this.ghostID;
  }

  // Ottiene l'utente Firebase corrente
  getCurrentUser() {
    return this.currentUser;
  }

  // Verifica se l'utente è autenticato
  isAuthenticated() {
    return this.currentUser !== null && this.ghostID !== null;
  }

  // Aggiunge un listener per i cambiamenti di stato
  addAuthStateListener(callback) {
    this.authStateListeners.push(callback);
    
    // Se già autenticato, notifica immediatamente
    if (this.isAuthenticated()) {
      callback({
        authenticated: true,
        user: this.currentUser,
        ghostID: this.ghostID
      });
    }
    
    // Ritorna una funzione per rimuovere il listener
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  // Notifica tutti i listener
  notifyListeners(state) {
    this.authStateListeners.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('Errore nel listener:', error);
      }
    });
  }

  // Logout (cancella solo la sessione locale, l'ID rimane)
  async logout() {
    try {
      await firebaseSignOut(auth);
      this.currentUser = null;
      // NON resettiamo il ghostID - rimane permanente sul dispositivo
      
      return { success: true };
    } catch (error) {
      console.error('Errore logout:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // Reset completo (solo per debug/testing)
  async fullReset() {
    try {
      await this.logout();
      await SequentialIDManager.resetLocalID();
      this.ghostID = null;
      
      console.log('Reset completo eseguito');
      return { success: true };
    } catch (error) {
      console.error('Errore full reset:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
}

// Singleton
export default new AuthManager();