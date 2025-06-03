import auth from "@react-native-firebase/auth";
import * as Keychain from "react-native-keychain";

export default class FirebaseAuthManager {
  /**
   * Effettua login con Firebase Auth e salva JWT in Keychain
   * @param {string} email
   * @param {string} password
   * @returns {Promise<import('@react-native-firebase/auth').FirebaseAuthTypes.User>}
   */
  async login(email, password) {
    const userCredential = await auth().signInWithEmailAndPassword(email, password);
    const token = await userCredential.user.getIdToken();
    // Salviamo il JWT in Keychain
    await Keychain.setGenericPassword("firebase_jwt", token, { service: "com.ghostbridge.jwt" });
    return userCredential.user;
  }

  /**
   * Logout Firebase e rimuove JWT da Keychain
   */
  async logout() {
    await auth().signOut();
    await Keychain.resetGenericPassword({ service: "com.ghostbridge.jwt" });
  }

  /**
   * Ottiene il token JWT salvato in Keychain
   * @returns {Promise<string|null>}
   */
  async getToken() {
    const creds = await Keychain.getGenericPassword({ service: "com.ghostbridge.jwt" });
    if (creds) {
      return creds.password;
    }
    return null;
  }
}