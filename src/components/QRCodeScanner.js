// QRCodeScanner.js
// Componente per scansione QR Code con decodifica Ghost Code

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
} from 'react-native';
import QRCodeScanner from 'react-native-qrcode-scanner';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import GhostCrypto from '../crypto/GhostCrypto';

const { width, height } = Dimensions.get('window');

export default function GhostQRScanner({ onScanResult, onClose }) {
  const [isScanning, setIsScanning] = useState(false);
  const [flashlight, setFlashlight] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Permesso Camera',
            message: 'GhostBridge ha bisogno dell\'accesso alla camera per scansionare QR Code',
            buttonNeutral: 'Chiedi dopo',
            buttonNegative: 'Nega',
            buttonPositive: 'OK',
          }
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setHasPermission(true);
          setIsScanning(true);
        } else {
          Alert.alert('Permesso negato', 'Impossibile accedere alla camera');
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      // iOS - le permissions sono gestite automaticamente da react-native-camera
      setHasPermission(true);
      setIsScanning(true);
    }
  };

  const onSuccess = async (e) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setIsScanning(false);
    
    try {
      const scannedData = e.data;
      console.log('QR Code scanned:', scannedData);
      
      // Verifica se è un Ghost Code
      if (scannedData.startsWith('GHOST:')) {
        await processGhostCode(scannedData);
      } else if (scannedData.startsWith('GHOST_P2P:')) {
        await processP2PCode(scannedData);
      } else if (scannedData.startsWith('GHOST_CONTACT:')) {
        await processContactCode(scannedData);
      } else {
        // QR Code generico
        if (onScanResult) {
          onScanResult({
            type: 'generic',
            data: scannedData,
          });
        }
        
        Toast.show({
          type: 'info',
          text1: 'QR Code Scansionato',
          text2: 'Contenuto copiato negli appunti',
        });
      }
      
    } catch (error) {
      console.error('Error processing QR code:', error);
      Toast.show({
        type: 'error',
        text1: 'Errore Scansione',
        text2: 'QR Code non valido o danneggiato',
      });
    }
    
    setIsProcessing(false);
    setTimeout(() => setIsScanning(true), 2000); // Riprendi scansione dopo 2s
  };

  const processGhostCode = async (ghostCode) => {
    try {
      // Parse Ghost Code: GHOST:type:password:salt:nonce:ciphertext
      const parts = ghostCode.split(':');
      
      if (parts.length < 6) {
        throw new Error('Ghost Code formato non valido');
      }
      
      const [prefix, messageType, password, salt, nonce, ciphertext] = parts;
      
      // Decifra il messaggio
      const ghostCrypto = new GhostCrypto();
      const encryptedData = {
        salt,
        nonce,
        ciphertext,
      };
      
      const decrypted = await ghostCrypto.decryptMessage(encryptedData, password);
      
      let result = {
        type: 'ghost_code',
        messageType,
        content: decrypted,
        timestamp: Date.now(),
      };
      
      // Se è un messaggio vocale, parse il JSON
      if (messageType === 'voice') {
        try {
          result.voiceData = JSON.parse(decrypted);
        } catch (e) {
          console.warn('Voice data parsing error:', e);
        }
      }
      
      if (onScanResult) {
        onScanResult(result);
      }
      
      Toast.show({
        type: 'success',
        text1: 'Ghost Code Decodificato!',
        text2: `Messaggio ${messageType} ricevuto`,
      });
      
    } catch (error) {
      console.error('Ghost Code processing error:', error);
      Toast.show({
        type: 'error',
        text1: 'Errore Decodifica',
        text2: 'Ghost Code non valido o password errata',
      });
    }
  };

  const processP2PCode = async (p2pCode) => {
    try {
      // Parse P2P Code: GHOST_P2P:peerId:displayName
      const parts = p2pCode.split(':');
      
      if (parts.length < 3) {
        throw new Error('P2P Code formato non valido');
      }
      
      const [prefix, peerId, displayName] = parts;
      
      if (onScanResult) {
        onScanResult({
          type: 'p2p_invite',
          peerId,
          displayName: decodeURIComponent(displayName || 'Unknown'),
        });
      }
      
      Toast.show({
        type: 'success',
        text1: 'Invito P2P Trovato',
        text2: `Peer: ${displayName}`,
      });
      
    } catch (error) {
      console.error('P2P Code processing error:', error);
      Toast.show({
        type: 'error',
        text1: 'Errore P2P',
        text2: 'Codice P2P non valido',
      });
    }
  };

  const processContactCode = async (contactCode) => {
    try {
      // Parse Contact Code: GHOST_CONTACT:publicKey:name:info
      const parts = contactCode.split(':');
      
      if (parts.length < 3) {
        throw new Error('Contact Code formato non valido');
      }
      
      const [prefix, publicKey, name, info] = parts;
      
      if (onScanResult) {
        onScanResult({
          type: 'contact',
          publicKey,
          name: decodeURIComponent(name || 'Unknown'),
          info: decodeURIComponent(info || ''),
        });
      }
      
      Toast.show({
        type: 'success',
        text1: 'Contatto Trovato',
        text2: `${decodeURIComponent(name)}`,
      });
      
    } catch (error) {
      console.error('Contact Code processing error:', error);
      Toast.show({
        type: 'error',
        text1: 'Errore Contatto',
        text2: 'Codice contatto non valido',
      });
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Icon name="camera-alt" size={80} color="#666" />
        <Text style={styles.permissionText}>
          Permesso camera richiesto per scansionare QR Code
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestCameraPermission}
        >
          <Text style={styles.permissionButtonText}>Concedi Permesso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isScanning && (
        <QRCodeScanner
          onRead={onSuccess}
          flashMode={
            flashlight 
              ? 'torch' 
              : 'off'
          }
          showMarker={true}
          checkAndroid6Permissions={true}
          cameraStyle={styles.camera}
          customMarker={
            <View style={styles.markerContainer}>
              <View style={styles.marker}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              <Text style={styles.markerText}>
                Inquadra un QR Code GhostBridge
              </Text>
            </View>
          }
          bottomContent={
            <View style={styles.bottomContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setFlashlight(!flashlight)}
              >
                <Icon 
                  name={flashlight ? 'flash-on' : 'flash-off'} 
                  size={30} 
                  color="#FFFFFF" 
                />
                <Text style={styles.buttonText}>Flash</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={onClose}
              >
                <Icon name="close" size={30} color="#FFFFFF" />
                <Text style={styles.buttonText}>Chiudi</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
      
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#4FC3F7" />
          <Text style={styles.processingText}>Decodifica in corso...</Text>
        </View>
      )}
      
      {!isScanning && !isProcessing && (
        <View style={styles.pausedContainer}>
          <Icon name="pause-circle-filled" size={80} color="#4FC3F7" />
          <Text style={styles.pausedText}>Scansione in pausa</Text>
          <TouchableOpacity
            style={styles.resumeButton}
            onPress={() => setIsScanning(true)}
          >
            <Text style={styles.resumeButtonText}>Riprendi</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    height: height,
    width: width,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
    padding: 20,
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
  },
  permissionButton: {
    backgroundColor: '#4FC3F7',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  markerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  marker: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#4FC3F7',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  markerText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  bottomContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  actionButton: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 5,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 20,
  },
  pausedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
  },
  pausedText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginVertical: 20,
  },
  resumeButton: {
    backgroundColor: '#4FC3F7',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  resumeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});