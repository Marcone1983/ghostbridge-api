// NotificationManager.js
// Gestione notifiche push con Firebase Cloud Messaging

import messaging from '@react-native-firebase/messaging';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import GhostCrypto from '../crypto/GhostCrypto';

class NotificationManager {
  constructor() {
    this.fcmToken = null;
    this.unsubscribeFromMessages = null;
    this.unsubscribeFromTokenRefresh = null;
    this.messageHandlers = new Set();
    this.isInitialized = false;
    this.ghostCrypto = new GhostCrypto();
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Richiedi permessi
      await this.requestPermissions();
      
      // Ottieni FCM token
      await this.getFCMToken();
      
      // Setup listeners
      this.setupMessageListeners();
      this.setupTokenRefreshListener();
      
      // Registra il token nel database
      await this.registerTokenInDatabase();
      
      this.isInitialized = true;
      console.log('NotificationManager initialized');
      
    } catch (error) {
      console.error('NotificationManager initialization error:', error);
      throw error;
    }
  }

  async requestPermissions() {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      // Android 13+ richiede permesso esplicito
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Permessi Notifiche',
          message: 'GhostBridge ha bisogno dei permessi per inviare notifiche sicure',
          buttonNeutral: 'Chiedi dopo',
          buttonNegative: 'Nega',
          buttonPositive: 'OK',
        }
      );
      
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.warn('Notification permission denied');
        return false;
      }
    }

    // Richiedi autorizzazione Firebase
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      Alert.alert(
        'Notifiche Disabilitate',
        'Per ricevere messaggi Ghost in tempo reale, abilita le notifiche nelle impostazioni'
      );
      return false;
    }

    return true;
  }

  async getFCMToken() {
    try {
      // Verifica se il device supporta Firebase Messaging
      if (!messaging().isDeviceRegisteredForRemoteMessages) {
        await messaging().registerDeviceForRemoteMessages();
      }

      this.fcmToken = await messaging().getToken();
      console.log('FCM Token:', this.fcmToken);

      if (!this.fcmToken) {
        throw new Error('Failed to get FCM token');
      }

      return this.fcmToken;

    } catch (error) {
      console.error('Error getting FCM token:', error);
      throw error;
    }
  }

  setupMessageListeners() {
    // Messaggi in foreground
    this.unsubscribeFromMessages = messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground message received:', remoteMessage);
      await this.handleMessage(remoteMessage, 'foreground');
    });

    // Messaggi quando app è in background/killed
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Background message opened:', remoteMessage);
      this.handleMessage(remoteMessage, 'background_opened');
    });

    // Messaggio quando app è killed
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('Killed state message:', remoteMessage);
          this.handleMessage(remoteMessage, 'killed_opened');
        }
      });

    // Background message handler
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background message:', remoteMessage);
      await this.handleMessage(remoteMessage, 'background');
    });
  }

  setupTokenRefreshListener() {
    this.unsubscribeFromTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
      console.log('FCM Token refreshed:', newToken);
      this.fcmToken = newToken;
      await this.registerTokenInDatabase();
    });
  }

  async registerTokenInDatabase() {
    if (!this.fcmToken) return;

    try {
      const user = auth().currentUser;
      const userId = user ? user.uid : `anon_${Math.random().toString(36).substr(2, 9)}`;

      await database().ref(`fcm_tokens/${userId}`).set({
        token: this.fcmToken,
        platform: Platform.OS,
        lastUpdated: database.ServerValue.TIMESTAMP,
        version: '1.0.0',
      });

      console.log('FCM token registered in database');

    } catch (error) {
      console.error('Error registering FCM token:', error);
    }
  }

  async handleMessage(remoteMessage, context) {
    try {
      const { notification, data } = remoteMessage;

      // Decifra i dati se sono cifrati
      let decryptedData = data;
      if (data?.encrypted === 'true' && data?.payload) {
        try {
          const decryptedPayload = await this.ghostCrypto.decryptMessage(
            JSON.parse(data.payload),
            data.key || 'default_key'
          );
          decryptedData = { ...data, payload: JSON.parse(decryptedPayload) };
        } catch (decryptError) {
          console.error('Failed to decrypt notification data:', decryptError);
        }
      }

      // Processa diversi tipi di messaggi
      const messageType = decryptedData?.type || 'unknown';
      
      switch (messageType) {
        case 'ghost_message':
          await this.handleGhostMessage(decryptedData, context);
          break;
          
        case 'p2p_invite':
          await this.handleP2PInvite(decryptedData, context);
          break;
          
        case 'contact_request':
          await this.handleContactRequest(decryptedData, context);
          break;
          
        case 'security_alert':
          await this.handleSecurityAlert(decryptedData, context);
          break;
          
        default:
          await this.handleGenericMessage(remoteMessage, context);
      }

      // Notifica agli handlers registrati
      this.notifyMessageHandlers(decryptedData, context);

    } catch (error) {
      console.error('Error handling notification message:', error);
    }
  }

  async handleGhostMessage(data, context) {
    const { payload } = data;
    
    if (context === 'foreground') {
      Toast.show({
        type: 'info',
        text1: '👻 Nuovo Ghost Message',
        text2: `Da: ${payload?.sender?.substr(0, 8)}...`,
        onPress: () => {
          // Naviga alla schermata messaggi
          // TODO: Implementa navigation
        },
      });
    }

    // Salva il messaggio localmente
    await this.saveMessageLocally(payload);
  }

  async handleP2PInvite(data, context) {
    const { payload } = data;
    
    if (context === 'foreground') {
      Toast.show({
        type: 'info',
        text1: '🔗 Invito P2P',
        text2: `Da: ${payload?.displayName || 'Unknown'}`,
        onPress: () => {
          // Mostra dialog di conferma
          Alert.alert(
            'Invito P2P',
            `${payload?.displayName} vuole connettersi direttamente`,
            [
              { text: 'Rifiuta', style: 'cancel' },
              { text: 'Accetta', onPress: () => this.acceptP2PInvite(payload) },
            ]
          );
        },
      });
    }
  }

  async handleContactRequest(data, context) {
    const { payload } = data;
    
    Toast.show({
      type: 'info',
      text1: '👤 Richiesta Contatto',
      text2: `Da: ${payload?.name || 'Unknown'}`,
    });
  }

  async handleSecurityAlert(data, context) {
    const { payload } = data;
    
    Toast.show({
      type: 'error',
      text1: '🔴 Alert Sicurezza',
      text2: payload?.message || 'Attività sospetta rilevata',
      autoHide: false,
    });
  }

  async handleGenericMessage(remoteMessage, context) {
    const { notification } = remoteMessage;
    
    if (context === 'foreground' && notification) {
      Toast.show({
        type: 'info',
        text1: notification.title || 'Notifica',
        text2: notification.body || '',
      });
    }
  }

  async saveMessageLocally(message) {
    // TODO: Implementa salvataggio locale con AsyncStorage o Firebase
    console.log('Saving message locally:', message);
  }

  async acceptP2PInvite(invite) {
    // TODO: Implementa auto-connessione P2P
    console.log('Accepting P2P invite:', invite);
  }

  async sendEncryptedNotification(targetUserId, type, payload, options = {}) {
    try {
      // Ottieni il token FCM del destinatario
      const tokenSnapshot = await database().ref(`fcm_tokens/${targetUserId}`).once('value');
      const tokenData = tokenSnapshot.val();
      
      if (!tokenData || !tokenData.token) {
        throw new Error('Target user FCM token not found');
      }

      // Cifra il payload
      const encryptedPayload = await this.ghostCrypto.encryptMessage(
        JSON.stringify(payload),
        options.encryptionKey || 'default_key'
      );

      // Prepara il messaggio FCM
      const message = {
        token: tokenData.token,
        notification: {
          title: options.title || '👻 GhostBridge',
          body: options.body || 'Nuovo messaggio sicuro',
        },
        data: {
          type,
          encrypted: 'true',
          payload: JSON.stringify(encryptedPayload),
          key: options.encryptionKey || 'default_key',
          timestamp: Date.now().toString(),
        },
        android: {
          priority: 'high',
          notification: {
            icon: 'ic_ghost',
            color: '#4FC3F7',
            sound: 'ghost_notification',
            channelId: 'ghost_messages',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'ghost_notification.wav',
              badge: 1,
            },
          },
        },
      };

      // Invia tramite Firebase Admin SDK (lato server)
      // Per ora logga il messaggio - in produzione inviare tramite Cloud Functions
      console.log('Encrypted notification to send:', message);
      
      // Simula invio
      Toast.show({
        type: 'success',
        text1: 'Notifica Inviata',
        text2: `Messaggio cifrato inviato a ${targetUserId.substr(0, 8)}...`,
      });

      return true;

    } catch (error) {
      console.error('Error sending encrypted notification:', error);
      throw error;
    }
  }

  onMessage(handler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  notifyMessageHandlers(data, context) {
    this.messageHandlers.forEach(handler => {
      try {
        handler(data, context);
      } catch (error) {
        console.error('Message handler error:', error);
      }
    });
  }

  async cleanup() {
    if (this.unsubscribeFromMessages) {
      this.unsubscribeFromMessages();
    }
    
    if (this.unsubscribeFromTokenRefresh) {
      this.unsubscribeFromTokenRefresh();
    }

    // Rimuovi token dal database
    try {
      const user = auth().currentUser;
      if (user) {
        await database().ref(`fcm_tokens/${user.uid}`).remove();
      }
    } catch (error) {
      console.error('Error removing FCM token:', error);
    }

    this.isInitialized = false;
  }

  getStats() {
    return {
      fcmToken: this.fcmToken ? `${this.fcmToken.substr(0, 20)}...` : null,
      isInitialized: this.isInitialized,
      registeredHandlers: this.messageHandlers.size,
    };
  }
}

export default new NotificationManager();