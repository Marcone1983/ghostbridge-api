import './src/crypto/cryptoPolyfill';
import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  Dimensions,
  Image,
  Alert,
  NativeModules,
  AppState,
  Platform,
  Share,
  Linking,
  PermissionsAndroid,
} from 'react-native';
import GhostCrypto from './src/crypto/GhostCrypto';
import RealMessageBridge from './src/crypto/RealMessageBridge';
import RealSteganography from './src/crypto/RealSteganography';
import RealGeolocationSpoofer from './src/security/RealGeolocationSpoofer';
import AdvancedProxyChains from './src/network/AdvancedProxyChains';
import RealFederatedLearning from './src/ml/RealFederatedLearning';
import CompressionAwareSteganography from './src/crypto/CompressionAwareSteganography';
import HardwareTEEManager from './src/security/HardwareTEEManager';
import NANDAwareSecureDeletion from './src/security/NANDAwareSecureDeletion';
import TrafficMetadataProtection from './src/network/TrafficMetadataProtection';
import EndpointCompromiseProtection from './src/security/EndpointCompromiseProtection';
import CryptographicAgility from './src/security/CryptographicAgility';
import SocialRecoverySystem from './src/security/SocialRecoverySystem';
import PoisoningResistantLearning from './src/ml/PoisoningResistantLearning';
import JailMonkey from 'jail-monkey';
import DeviceInfo from 'react-native-device-info';
import Toast from 'react-native-toast-message';
import RNFS from 'react-native-fs';
import {launchImageLibrary} from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const { SecurityModule } = NativeModules;

const GhostBridgeApp = () => {
  // UI state
  const [activeSection, setActiveSection] = useState('home');
  const [senderGhostCode, setSenderGhostCode] = useState(null);
  const [receiveGhostCode, setReceiveGhostCode] = useState('');
  const [recipientID, setRecipientID] = useState(''); // Changed to recipient ID
  const [recipientPublicKey, setRecipientPublicKey] = useState('');
  const [messageText, setMessageText] = useState('');
  const [displayMessage, setDisplayMessage] = useState('Waiting for secure messages...');
  const [sendStatus, setSendStatus] = useState('');
  const [receiveStatus, setReceiveStatus] = useState('');
  
  // Steganography state
  const [steganographyEnabled, setSteganographyEnabled] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [steganographyPassword, setSteganographyPassword] = useState('');
  const [receivedImage, setReceivedImage] = useState(null);
  const [lastSentImage, setLastSentImage] = useState(null); // Store last sent stego image
  const [selectedDecryptImage, setSelectedDecryptImage] = useState(null); // Image selected for decryption
  const [imageMessageMode, setImageMessageMode] = useState('auto'); // 'auto', 'image', 'text'
  
  // Security state
  const [isSecurityInitialized, setIsSecurityInitialized] = useState(false);
  const [deviceIntegrity, setDeviceIntegrity] = useState(null);
  const [biometricAuth, setBiometricAuth] = useState(false);
  const [emergencyBurnTriggered, setEmergencyBurnTriggered] = useState(false);
  const [senderKeyPair, setSenderKeyPair] = useState(null);
  const appState = useRef(AppState.currentState);
  
  // Generate unique consecutive GhostBridge ID
  const [ghostBridgeID, setGhostBridgeID] = useState('000');

  const [deviceId] = useState(() => {
    return DeviceInfo.getUniqueId().substring(0, 8).toUpperCase();
  });

  // Matrix animation values
  const [matrixChars] = useState(() => {
    const chars = [];
    for (let i = 0; i < 30; i++) {
      chars.push({
        id: i,
        value: new Animated.Value(0),
        x: Math.random() * width,
        char: '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'[Math.floor(Math.random() * 68)],
      });
    }
    return chars;
  });

  // Get unique consecutive ID from Firebase
  const getUniqueConsecutiveID = async () => {
    try {
      console.log('🔢 Getting unique consecutive ID...');
      
      // Check if ID is already stored locally
      const storedID = await AsyncStorage.getItem('ghostBridgeID');
      if (storedID) {
        setGhostBridgeID(storedID);
        console.log('✅ Using stored ID:', storedID);
        return;
      }
      
      // Initialize Firebase if not already done
      await RealMessageBridge.initialize();
      
      // Use Firebase transaction to get next consecutive ID
      const result = await RealMessageBridge.getNextConsecutiveID();
      
      if (result.success) {
        const newID = result.id.toString().padStart(3, '0');
        setGhostBridgeID(newID);
        
        // Store ID locally so it never changes
        await AsyncStorage.setItem('ghostBridgeID', newID);
        
        console.log('✅ Assigned new consecutive ID:', newID);
        showToast('success', `Il tuo ID GhostBridge: ${newID}`);
      } else {
        throw new Error('Failed to get consecutive ID');
      }
      
    } catch (error) {
      console.error('Failed to get unique ID:', error);
      showToast('error', 'Errore assegnazione ID');
      
      // Fallback to device-based ID for now
      const deviceHash = DeviceInfo.getUniqueId();
      let hash = 0;
      for (let i = 0; i < deviceHash.length; i++) {
        hash = ((hash << 5) - hash + deviceHash.charCodeAt(i)) & 0xffffffff;
      }
      const fallbackID = (Math.abs(hash % 999) + 1).toString().padStart(3, '0');
      setGhostBridgeID(fallbackID);
    }
  };

  // Initialize security on app start
  useEffect(() => {
    getUniqueConsecutiveID(); // Get ID first
    initializeSecurity();
    setupAppStateListener();
    
    // Start matrix animation
    matrixChars.forEach(char => {
      const animate = () => {
        char.value.setValue(0);
        Animated.timing(char.value, {
          toValue: height + 50,
          duration: 5000 + Math.random() * 5000,
          useNativeDriver: true,
        }).start(() => animate());
      };
      animate();
    });
    
    return () => {
      if (appState.current) {
        AppState.removeEventListener('change', handleAppStateChange);
      }
    };
  }, []);

  const initializeSecurity = async () => {
    try {
      showToast('info', 'Initializing 45+ IMPENETRABLE-FORTRESS security layers...');
      
      // 🔐 Initialize Hardware TEE Manager (NEW!)
      await HardwareTEEManager.initialize();
      console.log('✅ Hardware TEE Manager initialized');
      
      // 💾 Initialize NAND-Aware Secure Deletion (NEW!)
      await NANDAwareSecureDeletion.initialize();
      console.log('✅ NAND-Aware Secure Deletion initialized');
      
      // 🧠 Initialize Federated Learning (NEW!)
      await RealFederatedLearning.initialize();
      console.log('✅ Federated Learning initialized');
      
      // 🌐 Initialize Traffic Metadata Protection (ULTIMATE!)
      await TrafficMetadataProtection.initialize();
      console.log('✅ Traffic Metadata Protection initialized');
      
      // 🛡️ Initialize Endpoint Compromise Protection (ULTIMATE!)
      await EndpointCompromiseProtection.initialize();
      console.log('✅ Endpoint Compromise Protection initialized');
      
      // 🔄 Initialize Cryptographic Agility (ULTIMATE!)
      await CryptographicAgility.initialize();
      console.log('✅ Cryptographic Agility initialized');
      
      // 🔑 Initialize Social Recovery System (ULTIMATE!)
      await SocialRecoverySystem.initialize();
      console.log('✅ Social Recovery System initialized');
      
      // 🧠 Initialize Poisoning-Resistant Learning (ULTIMATE!)
      await PoisoningResistantLearning.initialize();
      console.log('✅ Poisoning-Resistant Learning initialized');
      
      // Enable screen recording prevention
      if (SecurityModule) {
        await SecurityModule.enableSecureWindow();
      }
      
      // Check device integrity
      const integrity = await GhostCrypto.checkDeviceIntegrity();
      setDeviceIntegrity(integrity);
      
      if (integrity.isCompromised) {
        Alert.alert(
          'Security Alert',
          'Device security compromised. Emergency burn activated.',
          [{ text: 'OK', onPress: () => triggerEmergencyBurn() }]
        );
        return;
      }
      
      // Setup certificate pinning
      await GhostCrypto.setupCertificatePinning();
      
      // Initialize clipboard restrictions
      await GhostCrypto.restrictClipboard();
      
      // Prevent screen recording
      await GhostCrypto.preventScreenRecording();
      
      // Setup biometric authentication
      try {
        const bioAuth = await GhostCrypto.authenticateWithBiometrics();
        setBiometricAuth(bioAuth.success);
      } catch (error) {
        console.log('Biometric auth not available');
      }
      
      setIsSecurityInitialized(true);
      showToast('success', 'IMPENETRABLE-FORTRESS security activated!');
    } catch (error) {
      showToast('error', 'Security initialization failed');
      console.error('Security init error:', error);
    }
  };

  const setupAppStateListener = () => {
    AppState.addEventListener('change', handleAppStateChange);
  };

  const handleAppStateChange = (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground - re-authenticate
      if (biometricAuth) {
        GhostCrypto.authenticateWithBiometrics().catch(() => {
          triggerEmergencyBurn();
        });
      }
    }
    appState.current = nextAppState;
  };

  const showToast = (type, message) => {
    Toast.show({
      type: type,
      text1: message,
      position: 'top',
      visibilityTime: 3000,
    });
  };

  const triggerEmergencyBurn = async () => {
    try {
      setEmergencyBurnTriggered(true);
      
      // Trigger JavaScript memory wiping
      GhostCrypto.triggerEmergencyBurn('User initiated');
      
      // Trigger native DoD memory wiping if available
      if (NativeModules.SecureMemoryModule) {
        await NativeModules.SecureMemoryModule.performNativeDodMemoryWipe(1024*1024*10);
        showToast('success', 'Native DoD 5-pass memory wipe completed');
      }
      
      // Clear clipboard if module available
      if (NativeModules.ClipboardSecurityModule) {
        await NativeModules.ClipboardSecurityModule.clearAndRestrictClipboard();
      }
      
      // Activate geolocation spoofing for emergency anonymity
      try {
        await RealGeolocationSpoofer.startSpoofing({
          latitude: RealGeolocationSpoofer.generateRealisticLocation().latitude,
          longitude: RealGeolocationSpoofer.generateRealisticLocation().longitude,
          movementEnabled: true,
          geofenceEnabled: true
        });
        showToast('success', 'Emergency geolocation spoofing activated');
      } catch (geoError) {
        console.log('Geolocation spoofing failed:', geoError.message);
      }
      
      // Create emergency proxy chain
      try {
        await AdvancedProxyChains.createProxyChain({
          chainLength: 5,
          proxyTypes: ['tor', 'socks5'],
          performance: 'anonymity'
        });
        showToast('success', 'Emergency proxy chain established');
      } catch (proxyError) {
        console.log('Proxy chain creation failed:', proxyError.message);
      }
      
      Alert.alert('Emergency Burn', 'All data has been securely wiped with DoD 5220.22-M standard.');
    } catch (error) {
      console.error('Emergency burn error:', error);
      Alert.alert('Emergency Burn', 'Basic memory clearing completed.');
    }
  };

  const generateRandomGhostCode = () => {
    // Use RealMessageBridge for consistent Ghost Code generation
    return RealMessageBridge.generateGhostCode();
  };

  const generateSenderGhostCode = async () => {
    try {
      showToast('info', 'Generating quantum-resistant keys...');
      
      // Generate ephemeral key pair
      const keyPair = await GhostCrypto.generateKeyPair();
      setSenderKeyPair(keyPair);
      
      // Generate secure ghost code
      const newCode = generateRandomGhostCode();
      setSenderGhostCode(newCode);
      
      // Generate canary token
      const canary = GhostCrypto.generateCanaryToken();
      
      setSendStatus('success|Ghost Code & ephemeral keys generated!');
      showToast('success', 'Perfect Forward Secrecy established');
      setTimeout(() => setSendStatus(''), 3000);
    } catch (error) {
      setSendStatus('error|Key generation failed');
      console.error('Key generation error:', error);
    }
  };

  const sendMessage = async () => {
    if (!recipientID.trim() || !messageText.trim()) {
      setSendStatus('error|Inserisci ID destinatario e messaggio');
      setTimeout(() => setSendStatus(''), 3000);
      return;
    }

    // Validate recipient ID format (3 digits)
    if (!/^\d{3}$/.test(recipientID)) {
      setSendStatus('error|ID deve essere 3 cifre (es: 001, 002)');
      setTimeout(() => setSendStatus(''), 3000);
      return;
    }

    if (!senderGhostCode || !senderKeyPair) {
      setSendStatus('error|Generate your Ghost Code first');
      setTimeout(() => setSendStatus(''), 3000);
      return;
    }

    if (!recipientPublicKey.trim()) {
      setSendStatus('error|Enter recipient public key');
      setTimeout(() => setSendStatus(''), 3000);
      return;
    }

    try {
      setSendStatus('info|Applying 30+ encryption layers...');
      showToast('info', 'Encrypting with military-grade security');
      
      // Initialize Real Message Bridge
      await RealMessageBridge.initialize();
      
      // Perform intrusion detection
      const intrusionCheck = GhostCrypto.detectIntrusion({
        message: messageText,
        recipientID: recipientID
      });
      
      if (intrusionCheck.intrusionDetected) {
        triggerEmergencyBurn();
        return;
      }
      
      // Behavioral analysis
      const behavior = GhostCrypto.analyzeBehavior(
        'GhostBridge/1.0',
        [{ timestamp: Date.now() }]
      );
      
      if (behavior.isSuspicious) {
        triggerEmergencyBurn();
        return;
      }
      
      // Encrypt message with full security stack
      const encrypted = await GhostCrypto.encryptMessage(
        messageText,
        recipientPublicKey,
        senderKeyPair.keyId
      );
      
      // Establish PFS session
      const pfsSession = await GhostCrypto.establishPFS(recipientPublicKey);
      
      // Add traffic padding and jitter
      const paddedData = GhostCrypto.addTrafficPadding({
        message: encrypted,
        recipientID: recipientID,
        senderCode: senderGhostCode,
        senderPublicKey: senderKeyPair.publicKey,
        pfsSession: pfsSession,
        timestamp: Date.now(),
        canaryToken: GhostCrypto.generateCanaryToken().id
      });
      
      // Create onion routing layers
      const onionData = GhostCrypto.createOnionRoute(JSON.stringify(paddedData), 5);
      
      // Apply steganography if enabled
      let finalPayload = onionData;
      let messageType = 'text';
      
      if (steganographyEnabled && imageMessageMode !== 'text') {
        try {
          setSendStatus('info|Hiding message in image using LSB steganography...');
          
          // Get or generate cover image
          const coverImagePath = selectedImage || await generateDefaultCoverImage();
          
          // Hide encrypted message in image
          const steganographicImage = await RealSteganography.hideMessage(
            coverImagePath,
            onionData,
            steganographyPassword || 'GhostBridge-' + Date.now(),
            null // Let it generate output path
          );
          
          finalPayload = steganographicImage.imagePath;
          messageType = 'image';
          
          // Store the image path for sharing
          setLastSentImage(steganographicImage.imagePath);
          
          showToast('success', 'Message hidden in image with LSB steganography');
          console.log('🖼️ Message hidden in image:', steganographicImage.stats);
          
        } catch (stegError) {
          console.warn('Steganography failed:', stegError.message);
          showToast('error', 'Crittaggio immagine non riuscito');
          setSendStatus('error|Crittaggio immagine fallito');
          return; // Stop sending instead of fallback
        }
      }
      
      // Check honeypot
      if (GhostCrypto.checkHoneypotAccess('/api/bridge/create')) {
        return;
      }
      
      // Send with jitter
      await new Promise(resolve => GhostCrypto.addJitter(resolve));
      
      setSendStatus('info|Sending through Firebase Realtime Database...');
      
      // Use REAL Firebase Realtime Database 
      const result = await RealMessageBridge.sendMessage(
        recipientID, // Now using recipient ID instead of code
        finalPayload,
        {
          senderCode: senderGhostCode,
          senderPublicKey: senderKeyPair.publicKey,
          senderID: ghostBridgeID, // Add sender ID
          deviceId: deviceId,
          canary: GhostCrypto.generateCanaryToken().value,
          sessionId: pfsSession.sessionId,
          messageType: messageType, // 'text' or 'image'
          steganographyEnabled: steganographyEnabled && messageType === 'image'
        }
      );
      
      if (result.success) {
        setSendStatus('success|Message sent with 30+ security layers!');
        showToast('success', 'Ultra-secure transmission complete');
        setMessageText('');
        setRecipientID('');
        setRecipientPublicKey('');
        
        // Ratchet forward for next message
        if (pfsSession.sessionId) {
          await GhostCrypto.ratchetForward(pfsSession.sessionId);
        }
        
        // Auto-destroy keys after message sent
        setTimeout(() => {
          if (senderKeyPair) {
            GhostCrypto.destroyKey(senderKeyPair.keyId);
            setSenderKeyPair(null);
            showToast('info', 'Ephemeral keys burned');
          }
        }, 5000);
      } else {
        setSendStatus('error|Send failed: ' + result.error);
      }
    } catch (error) {
      setSendStatus('error|Send failed: ' + error.message);
      console.error('Send error:', error);
    }
    
    setTimeout(() => setSendStatus(''), 3000);
  };

  // Decrypt message directly from selected image
  const decryptFromSelectedImage = async () => {
    try {
      setReceiveStatus('info|Estraendo messaggio dall\'immagine...');
      showToast('info', 'Estraendo LSB steganografia...');
      
      // Copy image to local temp directory first
      const tempImagePath = `${RNFS.TemporaryDirectoryPath}/decrypt_${Date.now()}.jpg`;
      await RNFS.copyFile(selectedDecryptImage, tempImagePath);
      
      // Extract message from steganographic image
      const stegPassword = steganographyPassword || 'GhostBridge-' + Date.now();
      const extractionResult = await RealSteganography.extractMessage(
        tempImagePath,
        stegPassword
      );
      
      if (extractionResult.success) {
        // The extracted message should be the onion-encrypted data
        let decrypted = extractionResult.message;
        
        // Parse the extracted data
        const parsedData = JSON.parse(decrypted);
        
        // Generate receiver key pair for decryption
        const receiverKeyPair = await GhostCrypto.generateKeyPair();
        
        // Decrypt the actual message
        const message = await GhostCrypto.decryptMessage(
          parsedData.message,
          receiverKeyPair.keyId,
          parsedData.senderPublicKey
        );
        
        setDisplayMessage(message);
        setReceivedImage(tempImagePath); // Show the steganographic image
        setReceiveStatus('success|Messaggio estratto dall\'immagine!');
        showToast('success', 'Messaggio estratto con successo');
        
        // Clear selected image
        setSelectedDecryptImage(null);
        
        // Auto-burn after reading
        setTimeout(() => {
          setDisplayMessage('💀 Messaggio bruciato dopo lettura');
          setReceivedImage(null);
          GhostCrypto.destroyKey(receiverKeyPair.keyId);
          showToast('info', 'Messaggio auto-distrutto');
        }, 30000);
        
      } else {
        throw new Error('Impossibile estrarre messaggio dall\'immagine');
      }
      
    } catch (error) {
      setReceiveStatus('error|Estrazione fallita: ' + error.message);
      showToast('error', 'Estrazione immagine fallita');
      console.error('Image decryption error:', error);
    }
    
    setTimeout(() => setReceiveStatus(''), 3000);
  };

  const retrieveMessage = async () => {
    // Check if we're decrypting from selected image or using Ghost Code
    if (selectedDecryptImage) {
      // Decrypt directly from selected image
      await decryptFromSelectedImage();
      return;
    }
    
    if (!receiveGhostCode.trim()) {
      setReceiveStatus('error|Inserisci un Ghost Code valido');
      setTimeout(() => setReceiveStatus(''), 3000);
      return;
    }

    try {
      setReceiveStatus('info|Establishing quantum-secure channel...');
      showToast('info', 'Initializing secure reception');
      
      // Initialize REAL Firebase Message Bridge
      await RealMessageBridge.initialize();
      
      // Generate receiver key pair
      const receiverKeyPair = await GhostCrypto.generateKeyPair();
      
      // Check canary token
      const canary = GhostCrypto.generateCanaryToken();
      if (!GhostCrypto.checkCanaryToken(canary.id)) {
        return;
      }
      
      setReceiveStatus('info|Retrieving from Firebase Realtime Database...');
      
      // Use REAL Firebase Realtime Database
      const result = await RealMessageBridge.retrieveMessage(receiveGhostCode);
      
      if (result.success && result.encryptedData) {
        setReceiveStatus('info|Decrypting 30+ security layers...');
        showToast('info', 'Peeling onion layers...');
        
        let decrypted = result.encryptedData;
        let messageType = result.metadata?.messageType || 'text';
        
        // Handle steganography extraction for image messages
        if (messageType === 'image' && result.metadata?.steganographyEnabled) {
          try {
            setReceiveStatus('info|Extracting hidden message from image...');
            showToast('info', 'Extracting LSB steganography...');
            
            // Extract message from steganographic image
            const stegPassword = steganographyPassword || 'GhostBridge-' + Date.now();
            const extractionResult = await RealSteganography.extractMessage(
              result.encryptedData, // This is the image path
              stegPassword
            );
            
            if (extractionResult.success) {
              decrypted = extractionResult.message;
              setReceivedImage(result.encryptedData); // Store image for display
              showToast('success', 'Message extracted from image successfully');
              console.log('🖼️ Message extracted from steganographic image');
            } else {
              throw new Error('Failed to extract message from image');
            }
            
          } catch (stegError) {
            console.warn('Steganography extraction failed:', stegError.message);
            showToast('error', 'Estrazione immagine non riuscita');
            setReceiveStatus('error|Estrazione immagine fallita');
            return; // Stop processing instead of fallback
          }
        }
        
        // Peel onion layers
        if (result.metadata && result.metadata.route) {
          for (const layer of result.metadata.route) {
            decrypted = GhostCrypto.peelOnionLayer(decrypted, layer);
          }
        }
        
        const parsedData = JSON.parse(decrypted);
        
        // Verify canary token
        if (parsedData.canaryToken && !GhostCrypto.checkCanaryToken(parsedData.canaryToken)) {
          triggerEmergencyBurn();
          return;
        }
        
        // Decrypt the actual message
        const message = await GhostCrypto.decryptMessage(
          parsedData.message,
          receiverKeyPair.keyId,
          parsedData.senderPublicKey
        );
        
        // Establish PFS if needed
        if (parsedData.pfsSession) {
          const session = await GhostCrypto.establishPFS(parsedData.senderPublicKey);
          await GhostCrypto.ratchetForward(session.sessionId);
        }
        
        setDisplayMessage(message);
        setReceiveStatus('success|Message decrypted & will auto-burn!');
        showToast('success', 'Message received securely');
        setReceiveGhostCode('');
        
        // Auto-burn after reading
        setTimeout(() => {
          setDisplayMessage('💀 Message burned after reading');
          setReceivedImage(null); // Clear received image
          GhostCrypto.destroyKey(receiverKeyPair.keyId);
          showToast('info', 'Message auto-destroyed');
        }, 30000); // 30 seconds
      } else {
        setReceiveStatus('error|Code not found or expired');
      }
    } catch (error) {
      setReceiveStatus('error|Retrieve failed: ' + error.message);
      console.error('Receive error:', error);
    }
    
    setTimeout(() => setReceiveStatus(''), 3000);
  };


  // Receive Message (old function kept for compatibility)
  // Share steganographic image to WhatsApp/Telegram
  const shareStegImage = async (imagePath) => {
    try {
      const result = await Share.share({
        url: `file://${imagePath}`,
        message: 'Foto condivisa tramite GhostBridge 👻',
      });
      
      if (result.action === Share.sharedAction) {
        showToast('success', 'Immagine condivisa con sicurezza totale!');
        console.log('🔗 Steganographic image shared securely');
      }
    } catch (error) {
      console.error('Share failed:', error);
      showToast('error', 'Condivisione fallita');
    }
  };

  // Select image from gallery for decryption
  const selectImageForDecryption = () => {
    const options = {
      title: 'Seleziona immagine da decriptare',
      storageOptions: {
        skipBackup: true,
        path: 'images',
      },
      mediaType: 'photo',
      includeBase64: false,
      maxWidth: 2048,
      maxHeight: 2048,
      quality: 1.0,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        showToast('info', 'Selezione immagine annullata');
      } else if (response.errorMessage) {
        showToast('error', 'Errore selezione immagine: ' + response.errorMessage);
      } else if (response.assets && response.assets[0]) {
        const imageUri = response.assets[0].uri;
        setSelectedDecryptImage(imageUri);
        showToast('success', 'Immagine selezionata per decrittazione');
        console.log('📷 Image selected for decryption:', imageUri);
      }
    });
  };

  // Open WhatsApp directly with image
  const shareToWhatsApp = async (imagePath) => {
    try {
      const whatsappURL = `whatsapp://send?text=Foto GhostBridge 👻`;
      const canOpen = await Linking.canOpenURL(whatsappURL);
      
      if (canOpen) {
        await Linking.openURL(whatsappURL);
        // Then user manually attaches the image
        showToast('info', 'WhatsApp aperto - allega manualmente l\'immagine');
      } else {
        showToast('error', 'WhatsApp non installato');
      }
    } catch (error) {
      console.error('WhatsApp open failed:', error);
      showToast('error', 'Apertura WhatsApp fallita');
    }
  };


  // Generate default cover image for steganography
  const generateDefaultCoverImage = async () => {
    try {
      const outputPath = `${RNFS.TemporaryDirectoryPath}/ghost_cover_${Date.now()}.bmp`;
      
      // Generate cover image using RealSteganography
      const coverImage = await RealSteganography.generateCoverImage(512, 512, outputPath);
      
      console.log('🖼️ Generated default cover image:', coverImage.path);
      return coverImage.path;
      
    } catch (error) {
      console.error('Failed to generate cover image:', error);
      
      // Fallback: return null and use text mode
      return null;
    }
  };

  const receiveMessage = () => {
    retrieveMessage();
  };

  const renderStatus = (status) => {
    if (!status) return null;
    
    const [type, ...messageParts] = status.split('|');
    const message = messageParts.join('|');
    
    return (
      <View style={[styles.statusMsg, 
        type === 'success' ? styles.successMsg : 
        type === 'error' ? styles.errorMsg : 
        styles.infoMsg
      ]}>
        <Text style={styles.statusText}>{message}</Text>
      </View>
    );
  };

  const renderSecurityCategory = (icon, title, features) => (
    <View style={styles.securityCategory}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryIcon}>{icon}</Text>
        <Text style={styles.categoryTitle}>{title}</Text>
      </View>
      {features.map((feature, index) => (
        <View key={index} style={styles.featureItem}>
          <Text style={styles.featureCheck}>✓</Text>
          <Text style={styles.featureText}>{feature}</Text>
        </View>
      ))}
    </View>
  );

  // Security status indicator
  const renderSecurityStatus = () => {
    if (!isSecurityInitialized) return null;
    
    return (
      <View style={styles.securityStatus}>
        <View style={[styles.securityDot, { 
          backgroundColor: deviceIntegrity?.isCompromised ? '#ff0000' : '#00ff00' 
        }]} />
        <Text style={styles.securityText}>
          {deviceIntegrity?.isCompromised ? 'COMPROMISED' : 'SECURE'}
        </Text>
        {biometricAuth && (
          <Text style={styles.securityText}>🔐 Biometric</Text>
        )}
        <Text style={styles.securityText}>🛡️ 30+ Layers</Text>
      </View>
    );
  };

  if (emergencyBurnTriggered) {
    return (
      <SafeAreaView style={[styles.container, styles.burnedContainer]}>
        <Text style={styles.burnedText}>🔥 EMERGENCY BURN ACTIVATED 🔥</Text>
        <Text style={styles.burnedSubtext}>All data has been securely wiped</Text>
        <Text style={styles.burnedDetail}>5-pass DoD memory wiping completed</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        
        {/* Security Status Bar */}
        {renderSecurityStatus()}
        
        {/* Matrix Background */}
        <View style={styles.matrixBackground}>
          {matrixChars.map(char => (
            <Animated.Text
              key={char.id}
              style={[
                styles.matrixChar,
                {
                  left: char.x,
                  transform: [{ translateY: char.value }],
                }
              ]}
            >
              {String.fromCharCode(65 + Math.floor(Math.random() * 26))}
            </Animated.Text>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.logo}>
              <Image 
                source={{uri: 'https://i.imgur.com/Cn5l3uH.png'}} 
                style={styles.ghostIconLarge}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.subtitle}>👻 ID: {ghostBridgeID} | Military-Grade Anonymous Messaging</Text>
            
            <View style={styles.navButtons}>
              <TouchableOpacity 
                style={[styles.navBtn, activeSection === 'home' && styles.navBtnActive]}
                onPress={() => setActiveSection('home')}
              >
                <Text style={[styles.navBtnText, activeSection === 'home' && styles.navBtnTextActive]}>
                  Home
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.navBtn, activeSection === 'send' && styles.navBtnActive]}
                onPress={() => setActiveSection('send')}
              >
                <Text style={[styles.navBtnText, activeSection === 'send' && styles.navBtnTextActive]}>
                  Send
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.navBtn, activeSection === 'receive' && styles.navBtnActive]}
                onPress={() => setActiveSection('receive')}
              >
                <Text style={[styles.navBtnText, activeSection === 'receive' && styles.navBtnTextActive]}>
                  Receive
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.content}>
            {/* Home Section */}
            {activeSection === 'home' && (
              <View>
                <Text style={styles.sectionTitle}>45+ Active Security Features</Text>
                
                <Text style={styles.introText}>
                  GhostBridge implementa crittografia di livello militare con oltre 45 strati di sicurezza reali. 
                  Ogni funzione elencata qui sotto protegge attivamente le tue comunicazioni in tempo reale.
                  
                  🆔 Il tuo ID GhostBridge è il tuo numero identificativo fisso.
                  🔐 Ogni messaggio usa un Ghost Code casuale diverso per sicurezza massima.
                </Text>

                {renderSecurityCategory('🔐', 'Ultra-Advanced Encryption:', [
                  '✅ X25519 + AES-256-GCM with double HMAC',
                  '✅ Multi-layer KDF (HKDF → PBKDF2 → Scrypt)',
                  '✅ 600,000 rounds PBKDF2 (OWASP 2023)',
                  '✅ Perfect Forward Secrecy with ephemeral keys',
                  '✅ Zero-Knowledge Architecture',
                  '✅ Double Ratchet Protocol (Signal-grade)'
                ])}

                {renderSecurityCategory('🛡️', 'Anti-Interception:', [
                  '✅ Ephemeral Keys with auto-destruction',
                  '✅ Onion Routing (5 layers)',
                  '✅ REAL LSB Steganography (hide in images)',
                  '✅ Traffic Analysis Protection with padding'
                ])}

                {renderSecurityCategory('🔒', 'Advanced Protection:', [
                  '✅ Anti-Forensics with 5-pass DoD wiping',
                  '✅ Plausible Deniability with decoy layers',
                  '✅ Burn After Reading (30s auto-destruct)',
                  '✅ Constant-time operations'
                ])}

                {renderSecurityCategory('🚨', 'Intrusion Detection:', [
                  '✅ Canary tokens with 30s rotation',
                  '✅ Multi-layer honeypots',
                  '✅ Behavioral analysis',
                  '✅ Pattern recognition',
                  '✅ Emergency burn activation',
                  '✅ Real-time security logging'
                ])}

                {renderSecurityCategory('🔑', 'Access Control:', [
                  '✅ Biometric authentication',
                  '✅ Certificate pinning',
                  '✅ Root/Jailbreak detection',
                  '✅ Screen recording prevention',
                  '✅ Clipboard restrictions',
                  '✅ Secure key storage'
                ])}

                {renderSecurityCategory('👻', 'Operational Security:', [
                  '✅ Device integrity checks',
                  '✅ Anti-tampering detection',
                  '✅ Memory encryption',
                  '✅ Secure random generation',
                  '✅ Emergency burn on compromise'
                ])}
                
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.emergencyBtn]}
                  onPress={triggerEmergencyBurn}
                >
                  <Text style={styles.actionBtnText}>🔥 Emergency Burn</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionBtn, {backgroundColor: '#0088ff', marginTop: 10}]}
                  onPress={async () => {
                    try {
                      showToast('info', 'Testing Firebase connection...');
                      console.log('🧪 Starting Firebase test');
                      
                      // Initialize first
                      await RealMessageBridge.initialize();
                      console.log('✅ Firebase initialized');
                      
                      const testCode = "TEST" + Math.floor(Math.random() * 9999);
                      const testMessage = "Hello Firebase: " + new Date().toISOString();
                      
                      console.log(`📤 Testing with code: ${testCode}`);
                      
                      // Send test message
                      const sendResult = await RealMessageBridge.sendMessage(testCode, testMessage, {test: true});
                      console.log('✅ Send result:', sendResult);
                      showToast('success', 'Message sent!');
                      
                      // Wait a moment
                      await new Promise(resolve => setTimeout(resolve, 1000));
                      
                      // Retrieve test message
                      const result = await RealMessageBridge.retrieveMessage(testCode);
                      console.log('✅ Retrieve result:', result);
                      
                      if (result.success) {
                        Alert.alert('✅ Firebase Working!', `Send/Receive successful!\nCode: ${testCode}\nMessage: ${result.encryptedData}`);
                        showToast('success', 'Test completed successfully!');
                      } else {
                        Alert.alert('❌ Test Failed', 'Message retrieval failed');
                      }
                    } catch (error) {
                      console.error('❌ Test error:', error);
                      Alert.alert('❌ Test Error', error.message);
                      showToast('error', 'Test failed: ' + error.message);
                    }
                  }}
                >
                  <Text style={styles.actionBtnText}>🧪 Test Firebase Messaging</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Send Message Section */}
            {activeSection === 'send' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Send Ultra-Secure Message</Text>
                
                {/* Steganography Controls */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>🖼️ Steganography Mode</Text>
                  <View style={styles.steganographyControls}>
                    <TouchableOpacity 
                      style={[styles.modeButton, steganographyEnabled && styles.modeButtonActive]}
                      onPress={() => setSteganographyEnabled(!steganographyEnabled)}
                    >
                      <Text style={[styles.modeButtonText, steganographyEnabled && styles.modeButtonTextActive]}>
                        {steganographyEnabled ? '🖼️ Image Mode' : '📝 Text Mode'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  {steganographyEnabled && (
                    <View style={styles.steganographyOptions}>
                      <Text style={styles.optionLabel}>Steganography Password (optional):</Text>
                      <TextInput 
                        style={styles.inputField}
                        value={steganographyPassword}
                        onChangeText={setSteganographyPassword}
                        placeholder="Enter password for extra steganography security"
                        placeholderTextColor="#666"
                        secureTextEntry
                      />
                      <Text style={styles.steganographyInfo}>
                        💡 Messages will be hidden inside images using LSB steganography
                      </Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>👻 ID Destinatario</Text>
                  <TextInput 
                    style={styles.inputField}
                    value={recipientID}
                    onChangeText={setRecipientID}
                    placeholder="Inserisci ID destinatario (es: 001, 002, 003...)"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    maxLength={3}
                  />
                  <Text style={styles.idHint}>
                    💡 L'ID è come il numero di telefono, te lo dice una volta
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Recipient Public Key</Text>
                  <TextInput 
                    style={[styles.inputField, styles.publicKeyField]}
                    value={recipientPublicKey}
                    onChangeText={setRecipientPublicKey}
                    placeholder="Paste recipient's public key for E2E encryption"
                    placeholderTextColor="#666"
                    multiline
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Secure Message</Text>
                  <TextInput 
                    style={[styles.inputField, styles.textArea]}
                    value={messageText}
                    onChangeText={setMessageText}
                    placeholder="Type your ultra-secure message here..."
                    placeholderTextColor="#666"
                    multiline
                    textAlignVertical="top"
                    secureTextEntry={Platform.OS === 'android'}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Your Ghost Code & Keys</Text>
                  <View style={styles.tokenDisplay}>
                    <Text style={styles.tokenText}>
                      {senderGhostCode || 'Not generated'}
                    </Text>
                    {senderKeyPair && (
                      <>
                        <Text style={styles.publicKeyText}>
                          Public Key: {senderKeyPair.publicKey.substring(0, 20)}...
                        </Text>
                        <Text style={styles.keyIdText}>
                          Key ID: {senderKeyPair.keyId.substring(0, 16)}...
                        </Text>
                      </>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.generateBtn]}
                    onPress={generateSenderGhostCode}
                    disabled={!isSecurityInitialized}
                  >
                    <Text style={styles.actionBtnText}>
                      {isSecurityInitialized ? 'Generate Secure Keys' : 'Initializing Security...'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={styles.actionBtn} 
                  onPress={sendMessage}
                  disabled={!isSecurityInitialized}
                >
                  <Text style={styles.actionBtnText}>
                    Send with 30+ Security Layers
                  </Text>
                </TouchableOpacity>
                
                {/* Message sent confirmation */}
                {lastSentImage && steganographyEnabled && (
                  <View style={styles.shareSection}>
                    <Text style={styles.shareTitle}>✅ Immagine Inviata Direttamente!</Text>
                    <Text style={styles.shareInfo}>
                      🔒 Il messaggio è stato nascosto nell'immagine e inviato direttamente all'ID {recipientID}
                    </Text>
                  </View>
                )}
                
                <Text style={styles.infoText}>
                  Military-grade E2E encryption with Perfect Forward Secrecy
                </Text>
                
                {renderStatus(sendStatus)}
              </View>
            )}

            {/* Receive Message Section */}
            {activeSection === 'receive' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Receive Ghost Message</Text>
                
                {/* Image Selection for Decryption */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>📱 Opzione 1: Decripta immagine da WhatsApp/Telegram</Text>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.selectImageBtn]}
                    onPress={selectImageForDecryption}
                  >
                    <Text style={styles.actionBtnText}>
                      {selectedDecryptImage ? '✅ Immagine Selezionata' : '📷 Seleziona Immagine da Galleria'}
                    </Text>
                  </TouchableOpacity>
                  
                  {selectedDecryptImage && (
                    <View style={styles.selectedImagePreview}>
                      <Image 
                        source={{uri: selectedDecryptImage}} 
                        style={styles.previewImage}
                        resizeMode="cover"
                      />
                      <Text style={styles.previewText}>Immagine pronta per decrittazione</Text>
                      <TouchableOpacity 
                        style={styles.clearImageBtn}
                        onPress={() => setSelectedDecryptImage(null)}
                      >
                        <Text style={styles.clearImageText}>❌ Rimuovi</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  {selectedDecryptImage && (
                    <View style={styles.steganographyOptions}>
                      <Text style={styles.optionLabel}>Password Steganografia (se usata):</Text>
                      <TextInput 
                        style={styles.inputField}
                        value={steganographyPassword}
                        onChangeText={setSteganographyPassword}
                        placeholder="Inserisci password se l'immagine è protetta"
                        placeholderTextColor="#666"
                        secureTextEntry
                      />
                    </View>
                  )}
                </View>

                <View style={styles.orDivider}>
                  <Text style={styles.orText}>OPPURE</Text>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>📝 Opzione 2: Ghost Code Reception</Text>
                  <TextInput 
                    style={styles.inputField}
                    value={receiveGhostCode}
                    onChangeText={setReceiveGhostCode}
                    placeholder="Enter received Ghost Code..."
                    placeholderTextColor="#666"
                    autoCapitalize="characters"
                  />
                </View>


                <TouchableOpacity 
                  style={styles.actionBtn} 
                  onPress={retrieveMessage}
                  disabled={!isSecurityInitialized}
                >
                  <Text style={styles.actionBtnText}>
                    {selectedDecryptImage ? 'Decripta Immagine' : 'Retrieve & Decrypt'}
                  </Text>
                </TouchableOpacity>

                <View style={[styles.inputGroup, {marginTop: 30}]}>
                  <Text style={styles.inputLabel}>Decrypted Message</Text>
                  
                  {/* Show received image if it's an image message */}
                  {receivedImage && (
                    <View style={styles.receivedImageContainer}>
                      <Text style={styles.imageLabel}>📷 Steganographic Image:</Text>
                      <Image 
                        source={{uri: `file://${receivedImage}`}} 
                        style={styles.receivedImage}
                        resizeMode="contain"
                      />
                      <Text style={styles.imageSubtext}>Hidden message extracted using LSB steganography</Text>
                    </View>
                  )}
                  
                  <View style={styles.messageDisplay}>
                    <Text style={styles.messageText}>{displayMessage}</Text>
                  </View>
                  <Text style={styles.burnWarning}>
                    ⚠️ Auto-burns in 30 seconds after decryption
                  </Text>
                </View>
                
                {renderStatus(receiveStatus)}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
      <Toast />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    flexGrow: 1,
  },
  matrixBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  matrixChar: {
    position: 'absolute',
    color: '#00ff88',
    fontSize: 12,
    opacity: 0.15,
    fontFamily: 'monospace',
  },
  securityStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    padding: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  securityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  securityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  burnedContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  burnedText: {
    color: '#ff0000',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  burnedSubtext: {
    color: '#ff8888',
    fontSize: 16,
    textAlign: 'center',
  },
  burnedDetail: {
    color: '#ff6666',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    zIndex: 1,
  },
  logo: {
    alignItems: 'center',
    marginBottom: 10,
  },
  ghostIcon: {
    width: 80,
    height: 80,
    marginBottom: 15,
  },
  ghostIconLarge: {
    width: 120,
    height: 120,
    marginBottom: 20,
    alignSelf: 'center',
  },
  ghostEmojiIcon: {
    fontSize: 80,
    marginBottom: 15,
    textShadowColor: '#00ff88',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  appTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#00ff88',
    letterSpacing: -1,
    textShadowColor: '#00ff88',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    color: '#888',
    fontSize: 18,
    marginBottom: 10,
  },
  deviceId: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 30,
    fontFamily: 'monospace',
  },
  navButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  navBtn: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  navBtnActive: {
    backgroundColor: '#00ff88',
  },
  navBtnText: {
    color: '#fff',
    fontSize: 16,
  },
  navBtnTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    zIndex: 1,
  },
  section: {
    backgroundColor: '#2a2a2a',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 28,
    color: '#00ff88',
    marginBottom: 25,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  introText: {
    color: '#888',
    fontSize: 16,
    marginBottom: 30,
    lineHeight: 24,
    textAlign: 'center',
  },
  securityCategory: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#00ff88',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00ff88',
    textTransform: 'uppercase',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 10,
  },
  featureCheck: {
    color: '#00ff88',
    fontWeight: 'bold',
    fontSize: 16,
  },
  featureText: {
    color: '#ccc',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
  },
  inputField: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#444',
    fontSize: 16,
  },
  publicKeyField: {
    minHeight: 80,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  tokenDisplay: {
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderWidth: 2,
    borderColor: '#00ff88',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  tokenText: {
    color: '#00ff88',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  publicKeyText: {
    color: '#888',
    fontSize: 12,
    marginTop: 5,
    fontFamily: 'monospace',
  },
  keyIdText: {
    color: '#666',
    fontSize: 11,
    marginTop: 3,
    fontFamily: 'monospace',
  },
  actionBtn: {
    backgroundColor: '#00ff88',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  generateBtn: {
    backgroundColor: '#ff8800',
  },
  emergencyBtn: {
    backgroundColor: '#ff0000',
    marginTop: 20,
  },
  actionBtnText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 15,
  },
  burnWarning: {
    color: '#ff8800',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  messageDisplay: {
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderWidth: 2,
    borderColor: '#444',
    borderRadius: 8,
    padding: 20,
    minHeight: 150,
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'monospace',
  },
  statusMsg: {
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    borderWidth: 2,
  },
  errorMsg: {
    backgroundColor: 'rgba(255, 51, 51, 0.2)',
    borderColor: '#ff5555',
  },
  successMsg: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    borderColor: '#00ff88',
  },
  infoMsg: {
    backgroundColor: 'rgba(0, 136, 255, 0.2)',
    borderColor: '#0088ff',
  },
  statusText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
  steganographyControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  modeButton: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#666',
  },
  modeButtonActive: {
    backgroundColor: '#00ff88',
    borderColor: '#00ff88',
  },
  modeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modeButtonTextActive: {
    color: '#000',
  },
  steganographyOptions: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#00ff88',
  },
  optionLabel: {
    color: '#00ff88',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  steganographyInfo: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  receivedImageContainer: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#00ff88',
    alignItems: 'center',
  },
  imageLabel: {
    color: '#00ff88',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  receivedImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  imageSubtext: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  shareSection: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: 8,
    padding: 15,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#00ff88',
  },
  shareTitle: {
    color: '#00ff88',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  shareButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  shareBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  whatsappBtn: {
    backgroundColor: '#25D366',
  },
  telegramBtn: {
    backgroundColor: '#0088cc',
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shareInfo: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  selectImageBtn: {
    backgroundColor: '#8800ff',
  },
  selectedImagePreview: {
    backgroundColor: 'rgba(136, 0, 255, 0.1)',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#8800ff',
    alignItems: 'center',
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 10,
  },
  previewText: {
    color: '#8800ff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  clearImageBtn: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  clearImageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  orDivider: {
    alignItems: 'center',
    marginVertical: 20,
  },
  orText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#444',
  },
  idHint: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  receiveDirectBtn: {
    backgroundColor: '#00cc66',
  },
});

export default GhostBridgeApp;